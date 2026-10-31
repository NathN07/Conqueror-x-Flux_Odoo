"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatPaiseToInr } from "@/lib/money";
import { TrendingUp, PieChart as PieIcon, Layers, BarChart3 } from "lucide-react";

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM
  label: string; // "May '26"
  revenuePaise: number;
}

export interface StatusDistributionItem {
  name: string;
  count: number;
  color: string;
  totalPaise?: number;
}

interface DashboardChartsProps {
  monthlyRevenue: MonthlyRevenuePoint[];
  invoicesDistribution: StatusDistributionItem[];
  subscriptionsDistribution: StatusDistributionItem[];
}

const INVOICE_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8", // slate-400
  CONFIRMED: "#3b82f6", // blue-500
  PAID: "#10b981", // emerald-500
  CANCELLED: "#ef4444", // red-500
  OVERDUE: "#f59e0b", // amber-500
};

const SUBSCRIPTION_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", // emerald-500
  QUOTATION: "#3b82f6", // blue-500
  CONFIRMED: "#8b5cf6", // purple-500
  PAUSED: "#f59e0b", // amber-500
  CLOSED: "#64748b", // slate-500
  DRAFT: "#cbd5e1", // slate-300
};

export function DashboardCharts({
  monthlyRevenue,
  invoicesDistribution,
  subscriptionsDistribution,
}: DashboardChartsProps) {
  // Prevent SSR hydration mismatch with recharts ResponsiveContainer
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse" />
        <div className="h-80 rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse" />
      </div>
    );
  }

  // Format data for chart display
  const revenueChartData = monthlyRevenue.map((d) => ({
    name: d.label,
    revenueInInr: d.revenuePaise / 100,
    rawPaise: d.revenuePaise,
  }));

  const invoicePieData = invoicesDistribution.filter((i) => i.count > 0);
  const subscriptionChartData = subscriptionsDistribution.filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      {/* Top Chart: Revenue Collected Per Month (Last 12 Months) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Monthly Revenue Collected (Last 12 Months)
            </h3>
            <p className="text-xs text-slate-500">
              Cash inflows recorded across payment methods in Indian Rupees (₹).
            </p>
          </div>
          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Total 12M:{" "}
            {formatPaiseToInr(
              monthlyRevenue.reduce((sum, item) => sum + item.revenuePaise, 0)
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val.toLocaleString()}`}
              />
              <Tooltip
                formatter={(val: any) => [
                  formatPaiseToInr(Math.round(Number(val || 0) * 100)),
                  "Revenue Collected",
                ]}
                labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenueInInr"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Charts: Invoices by Status & Subscriptions by Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Invoices by Status (Donut Chart) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-blue-600" />
              Invoices by Status
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of issued statements including computed overdue accounts.
            </p>
          </div>

          {invoicePieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No invoice records matching active filters.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoicePieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {invoicePieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={INVOICE_COLORS[entry.name] || "#3b82f6"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, props: any) => [
                      `${val} Invoices (${formatPaiseToInr(props.payload.totalPaise || 0)})`,
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Subscriptions by Status (Bar Chart) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              Subscriptions Lifecycle Status
            </h3>
            <p className="text-xs text-slate-500">
              Active, quotation, and paused recurring contracts with contract counts.
            </p>
          </div>

          {subscriptionChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No subscription records matching active filters.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any, props: any) => [
                      `${val} Subscriptions (${formatPaiseToInr(props.payload.totalPaise || 0)} MRR value)`,
                      "Contracts",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {subscriptionChartData.map((entry, index) => (
                      <Cell
                        key={`sub-cell-${index}`}
                        fill={SUBSCRIPTION_COLORS[entry.name] || "#8b5cf6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
