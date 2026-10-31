import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, InvoiceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { PrintButton } from "./print-button";
import { Building2 } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PrintInvoicePage({ params }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      subscription: {
        include: { plan: true },
      },
      lines: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <span className="text-sm font-medium text-slate-600">
          Print Preview — {invoice.invoiceNumber}
        </span>
        <PrintButton />
      </div>

      {/* Invoice Document Paper */}
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-md print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Brightloop Software
              </h1>
              <p className="text-xs text-slate-500">
                Cloud Subscriptions & Enterprise Billing Platform
              </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900">INVOICE</h2>
            <p className="font-mono text-sm font-semibold text-blue-600 mt-1">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Status: <strong className="uppercase">{invoice.status}</strong>
            </p>
          </div>
        </div>

        {/* Invoice Info Grid */}
        <div className="grid grid-cols-2 gap-8 py-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Billed To:
            </p>
            <p className="font-bold text-slate-900 mt-1">{invoice.customer.name}</p>
            <p className="text-slate-600 font-mono text-xs">{invoice.customer.email}</p>
          </div>

          <div className="space-y-1 text-right text-xs">
            <p>
              <strong className="text-slate-500">Invoice Date:</strong>{" "}
              {formatUtcDate(invoice.issuedDate)}
            </p>
            <p>
              <strong className="text-slate-500">Payment Due:</strong>{" "}
              <span className="font-bold text-slate-900">
                {formatUtcDate(invoice.dueDate)}
              </span>
            </p>
            <p>
              <strong className="text-slate-500">Billing Period:</strong>{" "}
              {formatUtcDate(invoice.periodStart)} – {formatUtcDate(invoice.periodEnd)}
            </p>
            {invoice.subscription && (
              <p>
                <strong className="text-slate-500">Subscription #:</strong>{" "}
                <span className="font-mono text-blue-600">
                  {invoice.subscription.subscriptionNumber}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full text-left text-xs text-slate-700 mt-2">
          <thead className="border-y border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Tax</th>
              <th className="py-2.5 px-3 text-right">Discount</th>
              <th className="py-2.5 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-3 px-3 font-medium text-slate-900">
                  {line.description}
                </td>
                <td className="py-3 px-3 text-center">{line.quantity}</td>
                <td className="py-3 px-3 text-right">
                  {formatPaiseToInr(line.unitPrice)}
                </td>
                <td className="py-3 px-3 text-right">
                  {formatPaiseToInr(line.taxAmount)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-600">
                  {line.discountAmount > 0
                    ? `-${formatPaiseToInr(line.discountAmount)}`
                    : "—"}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-slate-900">
                  {formatPaiseToInr(line.lineAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 pt-4 text-xs">
          <div className="flex w-60 justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{formatPaiseToInr(invoice.subtotal)}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex w-60 justify-between text-emerald-700">
              <span>Discounts:</span>
              <span>-{formatPaiseToInr(invoice.discountAmount)}</span>
            </div>
          )}
          <div className="flex w-60 justify-between text-slate-600">
            <span>Taxes:</span>
            <span>{formatPaiseToInr(invoice.taxAmount)}</span>
          </div>
          <div className="flex w-60 justify-between border-t border-slate-300 pt-2 text-sm font-bold text-slate-900">
            <span>Total Due:</span>
            <span className="text-blue-600">
              {formatPaiseToInr(invoice.totalAmount)}
            </span>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
          <p>Thank you for doing business with Brightloop Software.</p>
          <p className="mt-0.5">
            Questions? Contact support@brightloop.com • All amounts in Indian Rupees (INR)
          </p>
        </div>
      </div>
    </div>
  );
}
