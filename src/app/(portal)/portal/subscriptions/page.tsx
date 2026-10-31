import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SubscriptionStatus } from "@prisma/client";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import Link from "next/link";
import { Layers, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CustomerSubscriptionsListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Security: Query ONLY by logged-in user's ID
  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: user.id },
    include: {
      plan: true,
      lines: {
        include: { product: true, variant: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const getSubStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case SubscriptionStatus.PAUSED:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case SubscriptionStatus.CLOSED:
        return "bg-slate-100 text-slate-700 border-slate-200";
      case SubscriptionStatus.CONFIRMED:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case SubscriptionStatus.QUOTATION:
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Subscriptions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View your active plans, review service lines, and manage recurring contract states.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {subscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              No subscriptions found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              You do not have any subscriptions registered to your account yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subscriptions.map((sub) => {
              const totalAmount = sub.lines.reduce(
                (acc, l) => acc + l.lineAmount,
                0
              );

              return (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-blue-600">
                        {sub.subscriptionNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSubStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {sub.plan.name} —{" "}
                      <span className="text-slate-500 font-normal">
                        Billed {sub.plan.billingFrequency}
                      </span>
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {sub.lines.map((l) => (
                        <span
                          key={l.id}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {l.product.name}
                          {l.variant && ` (${l.variant.name})`} × {l.quantity}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 pt-1">
                      Start Date: <strong>{formatUtcDate(sub.startDate)}</strong>
                      {sub.nextBillingDate && (
                        <>
                          {" "}
                          • Next Billing:{" "}
                          <strong>{formatUtcDate(sub.nextBillingDate)}</strong>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400">Total Value</p>
                      <p className="text-base font-bold text-slate-900">
                        {formatPaiseToInr(totalAmount)}
                      </p>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="flex items-center gap-1.5"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
