import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, SubscriptionStatus } from "@prisma/client";
import Link from "next/link";
import { SubscriptionsToolbar } from "./subscriptions-toolbar";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import { Layers, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    page?: string;
  };
}

export default async function SubscriptionsListPage({ searchParams }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);

  const query = searchParams.q?.trim() || "";
  const statusFilter = searchParams.status?.toUpperCase();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  // Build where clause
  const where: any = {};

  if (statusFilter && statusFilter !== "ALL") {
    if (Object.values(SubscriptionStatus).includes(statusFilter as SubscriptionStatus)) {
      where.status = statusFilter as SubscriptionStatus;
    }
  }

  if (query) {
    where.OR = [
      {
        subscriptionNumber: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        customer: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        customer: {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  // Fetch count and paginated items
  let totalCount = 0;
  let subscriptions: Array<{
    id: string;
    subscriptionNumber: string;
    status: SubscriptionStatus;
    nextBillingDate: Date | null;
    createdAt: Date;
    customer: { id?: string; name: string; email: string };
    plan: { id?: string; name: string; billingFrequency: any };
    lines: Array<{ lineAmount: number }>;
  }> = [];

  if (!query && (!statusFilter || statusFilter === "ALL")) {
    const [count, rows] = await Promise.all([
      prisma.subscription.count(),
      prisma.$queryRaw<
        Array<{
          id: string;
          subscriptionNumber: string;
          status: SubscriptionStatus;
          nextBillingDate: Date | null;
          createdAt: Date;
          customerId: string;
          customerName: string;
          customerEmail: string;
          planId: string;
          planName: string;
          billingFrequency: any;
          totalLineAmount: number;
        }>
      >`
        SELECT
          s.id,
          s."subscriptionNumber",
          s.status,
          s."nextBillingDate",
          s."createdAt",
          u.id as "customerId",
          u.name as "customerName",
          u.email as "customerEmail",
          p.id as "planId",
          p.name as "planName",
          p."billingFrequency",
          COALESCE(SUM(sl."lineAmount"), 0)::int as "totalLineAmount"
        FROM (
          SELECT id, "subscriptionNumber", status, "nextBillingDate", "createdAt", "customerId", "planId"
          FROM "Subscription"
          ORDER BY "createdAt" DESC
          LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
        ) s
        JOIN "User" u ON s."customerId" = u.id
        JOIN "Plan" p ON s."planId" = p.id
        LEFT JOIN "SubscriptionLine" sl ON s.id = sl."subscriptionId"
        GROUP BY s.id, s."subscriptionNumber", s.status, s."nextBillingDate", s."createdAt", u.id, u.name, u.email, p.id, p.name, p."billingFrequency"
        ORDER BY s."createdAt" DESC
      `,
    ]);
    totalCount = count;
    subscriptions = rows.map((r) => ({
      id: r.id,
      subscriptionNumber: r.subscriptionNumber,
      status: r.status,
      nextBillingDate: r.nextBillingDate,
      createdAt: r.createdAt,
      customer: { id: r.customerId, name: r.customerName, email: r.customerEmail },
      plan: { id: r.planId, name: r.planName, billingFrequency: r.billingFrequency },
      lines: [{ lineAmount: Number(r.totalLineAmount) }],
    }));
  } else {
    const [count, items] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          subscriptionNumber: true,
          status: true,
          nextBillingDate: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
          plan: {
            select: { id: true, name: true, billingFrequency: true },
          },
          lines: {
            select: { lineAmount: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    totalCount = count;
    subscriptions = items;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.DRAFT:
        return "bg-slate-100 text-slate-700 border-slate-200";
      case SubscriptionStatus.QUOTATION:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case SubscriptionStatus.CONFIRMED:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case SubscriptionStatus.ACTIVE:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case SubscriptionStatus.PAUSED:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case SubscriptionStatus.CLOSED:
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Subscriptions & Recurring Contracts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor subscriptions, track quotation pipelines, and manage recurring renewal lifecycles.
        </p>
      </div>

      {/* Search & Actions Toolbar */}
      <SubscriptionsToolbar
        userRole={user.role}
        currentSearch={query}
        currentStatus={statusFilter || "ALL"}
      />

      {/* Subscriptions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Subscription #
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Plan & Cycle
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Total Value
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Next Renewal
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Layers className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm font-medium">No subscriptions found</p>
                    <p className="text-xs">
                      Try adjusting your search criteria or create a new subscription.
                    </p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const totalLineAmount = sub.lines.reduce(
                    (sum, line) => sum + line.lineAmount,
                    0
                  );

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        <Link
                          href={`/subscriptions/${sub.id}`}
                          className="hover:underline"
                        >
                          {sub.subscriptionNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {sub.customer.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {sub.customer.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {sub.plan.name}
                        </p>
                        <span className="text-xs text-slate-500">
                          {sub.plan.billingFrequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatPaiseToInr(totalLineAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                            sub.status
                          )}`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {sub.status === SubscriptionStatus.ACTIVE && sub.nextBillingDate
                          ? formatUtcDate(sub.nextBillingDate)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 text-blue-600 hover:text-blue-700"
                        >
                          <Link href={`/subscriptions/${sub.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-700">
              {Math.min(page * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium text-slate-700">{totalCount}</span> subscriptions
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link
                  href={`/subscriptions?page=${page - 1}&q=${encodeURIComponent(
                    query
                  )}&status=${statusFilter || "ALL"}`}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </span>
              )}
            </Button>

            <span className="text-xs text-slate-600 px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link
                  href={`/subscriptions?page=${page + 1}&q=${encodeURIComponent(
                    query
                  )}&status=${statusFilter || "ALL"}`}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              ) : (
                <span className="flex items-center">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
