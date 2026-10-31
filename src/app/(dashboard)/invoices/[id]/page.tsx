import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, InvoiceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { InvoiceActions } from "./invoice-actions";
import {
  ChevronLeft,
  Calendar,
  Building,
  User,
  Layers,
  Receipt,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  const now = new Date();
  const isOverdue =
    invoice.dueDate < now &&
    invoice.status !== InvoiceStatus.PAID &&
    invoice.status !== InvoiceStatus.CANCELLED;

  const hasPayments = invoice.payments.length > 0 || invoice.amountPaid > 0;

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return "bg-slate-100 text-slate-700 border-slate-200";
      case InvoiceStatus.CONFIRMED:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case InvoiceStatus.PAID:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case InvoiceStatus.CANCELLED:
        return "bg-rose-50 text-rose-700 border-rose-200 line-through";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices" className="flex items-center gap-1 text-slate-600">
              <ChevronLeft className="h-4 w-4" />
              Invoices
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-bold text-slate-900">
            {invoice.invoiceNumber}
          </span>
        </div>

        {/* Action Controls */}
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          hasPayments={hasPayments}
        />
      </div>

      {/* Main Status & Metadata Bar */}
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
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                  invoice.status
                )}`}
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
          <p className="text-xs text-slate-500">Total Amount Due</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatPaiseToInr(invoice.totalAmount)}
          </p>
          {invoice.amountPaid > 0 && (
            <p className="text-xs font-medium text-emerald-600">
              Paid: {formatPaiseToInr(invoice.amountPaid)} (Remaining:{" "}
              {formatPaiseToInr(invoice.totalAmount - invoice.amountPaid)})
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Customer */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <User className="h-4 w-4 text-blue-600" />
            Billed To
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">{invoice.customer.name}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {invoice.customer.email}
            </p>
          </div>
        </div>

        {/* Subscription & Plan */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="h-4 w-4 text-emerald-600" />
            Originating Subscription
          </div>
          <div className="text-sm">
            {invoice.subscription ? (
              <>
                <Link
                  href={`/subscriptions/${invoice.subscription.id}`}
                  className="font-mono font-medium text-blue-600 hover:underline"
                >
                  {invoice.subscription.subscriptionNumber}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plan: {invoice.subscription.plan.name} (
                  {invoice.subscription.plan.billingFrequency})
                </p>
              </>
            ) : (
              <span className="text-slate-400">Direct Invoice</span>
            )}
          </div>
        </div>

        {/* Due Date & Issued Date */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Calendar className="h-4 w-4 text-purple-600" />
            Dates (UTC)
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Issued:</span>
              <span className="font-medium text-slate-700">
                {formatUtcDate(invoice.issuedDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Due Date:</span>
              <span
                className={`font-semibold ${
                  isOverdue ? "text-red-600 font-bold" : "text-slate-900"
                }`}
              >
                {formatUtcDate(invoice.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Lines Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Line Items & Calculations</h2>
          <p className="text-xs text-slate-500">
            All prices, taxes, and promotional discounts computed in exact paise.
          </p>
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
                  Taxes
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Discounts
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {line.description}
                  </td>
                  <td className="px-6 py-4 text-center font-medium">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatPaiseToInr(line.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-600">
                    {formatPaiseToInr(line.taxAmount)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-emerald-600">
                    {line.discountAmount > 0
                      ? `-${formatPaiseToInr(line.discountAmount)}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatPaiseToInr(line.lineAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 bg-slate-50/50 p-6 text-sm">
          <div className="flex w-72 justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(invoice.subtotal)}
            </span>
          </div>

          {invoice.discountAmount > 0 && (
            <div className="flex w-72 justify-between text-emerald-700">
              <span>Applied Discounts:</span>
              <span className="font-medium">
                -{formatPaiseToInr(invoice.discountAmount)}
              </span>
            </div>
          )}

          <div className="flex w-72 justify-between text-slate-600">
            <span>Calculated Taxes:</span>
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(invoice.taxAmount)}
            </span>
          </div>

          <div className="flex w-72 justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
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
