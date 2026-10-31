import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { QuoteTemplateForm } from "../quote-template-form";
import { FileText } from "lucide-react";

export default async function NewQuoteTemplatePage() {
  await requireRole(Role.ADMIN, Role.STAFF);

  const [plans, products] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        billingFrequency: true,
        basePrice: true,
        minQuantity: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        salesPrice: true,
        variants: {
          where: { isActive: true },
          select: { id: true, name: true, priceSurcharge: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Quotation Template
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Build a reusable quotation package with pre-selected products, variants, and assigned billing recurrence.
        </p>
      </div>

      <QuoteTemplateForm plans={plans} products={products} />
    </div>
  );
}
