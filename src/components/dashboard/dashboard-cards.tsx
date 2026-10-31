import { formatPaiseToInr } from "@/lib/money";
import {
  Layers,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface SummaryCardsProps {
  data: {
    activeSubscriptions: number;
    mrrPaise: number;
    revenueCollectedPaise: number;
    totalBilledPaise: number;
    outstandingPaise: number;
    overdueInvoiceCount: number;
    overdueAmountPaise: number;
  };
}

export function DashboardSummaryCards({ data }: SummaryCardsProps) {
  const cards = [
    {
      title: "Active Subscriptions",
      value: String(data.activeSubscriptions),
      subtext: "Contracts renewing & in good standing",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Monthly Run Rate (MRR)",
      value: formatPaiseToInr(data.mrrPaise),
      subtext: "Normalised recurring run rate",
      icon: ArrowUpRight,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Revenue Collected",
      value: formatPaiseToInr(data.revenueCollectedPaise),
      subtext: "Payments settled in range",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Total Invoiced",
      value: formatPaiseToInr(data.totalBilledPaise),
      subtext: "Gross statements issued",
      icon: Receipt,
      color: "text-slate-600 bg-slate-50 border-slate-200",
    },
    {
      title: "Outstanding Receivables",
      value: formatPaiseToInr(data.outstandingPaise),
      subtext: "Awaiting customer settlement",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Overdue Receivables",
      value: formatPaiseToInr(data.overdueAmountPaise),
      subtext: `${data.overdueInvoiceCount} statement${data.overdueInvoiceCount === 1 ? "" : "s"} past deadline`,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      alert: data.overdueInvoiceCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {c.title}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${c.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <div
                className={`text-xl font-bold tracking-tight ${
                  c.alert ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {c.value}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                {c.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
