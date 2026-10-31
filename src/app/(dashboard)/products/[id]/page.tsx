import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { ProductForm } from "../product-form";
import { VariantManager } from "./variant-manager";
import { Package } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);
  const isAdmin = user.role === Role.ADMIN;

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Convert paise to INR for the form inputs
  const initialData = {
    id: product.id,
    name: product.name,
    type: product.type,
    salesPriceInInr: product.salesPrice / 100,
    costPriceInInr: product.costPrice / 100,
    notes: product.notes,
    isActive: product.isActive,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? `Edit Product: ${product.name}` : `Product Details: ${product.name}`}
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Update pricing, specifications, and manage product variants."
            : "View product specifications and available variants (Staff Read-Only)."}
        </p>
      </div>

      {/* Main product attributes form */}
      <ProductForm initialData={initialData} isReadOnly={!isAdmin} />

      {/* Variants Manager */}
      <VariantManager
        productId={product.id}
        variants={product.variants}
        isReadOnly={!isAdmin}
      />
    </div>
  );
}
