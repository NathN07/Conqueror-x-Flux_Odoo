"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  toggleProductArchiveAction,
} from "@/actions/product.actions";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Save, Trash2, Archive, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductFormProps {
  initialData?: {
    id: string;
    name: string;
    type: string;
    salesPriceInInr: number;
    costPriceInInr: number;
    notes?: string | null;
    isActive: boolean;
  };
  isReadOnly?: boolean;
}

export function ProductForm({ initialData, isReadOnly = false }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "SOFTWARE");
  const [salesPrice, setSalesPrice] = useState<string>(
    initialData ? String(initialData.salesPriceInInr) : ""
  );
  const [costPrice, setCostPrice] = useState<string>(
    initialData ? String(initialData.costPriceInInr) : "0"
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canArchivePrompt, setCanArchivePrompt] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setErrorMessage(null);
    setFieldErrors({});
    setIsLoading(true);

    const numericSalesPrice = parseFloat(salesPrice);
    const numericCostPrice = parseFloat(costPrice || "0");

    const payload = {
      name,
      type,
      salesPriceInInr: isNaN(numericSalesPrice) ? 0 : numericSalesPrice,
      costPriceInInr: isNaN(numericCostPrice) ? 0 : numericCostPrice,
      notes: notes || null,
      isActive,
    };

    try {
      if (isEditing && initialData) {
        const res = await updateProductAction(initialData.id, payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update product.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push("/products");
          router.refresh();
        }
      } else {
        const res = await createProductAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create product.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else if (res.data) {
          router.push(`/products/${res.data.id}`);
          router.refresh();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await deleteProductAction(initialData.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete product.");
        if (res.canArchive) {
          setCanArchivePrompt(true);
        }
      } else {
        router.push("/products");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete product.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!initialData?.id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await toggleProductArchiveAction(initialData.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to archive product.");
      } else {
        setIsActive(res.data?.isActive ?? false);
        setCanArchivePrompt(false);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to archive product.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Action Blocked</p>
              <p className="mt-1">{errorMessage}</p>
              {canArchivePrompt && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={handleArchive}
                    variant="outline"
                    className="border-rose-300 text-rose-800 hover:bg-rose-100 flex items-center gap-1.5"
                  >
                    <Archive className="h-4 w-4" />
                    Archive Product Instead
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          General Information
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Product Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Cloud ERP, Brightloop Pro Suite"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Product Type */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Product Type <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={isReadOnly}
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="SOFTWARE">SOFTWARE (SaaS / License)</option>
              <option value="SERVICE">SERVICE (Consulting / Maintenance)</option>
              <option value="HARDWARE">HARDWARE (Device / Appliance)</option>
              <option value="SUBSCRIPTION">SUBSCRIPTION (Recurring Package)</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Availability Status
            </label>
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Active (available for new quotes & subscriptions)
                </span>
              </label>
            </div>
          </div>

          {/* Sales Price (INR) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Sales Price (₹ INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isReadOnly}
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 pl-7 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Stored as integer paise in the database.
            </p>
            {fieldErrors.salesPriceInInr && (
              <p className="text-xs text-rose-600">{fieldErrors.salesPriceInInr[0]}</p>
            )}
          </div>

          {/* Cost Price (INR) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Cost Price (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={isReadOnly}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 pl-7 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            {fieldErrors.costPriceInInr && (
              <p className="text-xs text-rose-600">{fieldErrors.costPriceInInr[0]}</p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Internal Description & Notes
            </label>
            <textarea
              rows={3}
              disabled={isReadOnly}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add product specifications, target audience, or licensing notes..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/products">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>

        {!isReadOnly && (
          <div className="flex items-center gap-3">
            {isEditing && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete Product
              </Button>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
