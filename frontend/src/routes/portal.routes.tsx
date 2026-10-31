import type { FC } from 'react';
import { RouteItem, SidebarEntry } from '../types/navigation';
import { Table, Column } from '../components/Table';
import { StatusBadge } from '../components/StatusBadge';

const CustomerSubscriptionsPage: FC = () => {
  const dummyCustomerSubs = [
    {
      id: 'sub_1',
      number: 'SUB-2026-00001',
      plan: 'Growth Professional Monthly',
      nextBillingDate: '2026-11-01',
      status: 'ACTIVE',
    },
  ];

  const columns: Column<typeof dummyCustomerSubs[0]>[] = [
    { key: 'number', header: 'Subscription #' },
    { key: 'plan', header: 'Plan' },
    { key: 'nextBillingDate', header: 'Next Billing' },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Subscriptions</h1>
        <p className="text-sm text-slate-500">View and manage your active software subscriptions</p>
      </div>
      <Table
        columns={columns}
        data={dummyCustomerSubs}
        page={1}
        limit={10}
        total={1}
        onPageChange={() => {}}
      />
    </div>
  );
};

const CustomerInvoicesPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>
      <p className="text-sm text-slate-500">Download PDF receipts and view statement histories</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Customer invoices stub view
      </div>
    </div>
  );
};

const CustomerPaymentsPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
      <p className="text-sm text-slate-500">Receipts and verification records</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Customer payment history stub view
      </div>
    </div>
  );
};

export const portalRoutes: RouteItem[] = [
  {
    path: '/portal/subscriptions',
    element: <CustomerSubscriptionsPage />,
    allowedRoles: ['CUSTOMER'],
  },
  {
    path: '/portal/invoices',
    element: <CustomerInvoicesPage />,
    allowedRoles: ['CUSTOMER'],
  },
  {
    path: '/portal/payments',
    element: <CustomerPaymentsPage />,
    allowedRoles: ['CUSTOMER'],
  },
];

export const portalSidebarEntries: SidebarEntry[] = [
  {
    id: 'portal-subscriptions',
    title: 'My Subscriptions',
    path: '/portal/subscriptions',
    iconName: 'Sparkles',
    allowedRoles: ['CUSTOMER'],
    group: 'Customer Portal',
  },
  {
    id: 'portal-invoices',
    title: 'My Invoices',
    path: '/portal/invoices',
    iconName: 'Receipt',
    allowedRoles: ['CUSTOMER'],
    group: 'Customer Portal',
  },
  {
    id: 'portal-payments',
    title: 'Payment History',
    path: '/portal/payments',
    iconName: 'Clock',
    allowedRoles: ['CUSTOMER'],
    group: 'Customer Portal',
  },
];
