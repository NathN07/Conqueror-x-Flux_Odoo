import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Calculator } from "lucide-react";

export default async function TaxesPage() {
  // Staff cannot access taxes (Admin only)
  await requireRole(Role.ADMIN);

  const taxes = await prisma.taxRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tax Rules
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              ADMIN ONLY
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Automated tax calculation rules applied to invoice line items.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {taxes.map((tax) => (
            <div
              key={tax.id}
              className="flex items-center justify-between p-6 hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{tax.name}</span>
                    {tax.isDefault && (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tax Rate: {tax.percentageRate}%
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
