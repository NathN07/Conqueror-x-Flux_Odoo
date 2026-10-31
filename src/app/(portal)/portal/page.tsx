import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoiceStatus, SubscriptionStatus } from "@prisma/client";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import Link from "next/link";
import {
  Layers,
  Receipt,
  Calendar,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CustomerPortalOverviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Security: Query ONLY by logged-in user's ID with lean bounded queries
  const [subMeta, recentSubscriptions, confirmedInvoices, recentInvoices] = await Promise.all([
    // Lean metadata for counters & next billing date
    prisma.subscription.findMany({
      where: { customerId: user.id },
      select: {
        id: true,
        status: true,
        nextBillingDate: true,
      },
    }),
    // Recent subscriptions for list (only 5 items)
    prisma.subscription.findMany({
      where: { customerId: user.id },
      select: {
        id: true,
        subscriptionNumber: true,
        status: true,
        startDate: true,
        nextBillingDate: true,
        plan: {
          select: { name: true, billingFrequency: true },
        },
        lines: {
          select: { lineAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Outstanding invoices for Amount Due
    prisma.invoice.findMany({
      where: {
        customerId: user.id,
        status: InvoiceStatus.CONFIRMED,
      },
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
      },
    }),
    // Recent invoices for list (only 5 items)
    prisma.invoice.findMany({
      where: {
        customerId: user.id,
        status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        dueDate: true,
        issuedDate: true,
        subscription: {
          select: { subscriptionNumber: true },
        },
      },
      orderBy: { issuedDate: "desc" },
      take: 5,
    }),
  ]);

  const now = new Date();
  const totalSubscriptionsCount = subMeta.length;
  const activeSubs = subMeta.filter(
    (s) => s.status === SubscriptionStatus.ACTIVE
  );

  // 2. Earliest Next Billing Date
  const activeBillingDates = activeSubs
    .map((s) => s.nextBillingDate)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  const nextBillingDate = activeBillingDates[0] || null;

  // 3. Amount Due (Outstanding on CONFIRMED invoices)
  const totalAmountDuePaise = confirmedInvoices.reduce(
    (acc, inv) => acc + Math.max(0, inv.totalAmount - inv.amountPaid),
    0
  );
  const totalInvoicesCount = confirmedInvoices.length + recentInvoices.filter(i => i.status === InvoiceStatus.PAID).length;
  const subscriptions = recentSubscriptions;
  const invoices = recentInvoices;

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
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Account dashboard for managing your software subscriptions, billing cycles, and invoice receipts.
        </p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Card 1: Active Subscriptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Active Subscriptions
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {activeSubs.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalSubscriptionsCount} total contract(s) on file
          </p>
        </div>

        {/* Card 2: Next Billing Date */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Next Billing Date
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {nextBillingDate ? formatUtcDate(nextBillingDate) : "None scheduled"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {nextBillingDate ? "Next renewal cycle" : "No active recurring cycles"}
          </p>
        </div>

        {/* Card 3: Total Amount Due */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Amount Due
            </span>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                totalAmountDuePaise > 0
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {formatPaiseToInr(totalAmountDuePaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {confirmedInvoices.length} outstanding invoice(s)
          </p>
        </div>
      </div>

      {/* Subscriptions Overview Section */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">My Subscriptions</h2>
            <p className="text-xs text-slate-500">
              Active and past subscription plans under your account.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/portal/subscriptions"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              View all ({totalSubscriptionsCount})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Layers className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium">No subscriptions found</p>
            <p className="text-xs">You do not have any active subscriptions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subscriptions.slice(0, 3).map((sub) => {
              const totalAmount = sub.lines.reduce(
                (acc, l) => acc + l.lineAmount,
                0
              );
              return (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="font-mono text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {sub.subscriptionNumber}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getSubStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {sub.plan.name} ({sub.plan.billingFrequency})
                    </p>
                    <p className="text-xs text-slate-500">
                      Started on {formatUtcDate(sub.startDate)} • Contract Value:{" "}
                      <strong>{formatPaiseToInr(totalAmount)}</strong>
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/portal/subscriptions/${sub.id}`}>
                        Manage Subscription
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices Overview Section (CONFIRMED & PAID only) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">
              Official issued statements and payment receipts.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/portal/invoices"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              View all ({invoices.length})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Receipt className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium">No issued invoices yet</p>
            <p className="text-xs">
              Once an invoice is confirmed, it will appear here for payment and download.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.slice(0, 3).map((inv) => {
              const isOverdue =
                inv.dueDate < now && inv.status !== InvoiceStatus.PAID;
              const outstanding = Math.max(0, inv.totalAmount - inv.amountPaid);

              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="font-mono text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          inv.status === InvoiceStatus.PAID
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {inv.status}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Due: {formatUtcDate(inv.dueDate)} • Total:{" "}
                      <strong>{formatPaiseToInr(inv.totalAmount)}</strong>
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {inv.status === InvoiceStatus.PAID
                          ? "Fully Paid"
                          : `Due: ${formatPaiseToInr(outstanding)}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/portal/invoices/${inv.id}`}>
                        View Details
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
