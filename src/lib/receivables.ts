import { InvoiceStatus } from "@prisma/client";

export interface InvoiceReceivableInput {
  totalAmount: number; // in paise
  amountPaid: number; // in paise
  status: InvoiceStatus;
  dueDate?: Date | string;
}

/**
 * Calculates the remaining outstanding balance in paise for a single invoice.
 * Returns 0 if invoice is PAID or CANCELLED.
 * For other statuses, returns totalAmount - amountPaid (clamped to >= 0).
 */
export function getInvoiceOutstanding(
  invoice: Pick<InvoiceReceivableInput, "totalAmount" | "amountPaid" | "status">
): number {
  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
    return 0;
  }

  const remaining = invoice.totalAmount - invoice.amountPaid;
  return Math.max(0, remaining);
}

/**
 * Checks whether an invoice is overdue dynamically:
 * Computed as: dueDate < today (UTC) and status NOT IN ('PAID', 'CANCELLED').
 */
export function isInvoiceOverdue(
  invoice: Pick<InvoiceReceivableInput, "status" | "dueDate">,
  today: Date = new Date()
): boolean {
  if (!invoice.dueDate) return false;
  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
    return false;
  }

  const dueDateUtc = new Date(invoice.dueDate).getTime();
  const todayUtc = new Date(today).getTime();

  return dueDateUtc < todayUtc;
}

/**
 * Calculates the sum of outstanding balances (in paise) across an array of invoices.
 */
export function calculateTotalOutstanding(
  invoices: Array<Pick<InvoiceReceivableInput, "totalAmount" | "amountPaid" | "status">>
): number {
  return invoices.reduce((sum, inv) => sum + getInvoiceOutstanding(inv), 0);
}

/**
 * Calculates the sum of overdue balances (in paise) across an array of invoices.
 */
export function calculateTotalOverdue(
  invoices: Array<Pick<InvoiceReceivableInput, "totalAmount" | "amountPaid" | "status" | "dueDate">>,
  today: Date = new Date()
): number {
  return invoices.reduce((sum, inv) => {
    if (isInvoiceOverdue(inv, today)) {
      return sum + getInvoiceOutstanding(inv);
    }
    return sum;
  }, 0);
}

/**
 * Generates an accounts receivable summary object for dashboards and finance analytics.
 */
export function getReceivablesMetrics(
  invoices: Array<Pick<InvoiceReceivableInput, "totalAmount" | "amountPaid" | "status" | "dueDate">>,
  today: Date = new Date()
) {
  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let overdueInvoiceCount = 0;
  let unpaidInvoiceCount = 0;

  for (const inv of invoices) {
    if (inv.status === InvoiceStatus.CANCELLED) continue;

    totalBilled += inv.totalAmount;
    totalCollected += inv.amountPaid;

    const outstanding = getInvoiceOutstanding(inv);
    if (outstanding > 0) {
      totalOutstanding += outstanding;
      unpaidInvoiceCount++;

      if (isInvoiceOverdue(inv, today)) {
        totalOverdue += outstanding;
        overdueInvoiceCount++;
      }
    }
  }

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalOverdue,
    overdueInvoiceCount,
    unpaidInvoiceCount,
  };
}
