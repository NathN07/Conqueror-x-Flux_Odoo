"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { PaymentMethod, SubscriptionStatus } from "@prisma/client";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import {
  AlertTriangle,
  CreditCard,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OverdueInvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  dueDate: Date;
  daysOverdue: number;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
}

export interface RecentPaymentRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: Date;
  transactionRef?: string | null;
  notes?: string | null;
}

export interface SubscriptionStatusSummaryRow {
  status: SubscriptionStatus;
  count: number;
  percentage: number;
  monthlyValue: number; // in paise
}

interface DashboardTablesProps {
  overdueInvoices: OverdueInvoiceRow[];
  overdueTotalCount: number;
  overduePage: number;
  overduePageSize: number;

  recentPayments: RecentPaymentRow[];
  paymentsTotalCount: number;
  paymentsPage: number;
  paymentsPageSize: number;

  subscriptionStatusSummary: SubscriptionStatusSummaryRow[];
}

export function DashboardTables({
  overdueInvoices,
  overdueTotalCount,
  overduePage,
  overduePageSize,
  recentPayments,
  paymentsTotalCount,
  paymentsPage,
  paymentsPageSize,
  subscriptionStatusSummary,
}: DashboardTablesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (paramKey: string, newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, String(newPage));
    router.push(`?${params.toString()}`);
  };

  const overdueTotalPages = Math.ceil(overdueTotalCount / overduePageSize);
  const paymentsTotalPages = Math.ceil(paymentsTotalCount / paymentsPageSize);

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.UPI:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case PaymentMethod.CARD:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case PaymentMethod.NETBANKING:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case PaymentMethod.BANK_TRANSFER:
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case PaymentMethod.CASH:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case SubscriptionStatus.QUOTATION:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case SubscriptionStatus.CONFIRMED:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case SubscriptionStatus.PAUSED:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case SubscriptionStatus.CLOSED:
        return "bg-slate-100 text-slate-600 border-slate-200";
      case SubscriptionStatus.DRAFT:
        return "bg-slate-50 text-slate-500 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Table A: Overdue Invoices (Oldest First) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Overdue Accounts Receivable (Oldest First)
            </h3>
            <p className="text-xs text-slate-500">
              Confirmed invoices that have exceeded their UTC payment deadline.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            {overdueTotalCount} Overdue {overdueTotalCount === 1 ? "Invoice" : "Invoices"}
          </span>
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No overdue invoices found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Due Date (UTC)</th>
                  <th className="px-6 py-3">Aging Status</th>
                  <th className="px-6 py-3 text-right">Outstanding Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-semibold text-blue-600">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>

                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-900">{inv.customerName}</p>
                      <p className="text-xs text-slate-400">{inv.customerEmail}</p>
                    </td>

                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      {formatUtcDate(inv.dueDate)}
                    </td>

                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        {inv.daysOverdue} {inv.daysOverdue === 1 ? "day" : "days"} overdue
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right font-bold text-red-700">
                      {formatPaiseToInr(inv.outstanding)}
                    </td>

                    <td className="px-6 py-3.5 text-right space-x-2">
                      <RecordPaymentDialog
                        targetInvoice={{
                          id: inv.id,
                          invoiceNumber: inv.invoiceNumber,
                          outstanding: inv.outstanding,
                        }}
                        buttonLabel="Pay"
                        buttonVariant="outline"
                        buttonSize="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Overdue Pagination */}
        {overdueTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <span className="text-xs text-slate-500">
              Page {overduePage} of {overdueTotalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={overduePage <= 1}
                onClick={() => handlePageChange("overduePage", overduePage - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={overduePage >= overdueTotalPages}
                onClick={() => handlePageChange("overduePage", overduePage + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table B: Recent Payments */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Recent Payment Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Latest cash receipts recorded across online gateways and offline channels.
            </p>
          </div>
          <Link href="/payments" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
            <span>View All Payments</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No payments found matching active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Date (UTC)</th>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Reference / Notes</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      {formatUtcDate(p.paymentDate)}
                    </td>

                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-blue-600">
                      <Link href={`/invoices/${p.invoiceId}`} className="hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    </td>

                    <td className="px-6 py-3.5 text-xs font-medium text-slate-900">
                      {p.customerName}
                    </td>

                    <td className="px-6 py-3.5">
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${getMethodBadge(p.method)}`}>
                        {p.method}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                      {p.transactionRef || p.notes || "—"}
                    </td>

                    <td className="px-6 py-3.5 text-right font-bold text-emerald-700">
                      +{formatPaiseToInr(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Pagination */}
        {paymentsTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <span className="text-xs text-slate-500">
              Page {paymentsPage} of {paymentsTotalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={paymentsPage <= 1}
                onClick={() => handlePageChange("paymentsPage", paymentsPage - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={paymentsPage >= paymentsTotalPages}
                onClick={() => handlePageChange("paymentsPage", paymentsPage + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table C: Subscriptions Summary by Status */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            Subscriptions Portfolio Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Portfolio metrics grouped by subscription status, including contract share and monthly recurring run rate.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Subscription Status</th>
                <th className="px-6 py-3 text-center">Active Contracts</th>
                <th className="px-6 py-3 text-center">Portfolio Share</th>
                <th className="px-6 py-3 text-right">Normalized Monthly Run Rate (MRR)</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptionStatusSummary.map((item) => (
                <tr key={item.status} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className={`inline-block rounded border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="px-6 py-3.5 text-center font-semibold text-slate-900">
                    {item.count}
                  </td>

                  <td className="px-6 py-3.5 text-center text-xs text-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span>{item.percentage.toFixed(1)}%</span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                    {formatPaiseToInr(item.monthlyValue)}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <Link href={`/subscriptions?status=${item.status}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-7 text-xs">
                        View List
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
