import { prisma } from "@/lib/prisma";
import { SubscriptionStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { calculateNextBillingDate, addDaysUtc } from "@/lib/dates";
import { applyDiscounts, calculateTax } from "@/lib/pricing";

export interface InvoiceGenerationResult {
  status: "created" | "already_billed" | "skipped" | "failed";
  reason?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  periodStart?: Date;
  periodEnd?: Date;
  totalAmount?: number;
}

export interface BillingJobSummary {
  runDate: string;
  totalSubscriptionsEvaluated: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  invoicesCreated: {
    invoiceNumber: string;
    subscriptionNumber: string;
    totalAmount: number;
  }[];
  skipped: {
    subscriptionNumber: string;
    reason: string;
  }[];
  failed: {
    subscriptionNumber: string;
    error: string;
  }[];
}

/**
 * Generate unique INV-YYYY-XXXX invoice number
 */
async function generateUniqueInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;

  const existingInvoices = await tx.invoice.findMany({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    select: {
      invoiceNumber: true,
    },
  });

  let maxSeq = 0;
  for (const inv of existingInvoices) {
    const parts = inv.invoiceNumber.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

/**
 * Parse payment terms into a due date relative to the periodStart
 */
export function calculateDueDate(periodStart: Date, paymentTerms?: string | null): Date {
  const terms = (paymentTerms || "Immediate").toLowerCase().trim();

  if (terms.includes("15")) {
    return addDaysUtc(periodStart, 15);
  }
  if (terms.includes("30")) {
    return addDaysUtc(periodStart, 30);
  }
  if (terms.includes("60")) {
    return addDaysUtc(periodStart, 60);
  }

  // Immediate or unspecified
  return new Date(periodStart.getTime());
}

/**
 * Generates an invoice for a single billing period of an active subscription.
 * Executed inside ONE atomic database transaction.
 * IDEMPOTENT: If an invoice for (subscriptionId, periodStart) already exists, returns "already_billed".
 */
export async function generateInvoiceForSubscription(
  subscriptionId: string,
  today: Date = new Date()
): Promise<InvoiceGenerationResult> {
  const todayTime = today.getTime();

  // First fetch the subscription to check basic prerequisites before transaction
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      plan: true,
      discountRule: true,
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!subscription) {
    return {
      status: "failed",
      reason: `Subscription ID ${subscriptionId} not found.`,
    };
  }

  // 1. Skip non-active subscriptions
  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    return {
      status: "skipped",
      reason: `Subscription is in ${subscription.status} status, not ACTIVE.`,
    };
  }

  // 2. Determine period start
  const periodStart = subscription.nextBillingDate || subscription.startDate;

  // 3. Stop billing past the expiry date
  if (subscription.expiryDate && periodStart.getTime() > subscription.expiryDate.getTime()) {
    return {
      status: "skipped",
      reason: "Subscription has reached or exceeded its expiry date.",
    };
  }

  // 4. Do not bill future periods before their due date
  if (periodStart.getTime() > todayTime) {
    return {
      status: "skipped",
      reason: "Billing period is in the future.",
    };
  }

  // Calculate periodEnd from plan billing frequency
  const periodEnd = calculateNextBillingDate(periodStart, subscription.plan.billingFrequency);
  const dueDate = calculateDueDate(periodStart, subscription.paymentTerms);

  // Check if invoice already exists for (subscriptionId, periodStart) before entering tx
  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      subscriptionId_periodStart: {
        subscriptionId: subscription.id,
        periodStart,
      },
    },
  });

  if (existingInvoice) {
    return {
      status: "already_billed",
      reason: `Invoice for period ${periodStart.toISOString()} already exists (${existingInvoice.invoiceNumber}).`,
      invoiceId: existingInvoice.id,
      invoiceNumber: existingInvoice.invoiceNumber,
    };
  }

  // ATOMIC DATABASE TRANSACTION
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Re-verify inside tx to avoid race conditions
      const raceCheck = await tx.invoice.findUnique({
        where: {
          subscriptionId_periodStart: {
            subscriptionId: subscription.id,
            periodStart,
          },
        },
      });

      if (raceCheck) {
        return {
          status: "already_billed",
          reason: `Invoice already billed: ${raceCheck.invoiceNumber}`,
          invoiceId: raceCheck.id,
          invoiceNumber: raceCheck.invoiceNumber,
        };
      }

      // 1. Prepare invoice lines
      const pricingLines = subscription.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineAmount: l.lineAmount,
      }));

      const subtotal = pricingLines.reduce((sum, l) => sum + l.lineAmount, 0);

      // 2. Apply eligible discounts
      const eligibleDiscounts = [];
      if (subscription.discountRule) {
        // Fetch fresh discount state within tx
        const freshDiscount = await tx.discountRule.findUnique({
          where: { id: subscription.discountRule.id },
        });
        if (freshDiscount) {
          eligibleDiscounts.push(freshDiscount);
        }
      }

      const discountResult = applyDiscounts(pricingLines, eligibleDiscounts, periodStart);
      const discountTotal = discountResult.discountTotal;

      // 3. Increment discount usage count in the same transaction
      for (const used of discountResult.discountsUsed) {
        await tx.discountRule.update({
          where: { id: used.discountId },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }

      // 4. Calculate Tax
      const defaultTaxRule = await tx.taxRule.findFirst({
        where: { isDefault: true, isActive: true },
      });
      const amountAfterDiscount = Math.max(0, subtotal - discountTotal);
      const taxAmount = calculateTax(amountAfterDiscount, defaultTaxRule);
      const totalAmount = amountAfterDiscount + taxAmount;

      // 5. Generate unique invoice number
      const invoiceNumber = await generateUniqueInvoiceNumber(tx);

      // 6. Create Invoice with nested InvoiceLine items
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          status: InvoiceStatus.DRAFT,
          periodStart,
          periodEnd,
          subtotal,
          discountAmount: discountTotal,
          taxAmount,
          totalAmount,
          amountPaid: 0,
          issuedDate: new Date(),
          dueDate,
          notes: `Recurring billing for ${subscription.subscriptionNumber} (${subscription.plan.name})`,
          lines: {
            create: subscription.lines.map((l) => {
              const lineDiscount =
                discountTotal > 0 && subtotal > 0
                  ? Math.round((l.lineAmount / subtotal) * discountTotal)
                  : 0;
              const lineTax = calculateTax(
                Math.max(0, l.lineAmount - lineDiscount),
                defaultTaxRule
              );

              const variantLabel = l.variant ? ` (${l.variant.name})` : "";
              const description = `${l.product.name}${variantLabel}`;

              return {
                productId: l.productId,
                variantId: l.variantId,
                description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                taxAmount: lineTax,
                discountAmount: lineDiscount,
                lineAmount: l.lineAmount,
              };
            }),
          },
        },
      });

      // 7. Advance subscription nextBillingDate to the next cycle in the same transaction
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          nextBillingDate: periodEnd,
        },
      });

      return {
        status: "created",
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        periodStart,
        periodEnd,
        totalAmount,
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
    );
  } catch (error: any) {
    // Unique constraint violation on [subscriptionId, periodStart]
    if (
      error.code === "P2002" ||
      error.message?.includes("P2002") ||
      error.message?.includes("Unique constraint") ||
      error.message?.includes("subscriptionId_periodStart")
    ) {
      return {
        status: "already_billed",
        reason: "Invoice for this period already exists (unique constraint satisfied).",
      };
    }
    return {
      status: "failed",
      reason: error.message || "Database transaction error during billing.",
    };
  }
}

