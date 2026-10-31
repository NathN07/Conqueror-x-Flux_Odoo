import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import Link from "next/link";
import { Receipt, Eye, Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CustomerInvoicesListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Security: Query ONLY by logged-in customer's ID and only CONFIRMED or PAID invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: user.id,
      status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] },
    },
    include: {
      subscription: true,
    },
    orderBy: { issuedDate: "desc" },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Invoices & Receipts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review your issued billing statements, track payment statuses, and print or download receipts.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              No issued invoices found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Invoices will appear here once confirmed by the billing team.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Invoice #
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
                {invoices.map((inv) => {
                  const isOverdue =
                    inv.dueDate < now && inv.status !== InvoiceStatus.PAID;
                  const outstanding = Math.max(
                    0,
                    inv.totalAmount - inv.amountPaid
                  );

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
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
                      <td className="px-6 py-4 text-xs">
                        <span>{formatUtcDate(inv.periodStart)}</span>
                        <span className="text-slate-400"> → </span>
                        <span>{formatUtcDate(inv.periodEnd)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {formatUtcDate(inv.dueDate)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatPaiseToInr(inv.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            outstanding > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {outstanding === 0
                            ? "Paid"
                            : formatPaiseToInr(outstanding)}
                        </span>
                        {inv.amountPaid > 0 && inv.status !== InvoiceStatus.PAID && (
                          <span className="block text-[10px] text-slate-400">
                            Paid: {formatPaiseToInr(inv.amountPaid)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              inv.status === InvoiceStatus.PAID
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 text-blue-600 hover:text-blue-700"
                          >
                            <Link href={`/portal/invoices/${inv.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 text-slate-600"
                          >
                            <Link
                              href={`/portal/invoices/${inv.id}/print`}
                              target="_blank"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" />
                              Print
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
