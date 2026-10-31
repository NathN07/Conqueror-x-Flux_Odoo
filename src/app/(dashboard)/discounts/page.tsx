import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DiscountManager } from "./discount-manager";

interface PageProps {
  searchParams: {
    q?: string;
    type?: string;
    status?: string;
    page?: string;
  };
}

export default async function DiscountsPage({ searchParams }: PageProps) {
  // Staff cannot access discounts (Admin only)
  await requireRole(Role.ADMIN);

  const query = searchParams.q?.trim() || "";
  const typeFilter = searchParams.type?.toUpperCase();
  const statusFilter = searchParams.status?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  const where: any = {};

  if (typeFilter && (typeFilter === "PERCENTAGE" || typeFilter === "FIXED")) {
    where.type = typeFilter;
  }

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  if (query) {
    where.OR = [
      { code: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ];
  }

  const [totalCount, discounts, availableProducts] = await Promise.all([
    prisma.discountRule.count({ where }),
    prisma.discountRule.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.findMany({
      where: { isActive: true },
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
              Discounts & Coupons
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              ADMIN ONLY
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Configure promotional percentage and fixed-amount price reduction rules.
          </p>
        </div>
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
              placeholder="Search coupons by code or name..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              name="type"
              defaultValue={typeFilter || "ALL"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Discount Types</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
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
            {(query || typeFilter || statusFilter) && (
              <Link
                href="/discounts"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Interactive Discounts Table & Modal */}
      <DiscountManager
        discounts={discounts}
        availableProducts={availableProducts}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 rounded-xl">
          <div className="text-xs text-slate-500">
            Showing page <span className="font-semibold text-slate-800">{page}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total coupons)
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/discounts?q=${encodeURIComponent(query)}&type=${typeFilter || ""}&status=${statusFilter || ""}&page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/discounts?q=${encodeURIComponent(query)}&type=${typeFilter || ""}&status=${statusFilter || ""}&page=${page + 1}`}
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
  );
}