/**
 * Runs the automated billing job across all active subscriptions due on or before `today`.
 * Handles missed periods iteratively without skipping any past due periods.
 * Processes in batches of 50; errors on one subscription do not stop others.
 */
export async function runBillingJob(today: Date = new Date()): Promise<BillingJobSummary> {
  const summary: BillingJobSummary = {
    runDate: today.toISOString(),
    totalSubscriptionsEvaluated: 0,
    createdCount: 0,
    skippedCount: 0,
    failedCount: 0,
    invoicesCreated: [],
    skipped: [],
    failed: [],
  };

  // Find all ACTIVE subscriptions with nextBillingDate <= today
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      OR: [
        { nextBillingDate: { lte: today } },
        { nextBillingDate: null, startDate: { lte: today } },
      ],
    },
    select: {
      id: true,
      subscriptionNumber: true,
      nextBillingDate: true,
      startDate: true,
      expiryDate: true,
    },
    orderBy: { nextBillingDate: "asc" },
  });

  summary.totalSubscriptionsEvaluated = activeSubscriptions.length;

  const BATCH_SIZE = 50;
  for (let i = 0; i < activeSubscriptions.length; i += BATCH_SIZE) {
    const batch = activeSubscriptions.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      try {
        // Handle potential missed periods: a subscription behind by several cycles
        // will loop until its nextBillingDate is beyond today or reaches expiry.
        // Safety cap of max 24 cycles to prevent infinite loops in edge cases.
        let cyclesProcessed = 0;
        let keepBilling = true;

        while (keepBilling && cyclesProcessed < 24) {
          cyclesProcessed++;
          const result = await generateInvoiceForSubscription(sub.id, today);

          if (result.status === "created") {
            summary.createdCount++;
            summary.invoicesCreated.push({
              invoiceNumber: result.invoiceNumber!,
              subscriptionNumber: sub.subscriptionNumber,
              totalAmount: result.totalAmount!,
            });
            // Fetch latest nextBillingDate to check if another missed period remains
            const freshSub = await prisma.subscription.findUnique({
              where: { id: sub.id },
              select: { nextBillingDate: true, expiryDate: true },
            });
            if (
              freshSub?.nextBillingDate &&
              freshSub.nextBillingDate.getTime() <= today.getTime() &&
              (!freshSub.expiryDate || freshSub.nextBillingDate.getTime() <= freshSub.expiryDate.getTime())
            ) {
              keepBilling = true;
            } else {
              keepBilling = false;
            }
          } else if (result.status === "already_billed") {
            summary.skippedCount++;
            summary.skipped.push({
              subscriptionNumber: sub.subscriptionNumber,
              reason: result.reason || "Already billed",
            });
            keepBilling = false;
          } else if (result.status === "skipped") {
            summary.skippedCount++;
            summary.skipped.push({
              subscriptionNumber: sub.subscriptionNumber,
              reason: result.reason || "Skipped",
            });
            keepBilling = false;
          } else {
            // failed
            summary.failedCount++;
            summary.failed.push({
              subscriptionNumber: sub.subscriptionNumber,
              error: result.reason || "Invoice generation failed",
            });
            keepBilling = false;
          }
        }
      } catch (err: any) {
        summary.failedCount++;
        summary.failed.push({
          subscriptionNumber: sub.subscriptionNumber,
          error: err.message || "Unexpected exception during subscription billing",
        });
      }
    }
  }

  return summary;
}
