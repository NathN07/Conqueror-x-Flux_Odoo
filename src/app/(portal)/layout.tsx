import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalNavbar } from "@/components/portal/portal-navbar";

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PortalNavbar user={{ name: user.name, email: user.email }} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 Brightloop Software. All rights reserved. Customer Self-Service Portal.</p>
      </footer>
    </div>
  );
}
