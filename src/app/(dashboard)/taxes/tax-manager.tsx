"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTaxAction,
  updateTaxAction,
  toggleTaxStatusAction,
  setDefaultTaxAction,
  deleteTaxAction,
} from "@/actions/tax.actions";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

export interface TaxRuleItem {
  id: string;
  name: string;
  percentageRate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface TaxManagerProps {
  taxes: TaxRuleItem[];
}

export function TaxManager({ taxes }: TaxManagerProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRuleItem | null>(null);

  const [name, setName] = useState("");
  const [percentageRate, setPercentageRate] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const openCreateModal = () => {
    setEditingTax(null);
    setName("");
    setPercentageRate("");
    setIsDefault(taxes.length === 0); // If first tax, default it
    setIsActive(true);
    setError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (tax: TaxRuleItem) => {
    setEditingTax(tax);
    setName(tax.name);
    setPercentageRate(String(tax.percentageRate));
    setIsDefault(tax.isDefault);
    setIsActive(tax.isActive);
    setError(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const rateNum = parseFloat(percentageRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setError("Tax rate percentage must be between 0 and 100.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name,
        percentageRate: rateNum,
        isDefault,
        isActive,
      };

      if (editingTax) {
        const res = await updateTaxAction(editingTax.id, payload);
        if (!res.success) {
          setError(res.error || "Failed to update tax rule.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setIsModalOpen(false);
          router.refresh();
        }
      } else {
        const res = await createTaxAction(payload);
        if (!res.success) {
          setError(res.error || "Failed to create tax rule.");
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

  const handleSetDefault = async (taxId: string) => {
    setActionInProgress(`default-${taxId}`);
    try {
      const res = await setDefaultTaxAction(taxId);
      if (!res.success) {
        alert(res.error || "Failed to set as default");
      } else {
        router.refresh();
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleActive = async (taxId: string, currentStatus: boolean) => {
    setActionInProgress(`toggle-${taxId}`);
    try {
      const res = await toggleTaxStatusAction(taxId, !currentStatus);
      if (!res.success) {
        alert(res.error || "Failed to toggle status");
      } else {
        router.refresh();
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (taxId: string) => {
    if (!confirm("Are you sure you want to delete this tax rule?")) return;

    setActionInProgress(`delete-${taxId}`);
    try {
      const res = await deleteTaxAction(taxId);
      if (!res.success) {
        alert(res.error || "Failed to delete tax rule");
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
          <span>Add Tax Rule</span>
        </Button>
      </div>

      {/* Tax Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {taxes.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No tax rules configured. Click "Add Tax Rule" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Tax Name</th>
                  <th className="px-6 py-3.5">Rate (%)</th>
                  <th className="px-6 py-3.5">Default System Tax</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {taxes.map((tax) => {
                  const isBusy =
                    actionInProgress === `default-${tax.id}` ||
                    actionInProgress === `toggle-${tax.id}` ||
                    actionInProgress === `delete-${tax.id}`;

                  return (
                    <tr key={tax.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {tax.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {tax.percentageRate}%
                      </td>
                      <td className="px-6 py-4">
                        {tax.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
                            Default Rule
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || !tax.isActive}
                            onClick={() => handleSetDefault(tax.id)}
                            className="text-xs text-slate-400 hover:text-blue-600 hover:underline disabled:opacity-30 flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Set as Default
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(tax.id, tax.isActive)}
                          className="flex items-center gap-1.5 text-xs font-medium focus:outline-none"
                        >
                          {tax.isActive ? (
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
                          onClick={() => openEditModal(tax)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {!tax.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleDelete(tax.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {editingTax ? "Edit Tax Rule" : "Add New Tax Rule"}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tax Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. GST 18%, VAT 5%, Zero Rated"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Percentage Rate (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={percentageRate}
                    onChange={(e) => setPercentageRate(e.target.value)}
                    placeholder="18.0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    %
                  </span>
                </div>
                {fieldErrors.percentageRate && (
                  <p className="text-xs text-rose-600 mt-1">
                    {fieldErrors.percentageRate[0]}
                  </p>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Set as system default tax rule (replaces existing default)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Active (applicable to newly generated invoices)
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
                  {editingTax ? "Update Tax Rule" : "Create Tax Rule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
