import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, SubscriptionStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllowedActions } from "@/lib/subscription-status";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { StatusTimeline } from "./status-timeline";
import { SubscriptionActions } from "./subscription-actions";
import {
  ChevronLeft,
  Calendar,
  CreditCard,
  Building,
  User,
  Package,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function SubscriptionDetailPage({ params }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const subscription = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      plan: true,
      discountRule: true,
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
      invoices: {
        orderBy: { issuedDate: "desc" },
      },
    },
  });

  if (!subscription) {
    notFound();
  }

  // Calculate permissible transitions using pure state machine
  const allowedActions = getAllowedActions(subscription.status, {
    allowPause: subscription.plan.allowPause,
    allowEarlyClose: subscription.plan.allowEarlyClose,
    allowRenewal: subscription.plan.allowRenewal,
    autoCloseOnEnd: subscription.plan.autoCloseOnEnd,
  });

  // Calculate totals
  const subtotalPaise = subscription.lines.reduce(
    (sum, l) => sum + l.lineAmount,
    0
  );

  // Compute tax total
  const taxTotalPaise = subscription.lines.reduce((sum, l) => {
    const lineTax = Math.round((l.lineAmount * l.taxRate) / 100);
    return sum + lineTax;
  }, 0);

  // Apply discount if attached
  let discountPaise = 0;
  if (subscription.discountRule) {
    if (subscription.discountRule.type === "PERCENTAGE") {
      discountPaise = Math.round(
        (subtotalPaise * subscription.discountRule.value) / 100
      );
    } else {
      discountPaise = subscription.discountRule.value;
    }
  }

  const grandTotalPaise = Math.max(
    0,
    subtotalPaise + taxTotalPaise - discountPaise
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/subscriptions" className="flex items-center gap-1 text-slate-600">
              <ChevronLeft className="h-4 w-4" />
              Subscriptions
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-bold text-slate-900">
            {subscription.subscriptionNumber}
          </span>
        </div>

        {/* Dynamic Action Buttons according to allowed state transitions */}
        <SubscriptionActions
          subscriptionId={subscription.id}
          allowedActions={allowedActions}
        />
      </div>

      {/* Status Progression Timeline */}
      <StatusTimeline currentStatus={subscription.status} />

      {/* Main Grid: Parameters & Customer */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <User className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Customer Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Account Name</p>
              <p className="font-medium text-slate-900">
                {subscription.customer.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email Address</p>
              <p className="font-mono text-xs text-slate-700">
                {subscription.customer.email}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Account Type</p>
              <span className="inline-block mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {subscription.customer.role}
              </span>
            </div>
          </div>
        </div>

        {/* Billing Plan & Rules Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Plan & Terms</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Assigned Plan</p>
              <p className="font-medium text-slate-900">
                {subscription.plan.name}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Billing Cycle</p>
                <p className="font-semibold text-slate-800">
                  {subscription.plan.billingFrequency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Terms</p>
                <p className="font-semibold text-slate-800">
                  {subscription.paymentTerms || "Immediate"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              {subscription.plan.allowPause && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                  Pausing Allowed
                </span>
              )}
              {subscription.plan.allowEarlyClose && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                  Early Close
                </span>
              )}
              {subscription.plan.allowRenewal && (
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  Renewable
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Schedule & Renewal Dates Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Calendar className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-slate-900">Schedule (UTC)</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Contract Start Date</p>
              <p className="font-medium text-slate-900">
                {formatUtcDate(subscription.startDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Next Scheduled Billing</p>
              <p className="font-semibold text-blue-600">
                {subscription.nextBillingDate
                  ? formatUtcDate(subscription.nextBillingDate)
                  : "Not Scheduled"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contract Expiry</p>
              <p className="font-medium text-slate-700">
                {subscription.expiryDate
                  ? formatUtcDate(subscription.expiryDate)
                  : "Open-ended (No expiry)"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Line Items Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Contract Line Items</h3>
          <p className="text-xs text-slate-500">
            Products, add-on variants, unit surcharges, and line totals.
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
                  Variant / Surcharge
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Qty
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Tax Rate
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      {line.product.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Base: {formatPaiseToInr(line.product.salesPrice)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {line.variant ? (
                      <div>
                        <span className="font-medium text-slate-800">
                          {line.variant.name}
                        </span>
                        {line.variant.priceSurcharge > 0 && (
                          <span className="block text-xs text-amber-600">
                            +{formatPaiseToInr(line.variant.priceSurcharge)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-900">
                    {line.quantity}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatPaiseToInr(line.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-600">
                    {line.taxRate}%
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatPaiseToInr(line.lineAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals Summary */}
        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200 bg-slate-50/50 p-6 text-sm">
          <div className="flex w-72 justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(subtotalPaise)}
            </span>
          </div>

          <div className="flex w-72 justify-between text-slate-600">
            <span>Estimated Taxes:</span>
            <span className="font-medium text-slate-900">
              {formatPaiseToInr(taxTotalPaise)}
            </span>
          </div>

          {subscription.discountRule && (
            <div className="flex w-72 justify-between text-emerald-700">
              <span>Discount ({subscription.discountRule.code}):</span>
              <span className="font-medium">
                -{formatPaiseToInr(discountPaise)}
              </span>
            </div>
          )}

          <div className="flex w-72 justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
            <span>Cycle Total:</span>
            <span className="text-blue-600">
              {formatPaiseToInr(grandTotalPaise)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
