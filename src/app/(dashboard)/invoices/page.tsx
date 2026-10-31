import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, InvoiceStatus } from "@prisma/client";
import Link from "next/link";
import { InvoicesToolbar } from "./invoices-toolbar";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { getInvoiceOutstanding, isInvoiceOverdue } from "@/lib/receivables";
import { Receipt, ChevronLeft, ChevronRight, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    overdue?: string;
    outstanding?: string;
    page?: string;
  };
}

export default async function InvoicesListPage({ searchParams }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const query = searchParams.q?.trim() || "";
  const statusFilter = searchParams.status?.toUpperCase();
  const isOverdueFilter = searchParams.overdue === "true";
  const isOutstandingFilter = searchParams.outstanding === "true";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;
  const now = new Date();

  // Construct where clause
  const where: any = {};

  if (isOverdueFilter) {
    // Dynamic Overdue: dueDate < now (UTC) and status not in (PAID, CANCELLED)
    where.dueDate = { lt: now };
    where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] };
  } else if (isOutstandingFilter) {
    // Outstanding: CONFIRMED invoices that are not yet fully paid
    where.status = InvoiceStatus.CONFIRMED;
  } else if (statusFilter && statusFilter !== "ALL") {
    if (Object.values(InvoiceStatus).includes(statusFilter as InvoiceStatus)) {
      where.status = statusFilter as InvoiceStatus;
    }
  }

  if (query) {
    where.OR = [
      {
        invoiceNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        customer: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const [totalCount, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        subscription: {
          select: { id: true, subscriptionNumber: true },
        },
      },
      orderBy: { issuedDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return "bg-slate-100 text-slate-700 border-slate-200";
      case InvoiceStatus.CONFIRMED:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case InvoiceStatus.PAID:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case InvoiceStatus.CANCELLED:
        return "bg-slate-100 text-slate-500 border-slate-200 line-through";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices & Accounts Receivable
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review billing cycles, track outstanding receivables, and trigger scheduled invoice generation.
          </p>
        </div>
      </div>

      {/* Toolbar & Search */}
      <InvoicesToolbar
        currentSearch={query}
        currentStatus={statusFilter || "ALL"}
        isOverdueFilter={isOverdueFilter}
        isOutstandingFilter={isOutstandingFilter}
      />

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Invoice #
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Billing Period
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Total
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Outstanding
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm font-medium">No invoices found</p>
                    <p className="text-xs">
                      {isOverdueFilter
                        ? "Great news! There are no overdue invoices at this time."
                        : isOutstandingFilter
                        ? "All confirmed invoices are fully paid!"
                        : "Click 'Run Billing' above to generate invoices for subscriptions due."}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const overdue = isInvoiceOverdue(inv, now);
                  const outstanding = getInvoiceOutstanding(inv);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        {inv.subscription && (
                          <span className="block text-[11px] text-slate-400">
                            {inv.subscription.subscriptionNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {inv.customer.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {inv.customer.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span>{formatUtcDate(inv.periodStart)}</span>
                        <span className="text-slate-400"> → </span>
                        <span>{formatUtcDate(inv.periodEnd)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {formatUtcDate(inv.dueDate)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {formatPaiseToInr(inv.totalAmount)}
                        </p>
                        {inv.amountPaid > 0 && inv.status !== InvoiceStatus.PAID && (
                          <p className="text-[11px] text-emerald-600">
                            Paid: {formatPaiseToInr(inv.amountPaid)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className={`font-semibold ${
                            outstanding > 0 ? "text-amber-700" : "text-slate-500"
                          }`}
                        >
                          {formatPaiseToInr(outstanding)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                              inv.status
                            )}`}
                          >
                            {inv.status}
                          </span>

                          {overdue && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Link href={`/invoices/${inv.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total invoices)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild={page > 1}
              >
                {page > 1 ? (
                  <Link
                    href={`/invoices?q=${encodeURIComponent(query)}&status=${statusFilter || ""}&overdue=${isOverdueFilter}&outstanding=${isOutstandingFilter}&page=${page - 1}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                asChild={page < totalPages}
              >
                {page < totalPages ? (
                  <Link
                    href={`/invoices?q=${encodeURIComponent(query)}&status=${statusFilter || ""}&overdue=${isOverdueFilter}&outstanding=${isOutstandingFilter}&page=${page + 1}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
