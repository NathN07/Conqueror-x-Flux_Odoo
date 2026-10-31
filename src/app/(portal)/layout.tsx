import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Building2, LogOut, Layers, Receipt, Shield } from "lucide-react";
import { LogoutButton } from "@/components/shared/logout-button";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-slate-900">
                Brightloop
              </span>
              <span className="block text-[11px] font-medium text-blue-600 uppercase tracking-wider">
                Customer Portal
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link
              href="/portal"
              className="text-slate-700 hover:text-blue-600 transition"
            >
              My Overview
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            CUSTOMER
          </span>

          <LogoutButton variant="outline" size="sm" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
