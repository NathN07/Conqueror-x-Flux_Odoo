"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Receipt,
  CreditCard,
  Package,
  CalendarRange,
  Percent,
  Calculator,
  Users,
  ShieldCheck,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
    icon: Layers,
  },
  {
    title: "Quotations",
    href: "/quotes",
    icon: FileText,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
];

const catalogNavItems: NavItem[] = [
  {
    title: "Products & Variants",
    href: "/products",
    icon: Package,
  },
  {
    title: "Billing Plans",
    href: "/plans",
    icon: CalendarRange,
  },
  {
    title: "Discounts & Promos",
    href: "/discounts",
    icon: Percent,
  },
  {
    title: "Tax Rules",
    href: "/taxes",
    icon: Calculator,
  },
];

const managementNavItems: NavItem[] = [
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Staff Members",
    href: "/staff",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <span className="font-semibold tracking-tight text-white">Brightloop</span>
          <span className="block text-xs text-slate-400">Subscription Platform</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Operations
          </p>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-blue-200" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Catalog & Rules
          </p>
          <nav className="space-y-1">
            {catalogNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-blue-200" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Management
          </p>
          <nav className="space-y-1">
            {managementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  {item.adminOnly && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      ADMIN
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User / Session Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Admin User</p>
            <p className="truncate text-xs text-slate-400">admin@brightloop.com</p>
          </div>
          <span className="rounded bg-blue-900/60 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            ADMIN
          </span>
        </div>
      </div>
    </aside>
  );
}
