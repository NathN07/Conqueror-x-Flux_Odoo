import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatUtcDate } from "@/lib/dates";
import { ChangePasswordForm } from "./change-password-form";
import { User, ShieldCheck, Mail, Calendar, KeyRound } from "lucide-react";

export default async function CustomerProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Profile & Security
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal customer profile details and update your login password.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Customer Details</h2>
              <p className="text-xs text-slate-500">
                Registered account credentials and identity.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Name / Organization
              </label>
              <p className="font-medium text-slate-900 mt-1 text-base">
                {user.name}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <p className="font-mono text-slate-700 mt-1 text-sm">
                {user.email}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Access Level
              </label>
              <span className="inline-block mt-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                {user.role} (Direct Customer Portal Access)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Registered On (UTC)
              </label>
              <p className="text-slate-700 mt-1 text-xs">
                {formatUtcDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">
                Set a strong password for your Brightloop portal login.
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
