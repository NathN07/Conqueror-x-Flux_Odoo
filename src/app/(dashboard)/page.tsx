import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getDashboardFinancialMetrics, type DashboardFilterParams } from "@/lib/dashboard-analytics";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-cards";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardTables } from "@/components/dashboard/dashboard-tables";
import Link from "next/link";
import {
  LayoutDashboard,
  Plus,
  CreditCard,
  Layers,
  Receipt,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: DashboardFilterParams;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);
  const isAdmin = user.role === Role.ADMIN;
  const isSummaryView = searchParams.view === "summary";

  // Fetch all aggregated financial metrics and paginated records concurrently
  const metrics = await getDashboardFinancialMetrics(searchParams);

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Finance & Operations Executive Dashboard
            </h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                isAdmin
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {user.role}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time monthly run rate (MRR), cash collection velocity, and accounts receivable aging.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/subscriptions/new">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Subscription</span>
            </Button>
          </Link>

          <Link href="/payments">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Record Payment</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* URL Filter Bar */}
      <DashboardFilters
        customers={metrics.filterOptions.customers}
        plans={metrics.filterOptions.plans}
        currentFilters={searchParams}
      />

      {/* 6 Summary Cards */}
      <DashboardSummaryCards data={metrics.summaryCards} />

      {/* Recharts Analytics Charts */}
      <DashboardCharts
        monthlyRevenue={metrics.charts.monthlyRevenue}
        invoicesDistribution={metrics.charts.invoicesDistribution}
        subscriptionsDistribution={metrics.charts.subscriptionsDistribution}
      />

      {/* Paginated Tables Section (Displayed in Detail View) */}
      {!isSummaryView && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Detailed Operations & Ledgers
              </h2>
              <p className="text-xs text-slate-500">
                Drill-down tables for accounts receivable debt, payment receipts, and contract status.
              </p>
            </div>
          </div>

          <DashboardTables
            overdueInvoices={metrics.tables.overdueInvoices}
            overdueTotalCount={metrics.tables.overdueTotalCount}
            overduePage={metrics.tables.overduePage}
            overduePageSize={metrics.tables.overduePageSize}
            recentPayments={metrics.tables.recentPayments}
            paymentsTotalCount={metrics.tables.paymentsTotalCount}
            paymentsPage={metrics.tables.paymentsPage}
            paymentsPageSize={metrics.tables.paymentsPageSize}
            subscriptionStatusSummary={metrics.tables.subscriptionStatusSummary}
          />
        </div>
      )}
    </div>
  );
}
