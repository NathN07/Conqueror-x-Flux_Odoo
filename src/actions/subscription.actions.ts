"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role, SubscriptionStatus } from "@prisma/client";
import {
  createSubscriptionFromScratchSchema,
  createSubscriptionFromTemplateSchema,
  updateSubscriptionStatusSchema,
  type CreateSubscriptionFromScratchInput,
  type CreateSubscriptionFromTemplateInput,
  type UpdateSubscriptionStatusInput,
} from "@/lib/validations/subscription";
import { canTransition } from "@/lib/subscription-status";
import { addDaysUtc, calculateNextBillingDate } from "@/lib/dates";
import { closeExpiredSubscriptions } from "@/lib/subscription-jobs";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Generate unique SUB-YYYY-XXXX subscription number safely with retry against collisions
 */
async function generateUniqueSubscriptionNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `SUB-${year}-`;

  const existingSubs = await prisma.subscription.findMany({
    where: {
      subscriptionNumber: {
        startsWith: prefix,
      },
    },
    select: {
      subscriptionNumber: true,
    },
  });

  let maxSeq = 0;
  for (const s of existingSubs) {
    const parts = s.subscriptionNumber.split("-");
    const num = parseInt(parts[2], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

/**
 * Create a new subscription from scratch (ADMIN or STAFF)
 */
export async function createSubscriptionFromScratchAction(
  rawInput: CreateSubscriptionFromScratchInput
): Promise<ActionResponse<{ id: string; subscriptionNumber: string }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = createSubscriptionFromScratchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please review the form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { customerId, planId, startDate, expiryDate, paymentTerms, notes, lines } =
    parsed.data;

  // Validate customer exists
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  // Validate plan exists
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    return { success: false, error: "Plan not found." };
  }

  // Enforce plan.minQuantity
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (totalQuantity < plan.minQuantity) {
    return {
      success: false,
      error: `Minimum quantity required for plan "${plan.name}" is ${plan.minQuantity}, but selected total is ${totalQuantity}.`,
    };
  }

  // Fetch default tax rule for line tax calculation
  const defaultTaxRule = await prisma.taxRule.findFirst({
    where: { isDefault: true, isActive: true },
  });
  const taxRate = defaultTaxRule ? defaultTaxRule.percentageRate : 0;

  // Build subscription lines with calculated unitPrice in paise
  const parsedStartDate = new Date(startDate);
  const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;

  const subscriptionLinesToCreate = [];

  for (const line of lines) {
    const product = await prisma.product.findUnique({
      where: { id: line.productId },
      include: { variants: true },
    });
    if (!product) {
      return { success: false, error: `Product ID ${line.productId} not found.` };
    }

    let unitPrice = product.salesPrice;
    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (variant) {
        unitPrice += variant.priceSurcharge;
      }
    }

    const lineAmount = unitPrice * line.quantity;

    subscriptionLinesToCreate.push({
      productId: product.id,
      variantId: line.variantId || null,
      quantity: line.quantity,
      unitPrice,
      taxRate,
      lineAmount,
    });
  }

  // Attempt insertion with unique subscription number (retry on collision)
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const subNumber = await generateUniqueSubscriptionNumber();

    try {
      const newSub = await prisma.subscription.create({
        data: {
          subscriptionNumber: subNumber,
          customerId: customer.id,
          planId: plan.id,
          status: SubscriptionStatus.DRAFT,
          startDate: parsedStartDate,
          expiryDate: parsedExpiryDate,
          paymentTerms: paymentTerms || "Immediate",
          notes: notes || null,
          lines: {
            create: subscriptionLinesToCreate,
          },
        },
      });

      revalidatePath("/subscriptions");
      return {
        success: true,
        data: {
          id: newSub.id,
          subscriptionNumber: newSub.subscriptionNumber,
        },
      };
    } catch (err: any) {
      // P2002 is Prisma unique constraint violation code
      if (err.code === "P2002" && attempts < 5) {
        continue;
      }
      return {
        success: false,
        error: "Failed to create subscription: " + (err.message || "Unknown error"),
      };
    }
  }

  return { success: false, error: "Unable to generate unique subscription number." };
}

/**
 * Create a new subscription from a quotation template (ADMIN or STAFF)
 */
