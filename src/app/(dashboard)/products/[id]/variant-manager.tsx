"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProductVariantAction,
  deleteProductVariantAction,
} from "@/actions/product.actions";
import { Button } from "@/components/ui/button";
import { formatPaiseToInr } from "@/lib/money";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Tag,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface Variant {
  id: string;
  name: string;
  sku?: string | null;
  priceSurcharge: number; // in paise
  isActive: boolean;
}

interface VariantManagerProps {
  productId: string;
  variants: Variant[];
  isReadOnly?: boolean;
}

export function VariantManager({
  productId,
  variants,
  isReadOnly = false,
}: VariantManagerProps) {
  const router = useRouter();

  // Variant input fields: attribute + value or direct name
  const [attribute, setAttribute] = useState("");
  const [value, setValue] = useState("");
  const [sku, setSku] = useState("");
  const [surchargeInInr, setSurchargeInInr] = useState("0");

  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setError(null);
    setFieldErrors({});

    const formattedName =
      attribute.trim() && value.trim()
        ? `${attribute.trim()}: ${value.trim()}`
        : value.trim() || attribute.trim();

    if (!formattedName) {
      setError("Please provide a variant attribute and value (e.g. Brand: Odoo).");
      return;
    }

    const surchargeNum = parseFloat(surchargeInInr);
    if (isNaN(surchargeNum) || surchargeNum < 0) {
      setError("Price surcharge must be a non-negative number.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await createProductVariantAction(productId, {
        name: formattedName,
        sku: sku.trim() || null,
        priceSurchargeInInr: surchargeNum,
      });

      if (!res.success) {
        setError(res.error || "Failed to create variant.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      } else {
        // Reset form
        setAttribute("");
        setValue("");
        setSku("");
        setSurchargeInInr("0");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add variant.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (isReadOnly || !confirm("Are you sure you want to remove this variant?")) {
      return;
    }

    setDeletingId(variantId);
    setError(null);

    try {
      const res = await deleteProductVariantAction(productId, variantId);
      if (!res.success) {
        setError(res.error || "Failed to delete variant.");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete variant.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Product Variants & Surcharges
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Define attributes like Brand, Edition, or User Tier with optional price surcharges.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Variant Form (ADMIN only) */}
      {!isReadOnly && (
        <form
          onSubmit={handleAddVariant}
          className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Add New Variant
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Attribute (e.g. Brand / Tier)
              </label>
              <input
                type="text"
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
                placeholder="Brand"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Value (e.g. Odoo / Enterprise) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Odoo"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                SKU / Code (Optional)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="ODOO-BRAND-01"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Price Surcharge (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={surchargeInInr}
                  onChange={(e) => setSurchargeInInr(e.target.value)}
                  placeholder="560"
                  className="w-full rounded-md border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500">
              Preview:{" "}
              <span className="font-semibold text-slate-700">
                {attribute && value
                  ? `${attribute}: ${value}`
                  : value || "Brand: Odoo"}{" "}
                (+₹{surchargeInInr || 0})
              </span>
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add Variant
            </Button>
          </div>
        </form>
      )}

      {/* Existing Variants Table */}
      {variants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          No variants defined for this product yet. By default, the base product sales price will apply.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Variant Name</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Price Surcharge</th>
                <th className="px-4 py-2.5">Status</th>
                {!isReadOnly && <th className="px-4 py-2.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {variants.map((variant) => (
                <tr key={variant.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    {variant.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {variant.sku || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-emerald-700">
                    +{formatPaiseToInr(variant.priceSurcharge)}
                  </td>
                  <td className="px-4 py-2.5">
                    {variant.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </td>
                  {!isReadOnly && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === variant.id}
                        onClick={() => handleDeleteVariant(variant.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                      >
                        {deletingId === variant.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
