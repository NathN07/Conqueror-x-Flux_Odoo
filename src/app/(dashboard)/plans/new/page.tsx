import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { PlanForm } from "../plan-form";
import { CalendarRange } from "lucide-react";

export default async function NewPlanPage() {
  await requireRole(Role.ADMIN);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Billing Plan
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Configure a new recurring subscription plan, recurrence schedule, and renewal terms.
        </p>
      </div>

      <PlanForm />
    </div>
  );
}
