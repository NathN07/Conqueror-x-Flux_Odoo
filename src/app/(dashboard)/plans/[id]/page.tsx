import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { PlanForm } from "../plan-form";
import { CalendarRange } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PlanDetailPage({ params }: PageProps) {
  const user = await requireRole(Role.ADMIN, Role.STAFF);
  const isAdmin = user.role === Role.ADMIN;

  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
  });

  if (!plan) {
    notFound();
  }

  const initialData = {
    id: plan.id,
    name: plan.name,
    billingFrequency: plan.billingFrequency,
    priceInInr: plan.basePrice / 100,
    minQuantity: plan.minQuantity,
    startDate: plan.startDate ? plan.startDate.toISOString() : null,
    endDate: plan.endDate ? plan.endDate.toISOString() : null,
    autoCloseOnEnd: plan.autoCloseOnEnd,
    allowEarlyClose: plan.allowEarlyClose,
    allowPause: plan.allowPause,
    allowRenewal: plan.allowRenewal,
    isActive: plan.isActive,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? `Edit Plan: ${plan.name}` : `Plan Details: ${plan.name}`}
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Modify recurrence frequency, base price, and cancellation rules."
            : "View plan pricing and policy details (Staff Read-Only)."}
        </p>
      </div>

      <PlanForm initialData={initialData} isReadOnly={!isAdmin} />
    </div>
  );
}
