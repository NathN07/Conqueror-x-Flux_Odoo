import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { CreateStaffDialog } from "./create-staff-dialog";
import { ShieldCheck, Mail, Calendar, UserPlus } from "lucide-react";

export default async function StaffManagementPage() {
  // Server-side RBAC guard (Admin only)
  await requireRole(Role.ADMIN);

  const staffMembers = await prisma.user.findMany({
    where: { role: Role.STAFF },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Staff Management
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              ADMIN ONLY
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage internal operational team members who run daily quotations, billing, and customer accounts.
          </p>
        </div>

        <CreateStaffDialog />
      </div>

      {/* Staff Directory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Active Staff Directory</h2>
          <p className="text-xs text-slate-500">
            Staff members have access to operational workflows, but cannot manage other staff, tax rules, or discounts.
          </p>
        </div>

        {staffMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium">No staff members found</p>
            <p className="text-xs">Click &quot;Add Staff Member&quot; to onboard your first team member.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {staffMembers.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{staff.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {staff.email}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added {new Date(staff.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    STAFF
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
