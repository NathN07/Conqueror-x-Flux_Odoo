import { useMemo, FC, ReactNode } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { UserRole } from '../types/auth';
import { RouteItem, SidebarEntry } from '../types/navigation';
import { catalogRoutes, catalogSidebarEntries } from './catalog.routes';
import { paymentsRoutes, paymentsSidebarEntries } from './payments.routes';
import { portalRoutes, portalSidebarEntries } from './portal.routes';
import { dashboardRoutes, dashboardSidebarEntries } from './dashboard.routes';

// Combined application routes
export const allAppRoutes: RouteItem[] = [
  ...dashboardRoutes,
  ...catalogRoutes,
  ...paymentsRoutes,
  ...portalRoutes,
];

// Combined sidebar entries
export const allSidebarEntries: SidebarEntry[] = [
  ...dashboardSidebarEntries,
  ...catalogSidebarEntries,
  ...paymentsSidebarEntries,
  ...portalSidebarEntries,
];

// Main App Layout with Role-based Sidebar
export const AppLayout: FC<{
  currentRole?: UserRole;
  children?: ReactNode;
}> = ({ currentRole = 'ADMIN', children }) => {
  const location = useLocation();

  // Filter sidebar entries by allowed role
  const visibleSidebarEntries = useMemo(() => {
    return allSidebarEntries.filter((entry) => entry.allowedRoles.includes(currentRole));
  }, [currentRole]);

  // Group sidebar entries
  const groupedEntries = useMemo(() => {
    const groups: Record<string, SidebarEntry[]> = {};
    visibleSidebarEntries.forEach((entry) => {
      const groupName = entry.group || 'General';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(entry);
    });
    return groups;
  }, [visibleSidebarEntries]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white shadow-md">
              BL
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-tight">Brightloop</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Subscriptions</span>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono font-medium border border-slate-700">
            {currentRole}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(groupedEntries).map(([groupName, items]) => (
            <div key={groupName} className="space-y-1.5">
              <span className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                {groupName}
              </span>
              <ul className="space-y-1">
                {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.path}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          Brightloop Software v1.0.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600">
            Subscription Lifecycle & Billing Engine
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Current Role Mode:</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
              {currentRole}
            </span>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 bg-slate-50">{children}</div>
      </main>
    </div>
  );
};

// Route Switcher
export const AppRoutes: FC<{ userRole?: UserRole }> = ({ userRole = 'ADMIN' }) => {
  const defaultPath = userRole === 'CUSTOMER' ? '/portal/subscriptions' : '/dashboard';

  return (
    <AppLayout currentRole={userRole}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        {allAppRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.allowedRoles.includes(userRole) ? (
                route.element
              ) : (
                <div className="p-8 text-center text-rose-600 font-medium">
                  Access Denied: Your role ({userRole}) does not have permission to view this page.
                </div>
              )
            }
          />
        ))}
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-slate-500 font-medium">
              404: Page not found.
            </div>
          }
        />
      </Routes>
    </AppLayout>
  );
};

export default AppRoutes;
