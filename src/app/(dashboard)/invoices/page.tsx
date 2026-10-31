import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, InvoiceStatus } from "@prisma/client";
import Link from "next/link";
import { InvoicesToolbar } from "./invoices-toolbar";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { Receipt, ChevronLeft, ChevronRight, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    overdue?: string;
    page?: string;
  };
}

export default async function InvoicesListPage({ searchParams }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const query = searchParams.q?.trim() || "";
  const statusFilter = searchParams.status?.toUpperCase();
  const isOverdueFilter = searchParams.overdue === "true";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;
  const now = new Date();

  // Construct where clause
  const where: any = {};

  if (isOverdueFilter) {
    // Dynamic Overdue: dueDate < now (UTC) and status not PAID or CANCELLED
    where.dueDate = { lt: now };
    where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] };
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Invoices & Billing Statements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generated statements, automated tax calculations, payment status, and accounts receivable tracking.
        </p>
      </div>

      {/* Toolbar */}
      <InvoicesToolbar
        currentSearch={query}
        currentStatus={statusFilter || "ALL"}
        isOverdueFilter={isOverdueFilter}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                  Total Amount
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
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm font-medium">No invoices found</p>
                    <p className="text-xs">
                      {isOverdueFilter
                        ? "Great news! There are no overdue invoices at this time."
                        : "Click 'Run Billing' above to generate invoices for subscriptions due."}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  // Dynamically computed overdue check: dueDate < today and not PAID or CANCELLED
                  const isOverdue =
                    inv.dueDate < now &&
                    inv.status !== InvoiceStatus.PAID &&
                    inv.status !== InvoiceStatus.CANCELLED;

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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                              inv.status
                            )}`}
                          >
                            {inv.status}
                          </span>

                          {isOverdue && (
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
                          className="h-8 text-blue-600 hover:text-blue-700"
                        >
                          <Link href={`/invoices/${inv.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-700">
              {Math.min(page * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium text-slate-700">{totalCount}</span> invoices
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link
                  href={`/invoices?page=${page - 1}&q=${encodeURIComponent(
                    query
                  )}&status=${statusFilter || "ALL"}&overdue=${isOverdueFilter}`}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </span>
              )}
            </Button>

            <span className="text-xs text-slate-600 px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link
                  href={`/invoices?page=${page + 1}&q=${encodeURIComponent(
                    query
                  )}&status=${statusFilter || "ALL"}&overdue=${isOverdueFilter}`}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <span className="flex items-center">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
