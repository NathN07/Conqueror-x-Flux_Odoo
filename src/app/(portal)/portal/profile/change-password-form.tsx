"use client";

import { useState } from "react";
import { changePasswordAction } from "@/actions/auth.actions";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";

export function ChangePasswordForm() {
  const [formData, setFormData] = useState<ChangePasswordInput>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = changePasswordSchema.safeParse(formData);
    if (!validation.success) {
      setFieldErrors(validation.error.flatten().fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePasswordAction(formData);
      if (!res.success) {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setServerError(res.error || "Failed to change password.");
        return;
      }

      setSuccessMessage(
        res.data?.message || "Password updated successfully."
      );
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {serverError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Current Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700">
          Current Password *
        </label>
        <input
          type="password"
          required
          value={formData.currentPassword}
          onChange={(e) =>
            setFormData({ ...formData, currentPassword: e.target.value })
          }
          placeholder="•••••••••"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {fieldErrors.currentPassword && (
          <p className="mt-1 text-xs text-red-600">
            {fieldErrors.currentPassword[0]}
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700">
          New Password *
        </label>
        <input
          type="password"
          required
          value={formData.newPassword}
          onChange={(e) =>
            setFormData({ ...formData, newPassword: e.target.value })
          }
          placeholder="•••••••••"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Must be &gt; 8 characters, with 1 uppercase, 1 lowercase, and 1 special character.
        </p>
        {fieldErrors.newPassword?.map((err, idx) => (
          <p key={idx} className="mt-1 text-xs text-red-600">
            {err}
          </p>
        ))}
      </div>

      {/* Confirm New Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700">
          Confirm New Password *
        </label>
        <input
          type="password"
          required
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
          placeholder="•••••••••"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">
            {fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="mt-2">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-4 w-4" />
            Update Password
          </>
        )}
      </Button>
    </form>
  );
}
