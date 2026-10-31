import type { FC } from 'react';
import { RouteItem, SidebarEntry } from '../types/navigation';
import { Table, Column } from '../components/Table';
import { StatusBadge } from '../components/StatusBadge';

const InvoicesPage: FC = () => {
  const dummyInvoices = [
    {
      id: 'inv_1',
      number: 'INV-2026-00001',
      customer: 'Acme Corporation',
      period: 'Oct 01 - Oct 31, 2026',
      total: '$1,500.00',
      status: 'PAID',
    },
    {
      id: 'inv_2',
      number: 'INV-2026-00002',
      customer: 'Globex Industries',
      period: 'Oct 01 - Oct 31, 2026',
      total: '$15,000.00',
      status: 'CONFIRMED',
    },
  ];

  const columns: Column<typeof dummyInvoices[0]>[] = [
    { key: 'number', header: 'Invoice #' },
    { key: 'customer', header: 'Customer' },
    { key: 'period', header: 'Billing Period' },
    { key: 'total', header: 'Total Amount' },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices & Billing</h1>
          <p className="text-sm text-slate-500">Track recurring cycle billings, status, and PDF generation</p>
        </div>
      </div>
      <Table
        columns={columns}
        data={dummyInvoices}
        page={1}
        limit={10}
        total={2}
        onPageChange={() => {}}
      />
    </div>
  );
};

const PaymentsPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Recorded Payments</h1>
      <p className="text-sm text-slate-500">Transactions processed via UPI, Card, Net Banking, and Bank Transfer</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Payments history stub view
      </div>
    </div>
  );
};

export const paymentsRoutes: RouteItem[] = [
  {
    path: '/invoices',
    element: <InvoicesPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    path: '/payments',
    element: <PaymentsPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
];

export const paymentsSidebarEntries: SidebarEntry[] = [
  {
    id: 'payments-invoices',
    title: 'Invoices',
    path: '/invoices',
    iconName: 'FileText',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'Billing',
  },
  {
    id: 'payments-records',
    title: 'Payments',
    path: '/payments',
    iconName: 'CreditCard',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'Billing',
  },
];
