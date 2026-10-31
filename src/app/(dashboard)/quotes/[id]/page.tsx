import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { QuoteTemplateForm } from "../quote-template-form";
import { FileText } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function QuoteTemplateDetailPage({ params }: PageProps) {
  await requireRole(Role.ADMIN, Role.STAFF);

  const [template, plans, products] = await Promise.all([
    prisma.quotationTemplate.findUnique({
      where: { id: params.id },
      include: {
        lines: true,
      },
    }),
    prisma.plan.findMany({
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
      select: {
        id: true,
        name: true,
        salesPrice: true,
        variants: {
          select: { id: true, name: true, priceSurcharge: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!template) {
    notFound();
  }

  const initialData = {
    id: template.id,
    name: template.name,
    planId: template.planId,
    validityDays: template.validityDays,
    terms: template.terms,
    isActive: template.isActive,
    lines: template.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId || "",
      quantity: l.quantity,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Edit Quotation Template: {template.name}
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Modify the pre-configured products, pricing surcharges, validity period, or assigned billing plan.
        </p>
      </div>

      <QuoteTemplateForm
        initialData={initialData}
        plans={plans}
        products={products}
      />
    </div>
  );
}
