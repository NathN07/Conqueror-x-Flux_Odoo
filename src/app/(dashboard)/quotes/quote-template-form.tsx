"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "@/actions/quote.actions";
import { Button } from "@/components/ui/button";
import { formatPaiseToInr } from "@/lib/money";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface ProductVariantOption {
  id: string;
  name: string;
  priceSurcharge: number; // in paise
}

interface ProductOption {
  id: string;
  name: string;
  salesPrice: number; // in paise
  variants: ProductVariantOption[];
}

interface PlanOption {
  id: string;
  name: string;
  billingFrequency: string;
  basePrice: number; // in paise
  minQuantity: number;
}

interface TemplateLineState {
  productId: string;
  variantId: string;
  quantity: number;
}

interface QuoteTemplateFormProps {
  initialData?: {
    id: string;
    name: string;
    planId: string;
    validityDays: number;
    terms?: string | null;
    isActive: boolean;
    lines: TemplateLineState[];
  };
  plans: PlanOption[];
  products: ProductOption[];
}

export function QuoteTemplateForm({
  initialData,
  plans,
  products,
}: QuoteTemplateFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || "");
  const [planId, setPlanId] = useState(initialData?.planId || plans[0]?.id || "");
  const [validityDays, setValidityDays] = useState(
    initialData ? String(initialData.validityDays) : "30"
  );
  const [terms, setTerms] = useState(initialData?.terms || "");
  const [isActive, setIsActive] = useState(
    initialData ? initialData.isActive : true
  );

  // Line items state
  const [lines, setLines] = useState<TemplateLineState[]>(
    initialData?.lines && initialData.lines.length > 0
      ? initialData.lines
      : products.length > 0
      ? [{ productId: products[0].id, variantId: "", quantity: 1 }]
      : []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleAddLine = () => {
    if (products.length === 0) return;
    setLines([
      ...lines,
      {
        productId: products[0].id,
        variantId: "",
        quantity: 1,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      alert("A quotation template must include at least one product line.");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const next = [...lines];
    next[index].productId = newProductId;
    next[index].variantId = ""; // Reset variant when product changes
    setLines(next);
  };

  const handleVariantChange = (index: number, newVariantId: string) => {
    const next = [...lines];
    next[index].variantId = newVariantId;
    setLines(next);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const next = [...lines];
    next[index].quantity = Math.max(1, qty);
    setLines(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!name.trim()) {
      setErrorMessage("Please enter a template name.");
      return;
    }

    if (!planId) {
      setErrorMessage("Please select an assigned billing plan.");
      return;
    }

    const validity = parseInt(validityDays, 10);
    if (isNaN(validity) || validity < 1) {
      setErrorMessage("Validity days must be at least 1 day.");
      return;
    }

    if (lines.length === 0) {
      setErrorMessage("Please add at least one product line to the template.");
      return;
    }

    // Check plan minQuantity
    const selectedPlan = plans.find((p) => p.id === planId);
    const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
    if (selectedPlan && totalQty < selectedPlan.minQuantity) {
      setErrorMessage(
        `Total quantity of products (${totalQty}) is less than the plan minimum (${selectedPlan.minQuantity}).`
      );
      return;
    }

    setIsLoading(true);

    const payload = {
      name: name.trim(),
      planId,
      validityDays: validity,
      terms: terms.trim() || null,
      isActive,
      lines: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId || null,
        quantity: l.quantity,
      })),
    };

    try {
      if (isEditing && initialData) {
        const res = await updateTemplateAction(initialData.id, payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update quotation template.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push("/quotes");
          router.refresh();
        }
      } else {
        const res = await createTemplateAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create quotation template.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push("/quotes");
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
    if (!initialData?.id || !confirm("Are you sure you want to delete this quotation template?")) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await deleteTemplateAction(initialData.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete template.");
      } else {
        router.push("/quotes");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete template.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total template value
  const totalTemplateValuePaise = lines.reduce((total, line) => {
    const prod = products.find((p) => p.id === line.productId);
    if (!prod) return total;
    let surcharge = 0;
    if (line.variantId) {
      const v = prod.variants.find((vr) => vr.id === line.variantId);
      if (v) surcharge = v.priceSurcharge;
    }
    return total + (prod.salesPrice + surcharge) * line.quantity;
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Error</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Template Details
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Template Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard SaaS Onboarding Package, Enterprise Annual Bundle"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Assigned Plan */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Assigned Billing Plan <span className="text-rose-500">*</span>
            </label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingFrequency} - {formatPaiseToInr(p.basePrice)} - min qty: {p.minQuantity})
                </option>
              ))}
            </select>
            {fieldErrors.planId && (
              <p className="text-xs text-rose-600">{fieldErrors.planId[0]}</p>
            )}
          </div>

          {/* Validity Days */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Quotation Expiration Validity (Days) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              placeholder="30"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400">
              Generated quotations will expire after this many days from issue.
            </p>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Terms, Conditions & Payment Notes
            </label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment due upon quotation acceptance. Net 15 days billing policy applies."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Active Status */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Active template (visible in Fast Track subscription generation)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Line Items Builder */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Pre-configured Products & Line Items
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These items will be automatically copied into new subscriptions created from this template.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddLine}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const product = products.find((p) => p.id === line.productId);
            const availableVariants = product?.variants || [];
            const selectedVariant = availableVariants.find(
              (v) => v.id === line.variantId
            );

            const unitPrice =
              (product?.salesPrice || 0) +
              (selectedVariant?.priceSurcharge || 0);

            const lineTotal = unitPrice * line.quantity;

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs"
              >
                {/* Product Dropdown */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Product
                  </label>
                  <select
                    value={line.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatPaiseToInr(p.salesPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant Dropdown */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Variant & Surcharge
                  </label>
                  <select
                    value={line.variantId}
                    onChange={(e) => handleVariantChange(index, e.target.value)}
                    disabled={availableVariants.length === 0}
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">No Variant (Base Price)</option>
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (+{formatPaiseToInr(v.priceSurcharge)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      handleQuantityChange(index, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Remove Line */}
                <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(index)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                    title="Remove Line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Line calculation summary row */}
                <div className="sm:col-span-12 flex justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-500">
                  <span>
                    Unit Price: {formatPaiseToInr(unitPrice)}
                  </span>
                  <span className="font-semibold text-slate-900">
                    Line Total: {formatPaiseToInr(lineTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Grand Total */}
        <div className="flex justify-between items-center bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-xs">
          <span className="font-semibold text-blue-900">
            Total Pre-configured Template Value (excl. tax):
          </span>
          <span className="text-sm font-bold text-blue-900">
            {formatPaiseToInr(totalTemplateValuePaise)}
          </span>
        </div>
      </div>

      {/* Footer / Submit Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/quotes">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
        </Link>

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
              Delete Template
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
            {isEditing ? "Save Template" : "Create Template"}
          </Button>
        </div>
      </div>
    </form>
  );
}
