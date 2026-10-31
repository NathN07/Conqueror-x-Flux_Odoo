"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role, InvoiceStatus } from "@prisma/client";
import {
  confirmInvoiceSchema,
  cancelInvoiceSchema,
  sendInvoiceSchema,
  type ConfirmInvoiceInput,
  type CancelInvoiceInput,
  type SendInvoiceInput,
} from "@/lib/validations/invoice";
import { runBillingJob, type BillingJobSummary } from "@/lib/billing";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { sendInvoiceEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Trigger the batch recurring billing run (ADMIN or STAFF)
 */
export async function triggerRunBillingJobAction(): Promise<
  ActionResponse<BillingJobSummary>
> {
  await requireRole(Role.ADMIN, Role.STAFF);

  try {
    const summary = await runBillingJob(new Date());
    revalidatePath("/invoices");
    return {
      success: true,
      data: summary,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to execute recurring billing run.",
    };
  }
}

/**
 * Confirm Invoice: Moves DRAFT -> CONFIRMED (ADMIN or STAFF)
 */
export async function confirmInvoiceAction(
  rawInput: ConfirmInvoiceInput
): Promise<ActionResponse<{ id: string; status: InvoiceStatus }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = confirmInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invoice reference.",
    };
  }

  const { invoiceId } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found." };
  }

  if (invoice.status !== InvoiceStatus.DRAFT) {
    return {
      success: false,
      error: `Only DRAFT invoices can be confirmed. Current status is ${invoice.status}.`,
    };
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: InvoiceStatus.CONFIRMED },
  });

  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");

  return {
    success: true,
    data: { id: updated.id, status: updated.status },
  };
}

/**
 * Cancel Invoice: Moves DRAFT or CONFIRMED -> CANCELLED (ADMIN or STAFF)
 * Blocked if any payments are recorded against the invoice.
 */
export async function cancelInvoiceAction(
  rawInput: CancelInvoiceInput
): Promise<ActionResponse<{ id: string; status: InvoiceStatus }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = cancelInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invoice reference.",
    };
  }

  const { invoiceId, reason } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found." };
  }

  // Check state eligibility
  if (
    invoice.status !== InvoiceStatus.DRAFT &&
    invoice.status !== InvoiceStatus.CONFIRMED
  ) {
    return {
      success: false,
      error: `Cannot cancel invoice in ${invoice.status} status.`,
    };
  }

  // Check payment rule: Cannot cancel if payments exist
  if (invoice.amountPaid > 0 || invoice.payments.length > 0) {
    return {
      success: false,
      error: "Cannot cancel an invoice with recorded payments. Please refund or reverse payments first.",
    };
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.CANCELLED,
      notes: reason
        ? `${invoice.notes ? invoice.notes + " | " : ""}Cancelled: ${reason}`
        : invoice.notes,
    },
  });

  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");

  return {
    success: true,
    data: { id: updated.id, status: updated.status },
  };
}

/**
 * Send Invoice: Dispatches email to customer or logs in terminal (ADMIN or STAFF)
 */
export async function sendInvoiceAction(
  rawInput: SendInvoiceInput
): Promise<ActionResponse<{ message: string }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = sendInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invoice reference.",
    };
  }

  const { invoiceId } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found." };
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invoiceUrl = `${baseUrl}/invoices/${invoice.id}`;

  await sendInvoiceEmail({
    toEmail: invoice.customer.email,
    customerName: invoice.customer.name,
    invoiceNumber: invoice.invoiceNumber,
    totalFormatted: formatPaiseToInr(invoice.totalAmount),
    dueDateFormatted: formatUtcDate(invoice.dueDate),
    invoiceUrl,
  });

  return {
    success: true,
    data: {
      message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.email}.`,
    },
  };
}
