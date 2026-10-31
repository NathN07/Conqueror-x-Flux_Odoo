import type { FC } from 'react';
import { RouteItem, SidebarEntry } from '../types/navigation';

const DashboardOverviewPage: FC = () => {
  const kpis = [
    { label: 'Active Subscriptions', value: '142', change: '+12% this mo', isPositive: true },
    { label: 'Monthly Recurring Revenue (MRR)', value: '$24,500.00', change: '+8.4%', isPositive: true },
    { label: 'Annual Run Rate (ARR)', value: '$294,000.00', change: '+15.2%', isPositive: true },
    { label: 'Pending Invoices', value: '3', change: '$4,500.00 due', isPositive: false },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard & Operations</h1>
        <p className="text-sm text-slate-500">Brightloop Subscription Management System Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</span>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <span className={`text-xs font-medium ${kpi.isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
              {kpi.change}
            </span>
          </div>
        ))}
      </div>

      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        System Overview & Telemetry Widget
      </div>
    </div>
  );
};

const ReportsPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Financial Reports & Churn</h1>
      <p className="text-sm text-slate-500">Tax compliance statements, recurring billing cycles, and retention</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Reports analytics stub view
      </div>
    </div>
  );
};

export const dashboardRoutes: RouteItem[] = [
  {
    path: '/dashboard',
    element: <DashboardOverviewPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    path: '/reports',
    element: <ReportsPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
];

export const dashboardSidebarEntries: SidebarEntry[] = [
  {
    id: 'dashboard-overview',
    title: 'Dashboard',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'General',
  },
  {
    id: 'dashboard-reports',
    title: 'Financial Reports',
    path: '/reports',
    iconName: 'BarChart3',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'General',
  },
];
