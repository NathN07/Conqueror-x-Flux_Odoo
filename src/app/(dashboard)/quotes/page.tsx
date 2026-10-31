import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import {
  FileText,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    planId?: string;
    status?: string;
    page?: string;
  };
}

export default async function QuotesListPage({ searchParams }: PageProps) {
  // ADMIN and STAFF both have permission for quotation templates
  await requireRole(Role.ADMIN, Role.STAFF);

  const query = searchParams.q?.trim() || "";
  const planIdFilter = searchParams.planId;
  const statusFilter = searchParams.status?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  const where: any = {};

  if (planIdFilter && planIdFilter !== "ALL") {
    where.planId = planIdFilter;
  }

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }

  const [totalCount, templates, plans] = await Promise.all([
    prisma.quotationTemplate.count({ where }),
    prisma.quotationTemplate.findMany({
      where,
      include: {
        plan: {
          select: { id: true, name: true, billingFrequency: true, basePrice: true },
        },
        lines: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
              Quotation Templates
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              ADMIN & STAFF
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Standard sales packages with preset products, pricing surcharges, and default payment terms.
          </p>
        </div>

        <Link href="/quotes/new">
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search quotation templates by name..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              name="planId"
              defaultValue={planIdFilter || "ALL"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
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
            {(query || planIdFilter || statusFilter) && (
              <Link
                href="/quotes"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Templates List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              No quotation templates found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {query || planIdFilter || statusFilter
                ? "Try adjusting your search filters."
                : "Create a template to accelerate subscription creation."}
            </p>
            <div className="mt-4">
              <Link href="/quotes/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Template Name</th>
                  <th className="px-6 py-3.5">Assigned Plan</th>
                  <th className="px-6 py-3.5">Validity</th>
                  <th className="px-6 py-3.5">Included Items</th>
                  <th className="px-6 py-3.5">Estimated Value</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {templates.map((tpl) => {
                  const totalEst = tpl.lines.reduce(
                    (sum, l) => sum + l.unitPrice * l.quantity,
                    0
                  );

                  return (
                    <tr
                      key={tpl.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {tpl.name}
                        </div>
                        {tpl.terms && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={tpl.terms}>
                            Terms: {tpl.terms}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">
                          {tpl.plan.name}
                        </span>
                        <div className="text-xs text-slate-400">
                          {tpl.plan.billingFrequency} ({formatPaiseToInr(tpl.plan.basePrice)})
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {tpl.validityDays} days
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">
                            {tpl.lines.length} {tpl.lines.length === 1 ? "line" : "lines"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                          {tpl.lines
                            .map((l) => `${l.quantity}x ${l.product.name}`)
                            .join(", ")}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatPaiseToInr(totalEst)}
                      </td>

                      <td className="px-6 py-4">
                        {tpl.isActive ? (
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
                        <Link href={`/quotes/${tpl.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <span>Edit</span>
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
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total templates)
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/quotes?q=${encodeURIComponent(query)}&planId=${planIdFilter || ""}&status=${statusFilter || ""}&page=${page - 1}`}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/quotes?q=${encodeURIComponent(query)}&planId=${planIdFilter || ""}&status=${statusFilter || ""}&page=${page + 1}`}
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
