"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiscountType, DiscountAppliesTo } from "@prisma/client";
import {
  createDiscountAction,
  updateDiscountAction,
  toggleDiscountStatusAction,
  deleteDiscountAction,
} from "@/actions/discount.actions";
import { Button } from "@/components/ui/button";
import { formatPaiseToInr } from "@/lib/money";
import { formatUtcDate } from "@/lib/dates";
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Percent,
} from "lucide-react";

export interface DiscountItem {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  appliesTo: DiscountAppliesTo;
  value: number; // if PERCENTAGE: %, if FIXED: paise
  minAmount: number; // paise
  minQuantity: number;
  maxUses: number | null;
  usedCount: number;
  startDate: Date | null;
  endDate: Date | null;
  productId: string | null;
  product?: { id: string; name: string } | null;
  isActive: boolean;
}

interface ProductOption {
  id: string;
  name: string;
}

interface DiscountManagerProps {
  discounts: DiscountItem[];
  availableProducts: ProductOption[];
}

export function DiscountManager({
  discounts,
  availableProducts,
}: DiscountManagerProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [appliesTo, setAppliesTo] = useState<DiscountAppliesTo>(DiscountAppliesTo.SUBSCRIPTION);
  const [value, setValue] = useState("");
  const [minAmountInInr, setMinAmountInInr] = useState("0");
  const [minQuantity, setMinQuantity] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productId, setProductId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const openCreateModal = () => {
    setEditingDiscount(null);
    setCode("");
    setName("");
    setType(DiscountType.PERCENTAGE);
    setAppliesTo(DiscountAppliesTo.SUBSCRIPTION);
    setValue("");
    setMinAmountInInr("0");
    setMinQuantity("0");
    setMaxUses("");
    setStartDate("");
    setEndDate("");
    setProductId(availableProducts[0]?.id || "");
    setIsActive(true);
    setError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (discount: DiscountItem) => {
    setEditingDiscount(discount);
    setCode(discount.code);
    setName(discount.name);
    setType(discount.type);
    setAppliesTo(discount.appliesTo);
    // If FIXED, stored value is in paise -> convert to INR string
    setValue(
      discount.type === DiscountType.FIXED
        ? String(discount.value / 100)
        : String(discount.value)
    );
    setMinAmountInInr(String(discount.minAmount / 100));
    setMinQuantity(String(discount.minQuantity));
    setMaxUses(discount.maxUses ? String(discount.maxUses) : "");
    setStartDate(discount.startDate ? new Date(discount.startDate).toISOString().slice(0, 10) : "");
    setEndDate(discount.endDate ? new Date(discount.endDate).toISOString().slice(0, 10) : "");
    setProductId(discount.productId || availableProducts[0]?.id || "");
    setIsActive(discount.isActive);
    setError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setError("Please enter a valid positive discount value.");
      return;
    }

    if (type === DiscountType.PERCENTAGE && (numericValue < 1 || numericValue > 100)) {
      setError("Percentage discount must be between 1% and 100%.");
      setFieldErrors({ value: ["Must be between 1% and 100%"] });
      return;
    }

    if (appliesTo === DiscountAppliesTo.PRODUCT && !productId) {
      setError("Please choose a product for this discount rule.");
      setFieldErrors({ productId: ["Product is required"] });
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError("End date must be on or after start date.");
      setFieldErrors({ endDate: ["End date must be on or after start date"] });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        appliesTo,
        value: numericValue,
        minAmountInInr: parseFloat(minAmountInInr || "0"),
        minQuantity: parseInt(minQuantity || "0", 10),
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        productId: appliesTo === DiscountAppliesTo.PRODUCT ? productId : null,
        isActive,
      };

      if (editingDiscount) {
        const res = await updateDiscountAction(editingDiscount.id, payload);
        if (!res.success) {
          setError(res.error || "Failed to update discount rule.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setIsModalOpen(false);
          router.refresh();
        }
      } else {
        const res = await createDiscountAction(payload);
        if (!res.success) {
          setError(res.error || "Failed to create discount rule.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setIsModalOpen(false);
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setActionInProgress(`toggle-${id}`);
    try {
      const res = await toggleDiscountStatusAction(id, !currentStatus);
      if (!res.success) {
        alert(res.error || "Failed to toggle status");
      } else {
        router.refresh();
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount coupon?")) return;

    setActionInProgress(`delete-${id}`);
    try {
      const res = await deleteDiscountAction(id);
      if (!res.success) {
        alert(res.error || "Failed to delete discount coupon");
      } else {
        router.refresh();
      }
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Discount Rule</span>
        </Button>
      </div>

      {/* Discount Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {discounts.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No discount rules found. Click "Create Discount Rule" to set up your first coupon.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Code & Name</th>
                  <th className="px-6 py-3.5">Type & Value</th>
                  <th className="px-6 py-3.5">Applies To</th>
                  <th className="px-6 py-3.5">Restrictions</th>
                  <th className="px-6 py-3.5">Usage</th>
                  <th className="px-6 py-3.5">Validity Dates</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {discounts.map((discount) => {
                  const isBusy =
                    actionInProgress === `toggle-${discount.id}` ||
                    actionInProgress === `delete-${discount.id}`;

                  const isLimitReached =
                    discount.maxUses !== null && discount.usedCount >= discount.maxUses;

                  return (
                    <tr
                      key={discount.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-600" />
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {discount.code}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          {discount.name}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {discount.type === DiscountType.PERCENTAGE ? (
                          <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                            {discount.value}% OFF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                            {formatPaiseToInr(discount.value)} OFF
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {discount.appliesTo === DiscountAppliesTo.SUBSCRIPTION ? (
                          <span className="font-medium text-slate-700">
                            Entire Subscription
                          </span>
                        ) : (
                          <div>
                            <span className="text-purple-700 font-medium bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Specific Product
                            </span>
                            <div className="text-slate-500 mt-0.5 truncate max-w-[150px]">
                              {discount.product?.name || "Product"}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {discount.minAmount > 0 && (
                          <div>Min Spend: {formatPaiseToInr(discount.minAmount)}</div>
                        )}
                        {discount.minQuantity > 0 && (
                          <div>Min Qty: {discount.minQuantity}</div>
                        )}
                        {discount.minAmount === 0 && discount.minQuantity === 0 && (
                          <span className="text-slate-400">No minimums</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-slate-900">
                          {discount.usedCount}{" "}
                          <span className="text-slate-400">
                            / {discount.maxUses ?? "∞"} used
                          </span>
                        </div>
                        {isLimitReached && (
                          <span className="text-[10px] text-rose-600 font-semibold">
                            Limit reached
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {discount.startDate || discount.endDate ? (
                          <div>
                            {discount.startDate && (
                              <div>From: {formatUtcDate(discount.startDate)}</div>
                            )}
                            {discount.endDate && (
                              <div>To: {formatUtcDate(discount.endDate)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Indefinite</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(discount.id, discount.isActive)}
                          className="flex items-center gap-1.5 text-xs font-medium focus:outline-none"
                        >
                          {discount.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 transition">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-500 hover:bg-slate-200 transition">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => openEditModal(discount)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleDelete(discount.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingDiscount ? "Edit Discount Rule" : "Create Discount Rule"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Coupon Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER25, FESTIVE500"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {fieldErrors.code && (
                    <p className="text-rose-600 mt-1">{fieldErrors.code[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Kickoff Discount"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {fieldErrors.name && (
                    <p className="text-rose-600 mt-1">{fieldErrors.name[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Discount Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹ INR)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {type === "PERCENTAGE" ? "Percentage Rate (1-100%)" : "Amount (₹ INR)"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step={type === "PERCENTAGE" ? "1" : "0.01"}
                    min="1"
                    max={type === "PERCENTAGE" ? "100" : undefined}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === "PERCENTAGE" ? "15" : "500"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.value && (
                    <p className="text-rose-600 mt-1">{fieldErrors.value[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Scope (Applies To) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as DiscountAppliesTo)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="SUBSCRIPTION">Whole Subscription Subtotal</option>
                    <option value="PRODUCT">Specific Product Item</option>
                  </select>
                </div>

                {appliesTo === "PRODUCT" && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Target Product <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.productId && (
                      <p className="text-rose-600 mt-1">{fieldErrors.productId[0]}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Purchase (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minAmountInInr}
                    onChange={(e) => setMinAmountInInr(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Start Date (UTC)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    End Date (UTC)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  {fieldErrors.endDate && (
                    <p className="text-rose-600 mt-1">{fieldErrors.endDate[0]}</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">
                    Active (can be redeemed on new quotations and subscriptions)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingDiscount ? "Update Rule" : "Create Rule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