export async function createSubscriptionFromTemplateAction(
  rawInput: CreateSubscriptionFromTemplateInput
): Promise<ActionResponse<{ id: string; subscriptionNumber: string }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = createSubscriptionFromTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please review the form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { templateId, customerId, startDate, paymentTerms, notes } = parsed.data;

  const template = await prisma.quotationTemplate.findUnique({
    where: { id: templateId },
    include: {
      plan: true,
      lines: {
        include: {
          product: {
            include: { variants: true },
          },
          variant: true,
        },
      },
    },
  });

  if (!template) {
    return { success: false, error: "Quotation template not found." };
  }

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  // Enforce plan.minQuantity
  const totalQuantity = template.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (totalQuantity < template.plan.minQuantity) {
    return {
      success: false,
      error: `Template quantity (${totalQuantity}) is below the required plan minimum (${template.plan.minQuantity}).`,
    };
  }

  // Expiry date calculated from template validityDays in UTC
  const parsedStartDate = new Date(startDate);
  const expiryDate = addDaysUtc(parsedStartDate, template.validityDays);

  // Fetch default tax rule
  const defaultTaxRule = await prisma.taxRule.findFirst({
    where: { isDefault: true, isActive: true },
  });
  const taxRate = defaultTaxRule ? defaultTaxRule.percentageRate : 0;

  const subscriptionLinesToCreate = template.lines.map((tLine) => {
    const surcharge = tLine.variant?.priceSurcharge ?? 0;
    const unitPrice = tLine.product.salesPrice + surcharge;
    const lineAmount = unitPrice * tLine.quantity;

    return {
      productId: tLine.productId,
      variantId: tLine.variantId,
      quantity: tLine.quantity,
      unitPrice,
      taxRate,
      lineAmount,
    };
  });

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const subNumber = await generateUniqueSubscriptionNumber();

    try {
      const newSub = await prisma.subscription.create({
        data: {
          subscriptionNumber: subNumber,
          customerId: customer.id,
          planId: template.plan.id,
          status: SubscriptionStatus.QUOTATION, // Pre-configured quotes start as QUOTATION
          startDate: parsedStartDate,
          expiryDate,
          paymentTerms: paymentTerms || template.terms || "Immediate",
          notes: notes || `Created from template: ${template.name}`,
          lines: {
            create: subscriptionLinesToCreate,
          },
        },
      });

      revalidatePath("/subscriptions");
      return {
        success: true,
        data: {
          id: newSub.id,
          subscriptionNumber: newSub.subscriptionNumber,
        },
      };
    } catch (err: any) {
      if (err.code === "P2002" && attempts < 5) {
        continue;
      }
      return {
        success: false,
        error: "Failed to create subscription: " + (err.message || "Unknown error"),
      };
    }
  }

  return { success: false, error: "Unable to generate unique subscription number." };
}

/**
 * Transition subscription status with strict business rules check
 */
export async function updateSubscriptionStatusAction(
  rawInput: UpdateSubscriptionStatusInput
): Promise<ActionResponse<{ id: string; status: SubscriptionStatus }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = updateSubscriptionStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input parameters.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { subscriptionId, targetStatus, isRenewal } = parsed.data;

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) {
    return { success: false, error: "Subscription not found." };
  }

  // Validate state transition using pure canTransition function
  const transitionCheck = canTransition(
    subscription.status,
    targetStatus,
    {
      allowPause: subscription.plan.allowPause,
      allowEarlyClose: subscription.plan.allowEarlyClose,
      allowRenewal: subscription.plan.allowRenewal,
      autoCloseOnEnd: subscription.plan.autoCloseOnEnd,
    },
    isRenewal
  );

  if (!transitionCheck.allowed) {
    return {
      success: false,
      error: transitionCheck.error || "Transition not allowed.",
    };
  }

  const updateData: any = {
    status: targetStatus,
  };

  // Requirement: When a subscription becomes ACTIVE set nextBillingDate to startDate (or first period) using lib/dates.ts in UTC
  if (targetStatus === SubscriptionStatus.ACTIVE) {
    if (isRenewal) {
      // Renewal sets new cycle starting now
      const nowUtc = new Date();
      updateData.startDate = nowUtc;
      updateData.nextBillingDate = calculateNextBillingDate(
        nowUtc,
        subscription.plan.billingFrequency
      );
      // Extend expiry date accordingly
      updateData.expiryDate = calculateNextBillingDate(
        nowUtc,
        subscription.plan.billingFrequency
      );
    } else if (subscription.status !== SubscriptionStatus.PAUSED) {
      // Fresh activation: Set next billing date to startDate or first cycle
      updateData.nextBillingDate =
        subscription.nextBillingDate ?? subscription.startDate;
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });

  revalidatePath(`/subscriptions/${subscription.id}`);
  revalidatePath("/subscriptions");

  return {
    success: true,
    data: {
      id: updated.id,
      status: updated.status,
    },
  };
}

/**
 * Trigger job to close expired subscriptions (ADMIN only)
 */
export async function triggerCloseExpiredAction(): Promise<
  ActionResponse<{ closedCount: number; closedSubscriptionNumbers: string[] }>
> {
  await requireRole(Role.ADMIN);

  const result = await closeExpiredSubscriptions();
  revalidatePath("/subscriptions");

  return {
    success: true,
    data: result,
  };
}
