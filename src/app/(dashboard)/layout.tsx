import { Sidebar } from "@/components/shared/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If unauthenticated, redirect to login
  if (!user) {
    redirect("/login");
  }

  // If customer visits internal dashboard, redirect to customer portal
  if (user.role === Role.CUSTOMER) {
    redirect("/portal");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <div className="pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800">
              {user.role === Role.ADMIN ? "Administration" : "Operations"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected as {user.role}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
