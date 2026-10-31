"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role, InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import {
  recordPaymentSchema,
  type RecordPaymentInput,
} from "@/lib/validations/payment";
import { parseInrToPaise, formatPaiseToInr } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

interface LockedInvoiceRow {
  id: string;
  status: InvoiceStatus;
  totalAmount: number;
  amountPaid: number;
  invoiceNumber: string;
}

/**
 * Core transactional payment execution logic with row-level locking (FOR UPDATE)
 * Guarantees atomicity and protects against race conditions/overpayments.
 */
export async function executePaymentRecord(
  tx: Prisma.TransactionClient,
  params: {
    invoiceId: string;
    amountInPaise: number;
    method: PaymentMethod;
    paymentDate?: Date;
    transactionRef?: string | null;
    notes?: string | null;
  }
) {
  const { invoiceId, amountInPaise, method, paymentDate, transactionRef, notes } = params;

  if (amountInPaise <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // Row-level lock on the invoice row to prevent concurrent overpayments
  const rows = await tx.$queryRaw<LockedInvoiceRow[]>`
    SELECT id, status, "totalAmount", "amountPaid", "invoiceNumber"
    FROM "Invoice"
    WHERE id = ${invoiceId}
    FOR UPDATE
  `;

  const lockedInvoice = rows[0];
  if (!lockedInvoice) {
    throw new Error("Invoice not found.");
  }

  // State checks: Only CONFIRMED invoices can receive payments
  if (lockedInvoice.status === InvoiceStatus.DRAFT) {
    throw new Error("Only CONFIRMED invoices can receive payments. Please confirm the draft invoice first.");
  }
  if (lockedInvoice.status === InvoiceStatus.CANCELLED) {
    throw new Error("Cannot record payment on a CANCELLED invoice.");
  }
  if (lockedInvoice.status === InvoiceStatus.PAID) {
    throw new Error("This invoice is already fully PAID.");
  }
  if (lockedInvoice.status !== InvoiceStatus.CONFIRMED) {
    throw new Error(`Only CONFIRMED invoices can receive payments. Current status: ${lockedInvoice.status}.`);
  }

  // Outstanding check
  const outstanding = lockedInvoice.totalAmount - lockedInvoice.amountPaid;
  if (outstanding <= 0) {
    throw new Error("Invoice has no outstanding balance.");
  }

  if (amountInPaise > outstanding) {
    throw new Error(
      `Payment amount of ${formatPaiseToInr(amountInPaise)} exceeds the outstanding balance of ${formatPaiseToInr(outstanding)}. Overpayment is not allowed.`
    );
  }

  // 1. Create Payment record
  const payment = await tx.payment.create({
    data: {
      invoiceId,
      amount: amountInPaise,
      method,
      transactionRef: transactionRef?.trim() || null,
      paymentDate: paymentDate || new Date(),
      notes: notes?.trim() || null,
    },
  });

  // 2. Compute new amount paid and status
  const newAmountPaid = lockedInvoice.amountPaid + amountInPaise;
  const isFullyPaid = newAmountPaid >= lockedInvoice.totalAmount;
  const newStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.CONFIRMED;

  // 3. Update Invoice
  const updatedInvoice = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
    },
  });

  return {
    payment,
    invoice: updatedInvoice,
    isFullyPaid,
    outstandingRemaining: updatedInvoice.totalAmount - updatedInvoice.amountPaid,
  };
}

/**
 * Server Action: Record a payment for an invoice (ADMIN or STAFF)
 */
export async function recordPaymentAction(
  rawInput: RecordPaymentInput
): Promise<
  ActionResponse<{
    paymentId: string;
    invoiceId: string;
    amountPaidInInr: number;
    isFullyPaid: boolean;
    remainingOutstandingInInr: number;
  }>
> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = recordPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { invoiceId, method, amountInInr, paymentDate, transactionRef, notes } =
    parsed.data;

  const amountInPaise = parseInrToPaise(amountInInr);
  if (amountInPaise <= 0) {
    return {
      success: false,
      error: "Payment amount must be greater than ₹0.00",
      fieldErrors: { amountInInr: ["Amount must be greater than 0"] },
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        return await executePaymentRecord(tx, {
          invoiceId,
          amountInPaise,
          method,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          transactionRef,
          notes,
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);

    return {
      success: true,
      data: {
        paymentId: result.payment.id,
        invoiceId: result.invoice.id,
        amountPaidInInr: result.payment.amount / 100,
        isFullyPaid: result.isFullyPaid,
        remainingOutstandingInInr: result.outstandingRemaining / 100,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to record payment.",
    };
  }
}
