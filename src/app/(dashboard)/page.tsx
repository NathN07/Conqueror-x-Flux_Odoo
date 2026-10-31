import { Layers, Receipt, CreditCard, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const cards = [
    {
      title: "Active Subscriptions",
      value: "0",
      description: "Subscriptions currently renewing",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      href: "/subscriptions",
    },
    {
      title: "Monthly Recurring Revenue",
      value: "₹0.00",
      description: "Normalized MRR across plans",
      icon: ArrowUpRight,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      href: "/invoices",
    },
    {
      title: "Pending Invoices",
      value: "0",
      description: "Invoices awaiting payment",
      icon: Receipt,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      href: "/invoices",
    },
    {
      title: "Total Customers",
      value: "0",
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
          <Button variant="outline" asChild>
            <Link href="/quotes">New Quote</Link>
          </Button>
          <Button asChild>
            <Link href="/subscriptions">New Subscription</Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
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
            </div>
          );
        })}
      </div>

      {/* Getting Started / Next Steps Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          System Initialization
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui base scaffolded cleanly.
          Database schema configuration ready for Prisma setup in the next step.
        </p>
      </div>
    </div>
  );
}
