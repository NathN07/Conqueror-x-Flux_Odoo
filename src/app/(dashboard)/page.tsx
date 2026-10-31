import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role, SubscriptionStatus } from "@prisma/client";
import {
  Layers,
  Receipt,
  CreditCard,
  Users,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPaiseToInr } from "@/lib/money";

export default async function DashboardPage() {
  await requireRole(Role.ADMIN, Role.STAFF);

  // Parallel database metrics query
  const [activeSubs, totalCustomers, totalInvoices, allActiveSubscriptions] =
    await Promise.all([
      prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      prisma.user.count({
        where: { role: Role.CUSTOMER },
      }),
      prisma.invoice.count(),
      prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: {
          plan: true,
          lines: true,
        },
      }),
    ]);

  // Compute normalized MRR in paise from active subscriptions
  let mrrPaise = 0;
  for (const sub of allActiveSubscriptions) {
    const subtotal = sub.lines.reduce((acc, line) => acc + line.lineAmount, 0);
    switch (sub.plan.billingFrequency) {
      case "DAILY":
        mrrPaise += subtotal * 30;
        break;
      case "WEEKLY":
        mrrPaise += Math.round(subtotal * 4.33);
        break;
      case "MONTHLY":
        mrrPaise += subtotal;
        break;
      case "YEARLY":
        mrrPaise += Math.round(subtotal / 12);
        break;
    }
  }

  const cards = [
    {
      title: "Active Subscriptions",
      value: String(activeSubs),
      description: "Contracts currently renewing",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      href: "/subscriptions?status=ACTIVE",
    },
    {
      title: "Normalized Monthly MRR",
      value: formatPaiseToInr(mrrPaise),
      description: "Recurring revenue run rate",
      icon: ArrowUpRight,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      href: "/subscriptions",
    },
    {
      title: "Total Invoices",
      value: String(totalInvoices),
      description: "Billing statements generated",
      icon: Receipt,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      href: "/invoices",
    },
    {
      title: "Direct Customers",
      value: String(totalCustomers),
      description: "Registered accounts in directory",
      icon: Users,
      color: "text-purple-600 bg-purple-50 border-purple-100",
      href: "/customers",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing & Subscription Overview
          </h1>
          <p className="text-sm text-slate-500">
            Real-time pulse of Brightloop recurring revenue, cycles, and accounts receivable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/subscriptions/new" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              New Subscription
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {card.title}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${card.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Launch Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Subscription Management Engine Ready
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pure state machine enforced (Draft → Quotation → Confirmed → Active ⇄ Paused → Closed) with integer paise calculations.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/subscriptions">Open Subscriptions Directory</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
