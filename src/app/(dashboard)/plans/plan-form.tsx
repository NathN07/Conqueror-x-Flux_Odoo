"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillingFrequency } from "@prisma/client";
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  togglePlanStatusAction,
} from "@/actions/plan.actions";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Save, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PlanFormProps {
  initialData?: {
    id: string;
    name: string;
    billingFrequency: BillingFrequency;
    priceInInr: number;
    minQuantity: number;
    startDate?: string | null;
    endDate?: string | null;
    autoCloseOnEnd: boolean;
    allowEarlyClose: boolean;
    allowPause: boolean;
    allowRenewal: boolean;
    isActive: boolean;
  };
  isReadOnly?: boolean;
}

export function PlanForm({ initialData, isReadOnly = false }: PlanFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || "");
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(
    initialData?.billingFrequency || BillingFrequency.MONTHLY
  );
  const [priceInInr, setPriceInInr] = useState<string>(
    initialData ? String(initialData.priceInInr) : ""
  );
  const [minQuantity, setMinQuantity] = useState<string>(
    initialData ? String(initialData.minQuantity) : "1"
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? initialData.startDate.slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? initialData.endDate.slice(0, 10) : ""
  );

  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState(
    initialData ? initialData.autoCloseOnEnd : false
  );
  const [allowEarlyClose, setAllowEarlyClose] = useState(
    initialData ? initialData.allowEarlyClose : true
  );
  const [allowPause, setAllowPause] = useState(
    initialData ? initialData.allowPause : true
  );
  const [allowRenewal, setAllowRenewal] = useState(
    initialData ? initialData.allowRenewal : true
  );
  const [isActive, setIsActive] = useState(
    initialData ? initialData.isActive : true
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setErrorMessage(null);
    setFieldErrors({});

    const numericPrice = parseFloat(priceInInr);
    const numericMinQty = parseInt(minQuantity, 10);

    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMessage("Please enter a valid non-negative base price.");
      return;
    }

    if (isNaN(numericMinQty) || numericMinQty < 1) {
      setErrorMessage("Minimum quantity must be at least 1.");
      return;
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setErrorMessage("End date must be strictly after the start date.");
      setFieldErrors({ endDate: ["End date must be after the start date"] });
      return;
    }

    setIsLoading(true);

    const payload = {
      name,
      billingFrequency,
      priceInInr: numericPrice,
      minQuantity: numericMinQty,
      startDate: startDate || null,
      endDate: endDate || null,
      autoCloseOnEnd,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      isActive,
    };

    try {
      if (isEditing && initialData) {
        const res = await updatePlanAction(initialData.id, payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update plan.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push("/plans");
          router.refresh();
        }
      } else {
        const res = await createPlanAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create plan.");
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          router.push("/plans");
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
    if (!initialData?.id || !confirm("Are you sure you want to delete this billing plan?")) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await deletePlanAction(initialData.id);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete plan.");
      } else {
        router.push("/plans");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete plan.");
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
            <div className="text-sm">
              <p className="font-semibold">Error</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Plan Details & Recurrence
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Plan Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Plan Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Monthly Subscription, Annual Enterprise Tier"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Billing Frequency */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Billing Frequency <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={isReadOnly}
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            >
              <option value="DAILY">Daily (billed every 24 hours)</option>
              <option value="WEEKLY">Weekly (billed every 7 days)</option>
              <option value="MONTHLY">Monthly (billed every calendar month)</option>
              <option value="YEARLY">Yearly (billed annually)</option>
            </select>
          </div>

          {/* Base Price (INR) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Base Price (₹ INR) <span className="text-rose-500">*</span>
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
                value={priceInInr}
                onChange={(e) => setPriceInInr(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 pl-7 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>
            {fieldErrors.priceInInr && (
              <p className="text-xs text-rose-600">{fieldErrors.priceInInr[0]}</p>
            )}
          </div>

          {/* Min Quantity */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Minimum Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              disabled={isReadOnly}
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            />
            <p className="text-xs text-slate-400">
              Orders and quotations with fewer seats or units will be blocked.
            </p>
            {fieldErrors.minQuantity && (
              <p className="text-xs text-rose-600">{fieldErrors.minQuantity[0]}</p>
            )}
          </div>

          {/* Active status */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Plan is Active and assignable
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Dates */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Plan Availability Dates (UTC)
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Available From (Start Date)
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Available To (End Date)
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
            />
            {fieldErrors.endDate && (
              <p className="text-xs text-rose-600">{fieldErrors.endDate[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle Rules & Toggles */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Lifecycle Policies & Controls
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={allowPause}
              onChange={(e) => setAllowPause(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Allow Subscription Pause
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Customers and staff can pause and unpause recurring billing cycles.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={allowRenewal}
              onChange={(e) => setAllowRenewal(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Allow Renewal
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Subscriptions can be renewed upon term expiration.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={allowEarlyClose}
              onChange={(e) => setAllowEarlyClose(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Allow Early Termination
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Subscribers can terminate their subscription before the cycle end date.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={autoCloseOnEnd}
              onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Auto-Close on End Date
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Automatically transitions subscriptions to CLOSED when end date is reached.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/plans">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
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
                Delete Plan
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
              {isEditing ? "Save Plan" : "Create Plan"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
