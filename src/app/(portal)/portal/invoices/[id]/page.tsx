import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import {
  ChevronLeft,
  Calendar,
  Receipt,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CustomerInvoiceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Security: Query ONLY by id AND logged-in customer's ID (CONFIRMED or PAID only)
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      customerId: user.id, // IDOR Prevention: must match authenticated customer
      status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] },
    },
    include: {
      subscription: {
        include: { plan: true },
      },
      lines: true,
      payments: true,
    },
  });

  if (!invoice) {
    notFound(); // 404 if not found or belongs to another customer
  }

  const now = new Date();
  const isOverdue =
    invoice.dueDate < now && invoice.status !== InvoiceStatus.PAID;
  const outstandingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/portal/invoices"
              className="flex items-center gap-1 text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Invoices
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-bold text-slate-900">
            {invoice.invoiceNumber}
          </span>
        </div>

        {/* Print / Download Button */}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/portal/invoices/${invoice.id}/print`} target="_blank">
            <Printer className="h-4 w-4 mr-1.5" />
            Print / Download Receipt
          </Link>
        </Button>
      </div>

      {/* Invoice Banner Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Invoice {invoice.invoiceNumber}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  invoice.status === InvoiceStatus.PAID
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {invoice.status}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  OVERDUE
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Billing Period: {formatUtcDate(invoice.periodStart)} —{" "}
              {formatUtcDate(invoice.periodEnd)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">Total Statement Amount</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatPaiseToInr(invoice.totalAmount)}
          </p>
          <p
            className={`text-xs font-semibold mt-0.5 ${
              outstandingPaise > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {outstandingPaise === 0
              ? "Paid in Full"
              : `Outstanding: ${formatPaiseToInr(outstandingPaise)}`}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Associated Subscription
          </p>
          {invoice.subscription ? (
            <div>
              <Link
                href={`/portal/subscriptions/${invoice.subscription.id}`}
                className="font-mono text-sm font-semibold text-blue-600 hover:underline"
              >
                {invoice.subscription.subscriptionNumber}
              </Link>
              <p className="text-xs text-slate-600 mt-1">
                Plan: {invoice.subscription.plan.name} (
                {invoice.subscription.plan.billingFrequency})
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Direct Invoice</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Payment & Due Date (UTC)
          </p>
          <div className="text-xs space-y-1 text-slate-600">
            <p>
              Issue Date: <strong>{formatUtcDate(invoice.issuedDate)}</strong>
            </p>
            <p>
              Due Date:{" "}
              <strong className={isOverdue ? "text-red-600" : "text-slate-900"}>
                {formatUtcDate(invoice.dueDate)}
              </strong>
            </p>
            <p>
              Paid to date: <strong>{formatPaiseToInr(invoice.amountPaid)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Itemized Charges</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Qty
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Tax
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Discount
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {l.description}
                  </td>
                  <td className="px-6 py-4 text-center">{l.quantity}</td>
                  <td className="px-6 py-4 text-right">
                    {formatPaiseToInr(l.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs">
                    {formatPaiseToInr(l.taxAmount)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-emerald-600">
                    {l.discountAmount > 0
                      ? `-${formatPaiseToInr(l.discountAmount)}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatPaiseToInr(l.lineAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 bg-slate-50/50 p-6 text-sm">
          <div className="flex w-64 justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{formatPaiseToInr(invoice.subtotal)}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex w-64 justify-between text-emerald-700">
              <span>Discounts:</span>
              <span>-{formatPaiseToInr(invoice.discountAmount)}</span>
            </div>
          )}
          <div className="flex w-64 justify-between text-slate-600">
            <span>Taxes:</span>
            <span>{formatPaiseToInr(invoice.taxAmount)}</span>
          </div>
          <div className="flex w-64 justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total Statement:</span>
            <span className="text-blue-600">
              {formatPaiseToInr(invoice.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
