"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SubscriptionStatus } from "@prisma/client";
import {
  Filter,
  Calendar,
  Layers,
  User,
  RotateCcw,
  LayoutGrid,
  ListFilter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  customers: CustomerOption[];
  plans: PlanOption[];
  currentFilters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    planId?: string;
    customerId?: string;
    view?: string;
  };
}

export function DashboardFilters({
  customers,
  plans,
  currentFilters,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(currentFilters.startDate || "");
  const [endDate, setEndDate] = useState(currentFilters.endDate || "");
  const [status, setStatus] = useState(currentFilters.status || "ALL");
  const [planId, setPlanId] = useState(currentFilters.planId || "ALL");
  const [customerId, setCustomerId] = useState(currentFilters.customerId || "ALL");
  const currentView = currentFilters.view === "summary" ? "summary" : "detail";

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    if (status && status !== "ALL") params.set("status", status);
    else params.delete("status");

    if (planId && planId !== "ALL") params.set("planId", planId);
    else params.delete("planId");

    if (customerId && customerId !== "ALL") params.set("customerId", customerId);
    else params.delete("customerId");

    // Reset table pagination when filters change
    params.delete("overduePage");
    params.delete("paymentsPage");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleToggleView = (newView: "summary" | "detail") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setStatus("ALL");
    setPlanId("ALL");
    setCustomerId("ALL");
    startTransition(() => {
      router.push(window.location.pathname);
    });
  };

  const hasActiveFilters = Boolean(
    startDate ||
      endDate ||
      (status && status !== "ALL") ||
      (planId && planId !== "ALL") ||
      (customerId && customerId !== "ALL")
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {/* Top row: View Mode Switch & Filter Label */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Financial Metrics & Analytics Filters</span>
          {isPending && (
            <span className="text-blue-600 animate-pulse font-normal lowercase text-[11px]">
              (updating data...)
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => handleToggleView("summary")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currentView === "summary"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />
            <span>Summary View</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleView("detail")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currentView === "detail"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5 text-blue-600" />
            <span>Detail View</span>
          </button>
        </div>
      </div>

      {/* Filter Inputs Grid */}
      <form onSubmit={handleApplyFilters} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
        {/* Date Range Start */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Date From (UTC)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Date To (UTC)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Subscription Status Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Subscription Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        {/* Plan Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Billing Plan
          </label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions row */}
        <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-end gap-2 pt-1">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-900 text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Filters
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4"
          >
            Apply Filters
          </Button>
        </div>
      </form>
    </div>
  );
}
