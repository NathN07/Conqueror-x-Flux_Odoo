import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { StatusTimeline } from "@/app/(dashboard)/subscriptions/[id]/status-timeline";
import { CustomerSubscriptionActions } from "./customer-subscription-actions";
import {
  ChevronLeft,
  Calendar,
  Layers,
  CreditCard,
  Building,
  Shield,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CustomerSubscriptionDetailPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Security: Query ONLY by id AND logged-in user's id
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: params.id,
      customerId: user.id, // IDOR Prevention: must match authenticated customer
    },
    include: {
      plan: true,
      lines: {
        include: { product: true, variant: true },
      },
    },
  });

  if (!subscription) {
    notFound(); // Returns 404 if subscription doesn't belong to this customer
  }

  const subtotalPaise = subscription.lines.reduce(
    (acc, l) => acc + l.lineAmount,
    0
  );
  const totalTaxPaise = subscription.lines.reduce(
    (acc, l) => acc + Math.round((l.lineAmount * l.taxRate) / 100),
    0
  );
  const totalContractPaise = subtotalPaise + totalTaxPaise;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/portal/subscriptions"
              className="flex items-center gap-1 text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Subscriptions
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-bold text-slate-900">
            {subscription.subscriptionNumber}
          </span>
        </div>

        {/* Customer State Control Actions */}
        <CustomerSubscriptionActions
          subscriptionId={subscription.id}
          status={subscription.status}
          planRules={{
            allowPause: subscription.plan.allowPause,
            allowEarlyClose: subscription.plan.allowEarlyClose,
            allowRenewal: subscription.plan.allowRenewal,
          }}
        />
      </div>

      {/* Status Timeline Progression */}
      <StatusTimeline currentStatus={subscription.status} />

      {/* Plan & Schedule Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Plan Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="h-4 w-4 text-blue-600" />
            Plan Specifications
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Plan Name</p>
              <p className="font-semibold text-slate-900">
                {subscription.plan.name}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Billing Frequency</p>
                <p className="font-medium text-slate-800">
                  {subscription.plan.billingFrequency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Terms</p>
                <p className="font-medium text-slate-800">
                  {subscription.paymentTerms || "Immediate"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Renewal */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Calendar className="h-4 w-4 text-purple-600" />
            Dates (UTC)
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Start Date:</span>
              <span className="font-medium text-slate-900">
                {formatUtcDate(subscription.startDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Next Renewal:</span>
              <span className="font-semibold text-blue-600">
                {subscription.nextBillingDate
                  ? formatUtcDate(subscription.nextBillingDate)
                  : "None scheduled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Contract Expiry:</span>
              <span className="font-medium text-slate-700">
                {subscription.expiryDate
                  ? formatUtcDate(subscription.expiryDate)
                  : "Ongoing (Auto-renewing)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Lines Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Contract Line Items</h2>
          <p className="text-xs text-slate-500">
            Included software licenses, add-on variants, and tier surcharges.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Product / Service
                </th>
                <th scope="col" className="px-6 py-3">
                  Variant
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Qty
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {l.product.name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {l.variant?.name || "Standard"}
                  </td>
                  <td className="px-6 py-4 text-center font-medium">
                    {l.quantity}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatPaiseToInr(l.unitPrice)}
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
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(subtotalPaise)}
            </span>
          </div>
          <div className="flex w-64 justify-between text-slate-600">
            <span>Estimated Taxes:</span>
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(totalTaxPaise)}
            </span>
          </div>
          <div className="flex w-64 justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Recurring Total:</span>
            <span className="text-blue-600">
              {formatPaiseToInr(totalContractPaise)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
