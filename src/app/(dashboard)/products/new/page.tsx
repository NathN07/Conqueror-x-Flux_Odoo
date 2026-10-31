import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ProductForm } from "../product-form";
import { Package } from "lucide-react";

export default async function NewProductPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create New Product
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Add a new recurring software license, support service, or hardware product to the catalog.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
