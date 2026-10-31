import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { Layers, Receipt, ShieldCheck, CheckCircle2, Clock } from "lucide-react";

export default async function CustomerPortalPage() {
  const user = await requireRole(Role.CUSTOMER);

  // Fetch only this customer's subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: user.id },
    include: {
      plan: true,
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch customer's invoices
  const invoices = await prisma.invoice.findMany({
    where: { customerId: user.id },
    orderBy: { issuedDate: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your subscriptions, view active service lines, and inspect billing statements.
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              My Subscriptions
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {subscriptions.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active & recurring contracts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Invoices</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {invoices.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Issued payment statements</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Account Type</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">Direct Customer</p>
          <p className="mt-1 text-xs text-slate-500">{user.email}</p>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">My Subscriptions</h2>
          <p className="text-xs text-slate-500">
            Below are your personal subscriptions and associated product plans.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Layers className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium">No subscriptions yet</p>
            <p className="text-xs">Your active subscriptions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {sub.subscriptionNumber}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        sub.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : sub.status === "PAUSED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Plan: {sub.plan.name} ({sub.plan.billingFrequency})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sub.lines.map((line) => (
                      <span
                        key={line.id}
                        className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {line.product.name}
                        {line.variant && ` (${line.variant.name})`} × {line.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 sm:mt-0 text-left sm:text-right">
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(sub.startDate).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </p>
                  {sub.nextBillingDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Next Renewal:{" "}
                      {new Date(sub.nextBillingDate).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
