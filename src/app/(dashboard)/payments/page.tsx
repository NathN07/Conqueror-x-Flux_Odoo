import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, PaymentMethod, InvoiceStatus } from "@prisma/client";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { getInvoiceOutstanding } from "@/lib/receivables";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

export default async function PaymentsListPage({ searchParams }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const query = searchParams.q?.trim() || "";
  const methodFilter = searchParams.method?.toUpperCase();
  const startDate = searchParams.startDate;
  const endDate = searchParams.endDate;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  // Build where filter
  const where: any = {};

  if (
    methodFilter &&
    Object.values(PaymentMethod).includes(methodFilter as PaymentMethod)
  ) {
    where.method = methodFilter as PaymentMethod;
  }

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) {
      where.paymentDate.gte = new Date(startDate);
    }
    if (endDate) {
      // Set to end of day in UTC
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  if (query) {
    where.OR = [
      {
        invoice: {
          invoiceNumber: { contains: query, mode: "insensitive" },
        },
      },
      {
        invoice: {
          customer: {
            name: { contains: query, mode: "insensitive" },
          },
        },
      },
      {
        invoice: {
          customer: {
            email: { contains: query, mode: "insensitive" },
          },
        },
      },
      {
        transactionRef: { contains: query, mode: "insensitive" },
      },
      {
        notes: { contains: query, mode: "insensitive" },
      },
    ];
  }

  // Fetch count, payments, and payable invoices concurrently
  const [totalCount, payments, confirmedInvoices] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.findMany({
      where: { status: InvoiceStatus.CONFIRMED },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { issuedDate: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Eligible invoices for recording payments
  const payableInvoices = confirmedInvoices
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      totalAmount: inv.totalAmount,
      amountPaid: inv.amountPaid,
      outstanding: getInvoiceOutstanding(inv),
    }))
    .filter((inv) => inv.outstanding > 0);

  const getMethodBadgeColor = (method: PaymentMethod) => {
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
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payments & Collections
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              ADMIN & STAFF
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            View transaction logs, record offline or gateway payments, and audit customer receipts.
          </p>
        </div>

        {/* Record Payment Dialog */}
        <RecordPaymentDialog
          availableInvoices={payableInvoices}
          buttonLabel="Record Payment"
        />
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by invoice #, customer, reference, or note..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Payment Method Filter */}
            <select
              name="method"
              defaultValue={methodFilter || "ALL"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Net Banking</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="date"
                name="startDate"
                defaultValue={startDate || ""}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                title="From Date"
              />
              <span>to</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate || ""}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                title="To Date"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Filter
            </button>

            {(query || methodFilter || startDate || endDate) && (
              <Link
                href="/payments"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              No payments found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {query || methodFilter || startDate || endDate
                ? "Try adjusting your search criteria."
                : "No customer payment transactions have been logged yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5">Reference / Notes</th>
                  <th className="px-6 py-3.5">Payment Date (UTC)</th>
                  <th className="px-6 py-3.5 text-right">Amount Paid</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">
                      <Link
                        href={`/invoices/${p.invoice.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <Receipt className="h-4 w-4 text-slate-400" />
                        <span>{p.invoice.invoiceNumber}</span>
                      </Link>
                      <span className="block text-[11px] text-slate-400 font-sans mt-0.5">
                        Status: {p.invoice.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {p.invoice.customer.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.invoice.customer.email}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded border px-2.5 py-0.5 text-xs font-semibold ${getMethodBadgeColor(
                          p.method
                        )}`}
                      >
                        {p.method}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {p.transactionRef && (
                        <div className="font-mono text-slate-900 font-medium">
                          Ref: {p.transactionRef}
                        </div>
                      )}
                      {p.notes ? (
                        <div className="text-slate-500 italic truncate max-w-[200px]" title={p.notes}>
                          "{p.notes}"
                        </div>
                      ) : (
                        !p.transactionRef && <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {formatUtcDate(p.paymentDate)}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-emerald-700 text-base">
                      {formatPaiseToInr(p.amount)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link href={`/invoices/${p.invoice.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <span>Invoice</span>
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total payments)
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/payments?q=${encodeURIComponent(query)}&method=${methodFilter || ""}&startDate=${startDate || ""}&endDate=${endDate || ""}&page=${page - 1}`}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/payments?q=${encodeURIComponent(query)}&method=${methodFilter || ""}&startDate=${startDate || ""}&endDate=${endDate || ""}&page=${page + 1}`}
                aria-disabled={page >= totalPages}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
