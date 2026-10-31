import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import { formatPaiseToInr } from "@/lib/money";
import {
  Package,
  Plus,
  Search,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Archive,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    page?: string;
  };
}

export default async function ProductsListPage({ searchParams }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);
  const isAdmin = user.role === Role.ADMIN;

  const query = searchParams.q?.trim() || "";
  const statusFilter = searchParams.status?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 10;

  // Build where filter
  const where: any = {};

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "archived") {
    where.isActive = false;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { type: { contains: query, mode: "insensitive" } },
      { notes: { contains: query, mode: "insensitive" } },
    ];
  }

  const [totalCount, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        variants: true,
        _count: {
          select: {
            subscriptionLines: true,
            invoiceLines: true,
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
              Product Catalog
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
            Manage your service and software products, variants, and pricing surcharges.
          </p>
        </div>

        {isAdmin && (
          <Link href="/products/new">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Toolbar / Search / Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search products by name, type, or notes..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={statusFilter || "all"}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Filter
            </button>
            {(query || statusFilter) && (
              <Link
                href="/products"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              No products found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {query || statusFilter
                ? "Try adjusting your search or filters."
                : "Get started by adding your first product to the catalog."}
            </p>
            {isAdmin && !query && (
              <div className="mt-4">
                <Link href="/products/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
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
                  <th className="px-6 py-3.5">Product Name & Type</th>
                  <th className="px-6 py-3.5">Sales Price</th>
                  <th className="px-6 py-3.5">Cost Price</th>
                  <th className="px-6 py-3.5">Variants</th>
                  <th className="px-6 py-3.5">Usage</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((product) => {
                  const usageCount =
                    product._count.subscriptionLines + product._count.invoiceLines;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {product.type}
                          </span>
                          {product.notes && (
                            <span className="text-xs text-slate-400 truncate max-w-[200px]" title={product.notes}>
                              {product.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {formatPaiseToInr(product.salesPrice)}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatPaiseToInr(product.costPrice)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {product.variants.length}
                          </span>
                          {product.variants.length > 0 && (
                            <span className="text-xs text-slate-400">
                              ({product.variants.map((v) => v.name).join(", ")})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            usageCount > 0
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {usageCount} lines
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <Archive className="h-3 w-3" />
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/products/${product.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <span>{isAdmin ? "Edit & Variants" : "View"}</span>
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
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
              <span className="font-semibold text-slate-800">{totalPages}</span> ({totalCount} total products)
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/products?q=${encodeURIComponent(query)}&status=${statusFilter || ""}&page=${page - 1}`}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={`/products?q=${encodeURIComponent(query)}&status=${statusFilter || ""}&page=${page + 1}`}
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
