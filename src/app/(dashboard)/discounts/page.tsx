import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Percent, Tag } from "lucide-react";

export default async function DiscountsPage() {
  // Staff cannot access discounts (Admin only)
  await requireRole(Role.ADMIN);

  const discounts = await prisma.discountRule.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {discounts.map((discount) => (
            <div
              key={discount.id}
              className="flex items-center justify-between p-6 hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">
                      {discount.code}
                    </span>
                    <span className="text-xs text-slate-500">({discount.name})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Applies to: {discount.appliesTo} • Value:{" "}
                    {discount.type === "PERCENTAGE"
                      ? `${discount.value}%`
                      : `₹${(discount.value / 100).toFixed(2)}`}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
