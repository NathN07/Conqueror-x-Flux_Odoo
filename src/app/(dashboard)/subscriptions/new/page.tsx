import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { SubscriptionCreateForm } from "./subscription-create-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NewSubscriptionPage() {
  await requireRole(Role.ADMIN, Role.STAFF);

  // Fetch prerequisites
  const [customers, plans, products, templates, defaultTaxRule] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: Role.CUSTOMER },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.plan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          billingFrequency: true,
          basePrice: true,
          minQuantity: true,
        },
        orderBy: { basePrice: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          salesPrice: true,
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              priceSurcharge: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.quotationTemplate.findMany({
        where: { isActive: true },
        include: {
          plan: {
            select: { id: true, name: true },
          },
          lines: {
            include: {
              product: {
                select: { id: true, name: true },
              },
              variant: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.taxRule.findFirst({
        where: { isDefault: true, isActive: true },
      }),
    ]);

  const formattedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    validityDays: t.validityDays,
    terms: t.terms,
    planId: t.planId,
    planName: t.plan.name,
    lines: t.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      variantId: l.variantId,
      variantName: l.variant?.name || null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
  }));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/subscriptions" className="flex items-center gap-1 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Back to Subscriptions
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create New Subscription Contract
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Start from a pre-configured sales quotation template or build a customized recurring plan from scratch.
        </p>
      </div>

      <SubscriptionCreateForm
        customers={customers}
        plans={plans}
        products={products}
        templates={formattedTemplates}
        defaultTaxRate={defaultTaxRule?.percentageRate || 18.0}
      />
    </div>
  );
}
