"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSubscriptionFromScratchAction,
  createSubscriptionFromTemplateAction,
} from "@/actions/subscription.actions";
import { formatPaiseToInr } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

interface PlanOption {
  id: string;
  name: string;
  billingFrequency: string;
  basePrice: number;
  minQuantity: number;
}

interface ProductVariantOption {
  id: string;
  name: string;
  priceSurcharge: number;
}

interface ProductOption {
  id: string;
  name: string;
  salesPrice: number;
  variants: ProductVariantOption[];
}

interface TemplateLineOption {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
}

interface TemplateOption {
  id: string;
  name: string;
  validityDays: number;
  terms: string | null;
  planId: string;
  planName: string;
  lines: TemplateLineOption[];
}

interface Props {
  customers: CustomerOption[];
  plans: PlanOption[];
  products: ProductOption[];
  templates: TemplateOption[];
  defaultTaxRate: number;
}

interface FormLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export function SubscriptionCreateForm({
  customers,
  plans,
  products,
  templates,
  defaultTaxRate,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"template" | "scratch">("template");
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Common Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id || ""
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentTerms, setPaymentTerms] = useState("Immediate");
  const [notes, setNotes] = useState("");

  // Template Mode Fields
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id || ""
  );

  // Scratch Mode Fields
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    {
      productId: products[0]?.id || "",
      variantId: products[0]?.variants[0]?.id || "",
      quantity: 1,
    },
  ]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Line helpers for scratch mode
  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const newLines = [...lines];
    newLines[index] = {
      productId: newProductId,
      variantId: prod?.variants[0]?.id || "",
      quantity: newLines[index].quantity,
    };
    setLines(newLines);
  };

  const handleVariantChange = (index: number, newVariantId: string) => {
    const newLines = [...lines];
    newLines[index].variantId = newVariantId;
    setLines(newLines);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newLines = [...lines];
    newLines[index].quantity = Math.max(1, qty);
    setLines(newLines);
  };

  const addLine = () => {
    const defaultProd = products[0];
    setLines([
      ...lines,
      {
        productId: defaultProd?.id || "",
        variantId: defaultProd?.variants[0]?.id || "",
        quantity: 1,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // Calculations for scratch mode
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  const calculatedLines = lines.map((l) => {
    const prod = products.find((p) => p.id === l.productId);
    const variant = prod?.variants.find((v) => v.id === l.variantId);
    const unitPrice = (prod?.salesPrice || 0) + (variant?.priceSurcharge || 0);
    const lineAmount = unitPrice * l.quantity;
    return {
      prod,
      variant,
      unitPrice,
      lineAmount,
    };
  });

  const subtotalPaise = calculatedLines.reduce(
    (sum, l) => sum + l.lineAmount,
    0
  );
  const taxPaise = Math.round((subtotalPaise * defaultTaxRate) / 100);
  const grandTotalPaise = subtotalPaise + taxPaise;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!selectedCustomerId) {
      setServerError("Please select a customer.");
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === "template") {
        if (!selectedTemplateId) {
          setServerError("Please select a quotation template.");
          setIsLoading(false);
          return;
        }

        const res = await createSubscriptionFromTemplateAction({
          templateId: selectedTemplateId,
          customerId: selectedCustomerId,
          startDate: new Date(startDate).toISOString(),
          paymentTerms,
          notes: notes || undefined,
        });

        if (!res.success) {
          setServerError(res.error || "Failed to create subscription.");
          return;
        }

        router.push(`/subscriptions/${res.data?.id}`);
      } else {
        // Scratch Mode
        if (selectedPlan && totalQuantity < selectedPlan.minQuantity) {
          setServerError(
            `Minimum quantity required for plan "${selectedPlan.name}" is ${selectedPlan.minQuantity}, but you have entered ${totalQuantity}.`
          );
          setIsLoading(false);
          return;
        }

        const res = await createSubscriptionFromScratchAction({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
          startDate: new Date(startDate).toISOString(),
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
          paymentTerms,
          notes: notes || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || null,
            quantity: l.quantity,
          })),
        });

        if (!res.success) {
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setServerError(res.error || "Failed to create subscription.");
          return;
        }

        router.push(`/subscriptions/${res.data?.id}`);
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("template")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "template"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          From Quotation Template (Fast Track)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scratch")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "scratch"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          Custom Contract (From Scratch)
        </button>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer & General Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900 border-b pb-3">
            1. Customer & Lifecycle Parameters
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Customer Account *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Start Date (UTC) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Immediate">Immediate / Due upon receipt</option>
                <option value="Net 15">Net 15 (15 days)</option>
                <option value="Net 30">Net 30 (30 days)</option>
                <option value="Net 60">Net 60 (60 days)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Internal Reference Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional billing or sales notes..."
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* METHOD A: From Template */}
        {activeTab === "template" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-base font-semibold text-slate-900 border-b pb-3">
              2. Select Quotation Template
            </h2>

            {templates.length === 0 ? (
              <p className="text-sm text-slate-500">
                No quotation templates found. Please create one or build from scratch.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Predefined Template *
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} — Plan: {tpl.planName} (Validity:{" "}
                        {tpl.validityDays} days)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        <strong>Assigned Plan:</strong> {selectedTemplate.planName}
                      </span>
                      <span>
                        <strong>Quotation Expiry:</strong> {selectedTemplate.validityDays} days from start date
                      </span>
                    </div>

                    <div className="border-t pt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Included Products in this Template:
                      </p>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {selectedTemplate.lines.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span>
                              {l.productName}{" "}
                              {l.variantName && `(${l.variantName})`} × {l.quantity}
                            </span>
                            <span className="font-medium text-slate-900">
                              {formatPaiseToInr(l.unitPrice * l.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* METHOD B: From Scratch */}
        {activeTab === "scratch" && (
          <div className="space-y-8">
            {/* Plan Config */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-base font-semibold text-slate-900 border-b pb-3">
                2. Plan & Schedule
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Billing Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.billingFrequency}) — Min Qty: {p.minQuantity}
                      </option>
                    ))}
                  </select>
                  {selectedPlan && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Info className="h-3.5 w-3.5 text-blue-600" />
                      Plan requires a minimum total quantity of{" "}
                      <strong>{selectedPlan.minQuantity}</strong>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    3. Subscription Lines & Pricing
                  </h2>
                  <p className="text-xs text-slate-500">
                    Unit price is automatically computed as product base sales price + variant surcharge.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Line Item
                </Button>
              </div>

              <div className="space-y-4">
                {lines.map((line, idx) => {
                  const prod = products.find((p) => p.id === line.productId);
                  const variant = prod?.variants.find(
                    (v) => v.id === line.variantId
                  );
                  const unitPrice =
                    (prod?.salesPrice || 0) + (variant?.priceSurcharge || 0);

                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-slate-200 p-4 bg-slate-50/50"
                    >
                      {/* Product Selector */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-600">
                          Product
                        </label>
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            handleProductChange(idx, e.target.value)
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatPaiseToInr(p.salesPrice)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant Selector */}
                      <div className="w-full sm:w-56">
                        <label className="block text-xs font-medium text-slate-600">
                          Variant / Brand
                        </label>
                        <select
                          value={line.variantId}
                          onChange={(e) =>
                            handleVariantChange(idx, e.target.value)
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                        >
                          {prod?.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}{" "}
                              {v.priceSurcharge > 0
                                ? `(+${formatPaiseToInr(v.priceSurcharge)})`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-24">
                        <label className="block text-xs font-medium text-slate-600">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              idx,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Unit Price & Total */}
                      <div className="w-32 text-right">
                        <label className="block text-xs font-medium text-slate-500">
                          Total
                        </label>
                        <p className="mt-1 font-semibold text-sm text-slate-900">
                          {formatPaiseToInr(unitPrice * line.quantity)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={lines.length <= 1}
                          onClick={() => removeLine(idx)}
                          className="text-slate-400 hover:text-red-600 h-8 w-8 mt-4 sm:mt-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary Card */}
              <div className="flex flex-col items-end gap-1.5 border-t pt-4 text-sm">
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Total Quantity:</span>
                  <span
                    className={`font-semibold ${
                      selectedPlan && totalQuantity < selectedPlan.minQuantity
                        ? "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {totalQuantity}{" "}
                    {selectedPlan && `(Min required: ${selectedPlan.minQuantity})`}
                  </span>
                </div>
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-900">
                    {formatPaiseToInr(subtotalPaise)}
                  </span>
                </div>
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Default Tax ({defaultTaxRate}%):</span>
                  <span className="font-medium text-slate-900">
                    {formatPaiseToInr(taxPaise)}
                  </span>
                </div>
                <div className="flex w-64 justify-between text-base font-bold text-slate-900 border-t pt-2 mt-1">
                  <span>Contract Value:</span>
                  <span className="text-blue-600">
                    {formatPaiseToInr(grandTotalPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/subscriptions")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="px-8">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating contract...
              </>
            ) : activeTab === "template" ? (
              "Generate from Template"
            ) : (
              "Create Draft Subscription"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
