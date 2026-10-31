import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, BillingFrequency } from "@prisma/client";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import {
  CalendarRange,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  CheckCircle2,
  PauseCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    frequency?: string;
    status?: string;
    page?: string;
  };
}

export default async function PlansListPage({ searchParams }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);
  const isAdmin = user.role === Role.ADMIN;

  const query = searchParams.q?.trim() || "";
  const frequencyFilter = searchParams.frequency?.toUpperCase();
  const statusFilter = searchParams.status?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  // Build where filter
  const where: any = {};

  if (frequencyFilter && Object.values(BillingFrequency).includes(frequencyFilter as BillingFrequency)) {
    where.billingFrequency = frequencyFilter as BillingFrequency;
  }

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }

  const [totalCount, plans] = await Promise.all([
    prisma.plan.count({ where }),
    prisma.plan.findMany({
      where,
      include: {
        _count: {
          select: {
            subscriptions: true,
            quotationTemplates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Billing Plans
            </h1>
            {!isAdmin && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                STAFF (READ-ONLY)
              </span>
            )}
            {isAdmin && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                ADMIN
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Define recurring subscription terms, renewal schedules, and customer pause/close policies.
          </p>
        </div>

        {isAdmin && (
          <Link href="/plans/new">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Create Plan</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Toolbar / Search / Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search plans by name..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              name="frequency"
              defaultValue={frequencyFilter || "ALL"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Frequencies</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>

            <select
              name="status"
              defaultValue={statusFilter || "all"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Filter
            </button>
            {(query || frequencyFilter || statusFilter) && (
              <Link
                href="/plans"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Plans List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {plans.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarRange className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              No billing plans found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {query || frequencyFilter || statusFilter
                ? "Try adjusting your filters."
                : "Create recurring billing plans to start selling subscriptions."}
            </p>
            {isAdmin && !query && (
              <div className="mt-4">
                <Link href="/plans/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Plan Name</th>
                  <th className="px-6 py-3.5">Frequency</th>
                  <th className="px-6 py-3.5">Base Price</th>
                  <th className="px-6 py-3.5">Min Qty</th>
                  <th className="px-6 py-3.5">Validity Dates</th>
                  <th className="px-6 py-3.5">Policies</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {plans.map((plan) => {
                  const subsCount = plan._count.subscriptions;
                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {plan.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Used in {subsCount} subscription(s)
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {plan.billingFrequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatPaiseToInr(plan.basePrice)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {plan.minQuantity} unit{plan.minQuantity > 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {plan.startDate ? (
                          <div>
                            <div>From: {formatUtcDate(plan.startDate)}</div>
                            {plan.endDate && (
                              <div>To: {formatUtcDate(plan.endDate)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Always available</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {plan.allowPause && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 border border-amber-200" title="Allow Pause">
                              Pause
                            </span>
                          )}
                          {plan.allowRenewal && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 border border-emerald-200" title="Allow Renewal">
                              Renew
                            </span>
                          )}
                          {plan.allowEarlyClose && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 border border-slate-200" title="Allow Early Close">
                              Early Close
                            </span>
                          )}
                          {plan.autoCloseOnEnd && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 border border-rose-200" title="Auto Close on End Date">
                              Auto Close
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {plan.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/plans/${plan.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <span>{isAdmin ? "Edit" : "View"}</span>
                            <Edit2 className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total plans)
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/plans?q=${encodeURIComponent(query)}&frequency=${frequencyFilter || ""}&status=${statusFilter || ""}&page=${page - 1}`}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/plans?q=${encodeURIComponent(query)}&frequency=${frequencyFilter || ""}&status=${statusFilter || ""}&page=${page + 1}`}
                aria-disabled={page >= totalPages}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
