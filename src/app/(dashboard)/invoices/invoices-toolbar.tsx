"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { triggerRunBillingJobAction } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Search, Play, Loader2, CheckCircle2, AlertCircle, X, Receipt } from "lucide-react";
import type { BillingJobSummary } from "@/lib/billing";
import { formatPaiseToInr } from "@/lib/money";

interface InvoicesToolbarProps {
  currentSearch?: string;
  currentStatus?: string;
  isOverdueFilter?: boolean;
}

export function InvoicesToolbar({
  currentSearch = "",
  currentStatus = "ALL",
  isOverdueFilter = false,
}: InvoicesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [isRunningBilling, setIsRunningBilling] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingJobSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`/invoices?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "OVERDUE") {
      params.set("overdue", "true");
      params.delete("status");
    } else {
      params.delete("overdue");
      if (status && status !== "ALL") {
        params.set("status", status);
      } else {
        params.delete("status");
      }
    }
    params.set("page", "1");
    router.push(`/invoices?${params.toString()}`);
  };

  const handleRunBilling = async () => {
    setIsRunningBilling(true);
    setBillingSummary(null);
    setErrorMessage(null);

    try {
      const res = await triggerRunBillingJobAction();
      if (!res.success) {
        setErrorMessage(res.error || "Failed to execute billing run.");
        return;
      }
      setBillingSummary(res.data || null);
      router.refresh();
    } catch {
      setErrorMessage("An unexpected error occurred while executing the billing run.");
    } finally {
      setIsRunningBilling(false);
    }
  };

  const activeSelectValue = isOverdueFilter ? "OVERDUE" : currentStatus;

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Billing Run Summary Modal / Banner */}
      {billingSummary && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Billing Job Completed Successfully
                </h3>
                <p className="text-xs text-slate-500">
                  Recurring billing engine run at {new Date(billingSummary.runDate).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setBillingSummary(null)}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Evaluated</p>
              <p className="text-lg font-bold text-slate-900">
                {billingSummary.totalSubscriptionsEvaluated}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-emerald-600 font-medium">Invoices Created</p>
              <p className="text-lg font-bold text-emerald-700">
                {billingSummary.createdCount}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Skipped (Billed/Future)</p>
              <p className="text-lg font-bold text-slate-700">
                {billingSummary.skippedCount}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-red-600 font-medium">Failed</p>
              <p className="text-lg font-bold text-red-700">
                {billingSummary.failedCount}
              </p>
            </div>
          </div>

          {billingSummary.invoicesCreated.length > 0 && (
            <div className="mt-4 border-t border-blue-200/60 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Created Invoices ({billingSummary.invoicesCreated.length}):
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {billingSummary.invoicesCreated.map((inv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-blue-200 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-xs"
                  >
                    <span className="font-mono text-blue-600">{inv.invoiceNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span>{inv.subscriptionNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold">{formatPaiseToInr(inv.totalAmount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filter */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by INV-# or customer name..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>

          <select
            value={activeSelectValue}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="OVERDUE">⚠️ Overdue Invoices</option>
          </select>
        </div>

        {/* Run Billing Button */}
        <div>
          <Button
            onClick={handleRunBilling}
            disabled={isRunningBilling}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            {isRunningBilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Billing Run...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Run Billing
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
