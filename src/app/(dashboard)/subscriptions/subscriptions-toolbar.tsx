"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { triggerCloseExpiredAction } from "@/actions/subscription.actions";
import { Button } from "@/components/ui/button";
import { Search, Plus, Clock, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Role } from "@prisma/client";

interface ToolbarProps {
  userRole: Role;
  currentSearch?: string;
  currentStatus?: string;
}

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
];

export function SubscriptionsToolbar({
  userRole,
  currentSearch = "",
  currentStatus = "ALL",
}: ToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [isClosingExpired, setIsClosingExpired] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`/subscriptions?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "ALL") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`/subscriptions?${params.toString()}`);
  };

  const handleCloseExpired = async () => {
    setIsClosingExpired(true);
    setNotification(null);
    try {
      const res = await triggerCloseExpiredAction();
      if (res.success && res.data) {
        if (res.data.closedCount > 0) {
          setNotification(
            `Closed ${res.data.closedCount} expired subscription(s): ${res.data.closedSubscriptionNumbers.join(", ")}`
          );
        } else {
          setNotification("No active subscriptions are past their expiry date.");
        }
        router.refresh();
      }
    } catch {
      setNotification("Failed to trigger close-expired job.");
    } finally {
      setIsClosingExpired(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filter */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SUB-# or customer name..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>

          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {userRole === Role.ADMIN && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseExpired}
              disabled={isClosingExpired}
              className="text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              {isClosingExpired ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4 text-amber-600" />
                  Close Expired
                </>
              )}
            </Button>
          )}

          <Button asChild size="sm">
            <Link href="/subscriptions/new" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              New Subscription
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
