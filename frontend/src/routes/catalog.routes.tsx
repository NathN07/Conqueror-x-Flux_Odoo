import type { FC } from 'react';
import { RouteItem, SidebarEntry } from '../types/navigation';
import { Table, Column } from '../components/Table';
import { StatusBadge } from '../components/StatusBadge';

// Placeholder Catalog Pages
const ProductsPage: FC = () => {
  const dummyProducts = [
    { id: 'prod_1', name: 'Enterprise ERP Suite', type: 'service', salesPrice: '$1,200.00', costPrice: '$400.00', status: 'ACTIVE' },
    { id: 'prod_2', name: 'Cloud CRM Pro', type: 'service', salesPrice: '$800.00', costPrice: '$250.00', status: 'ACTIVE' },
    { id: 'prod_3', name: 'Dedicated Support & SLA', type: 'service', salesPrice: '$500.00', costPrice: '$150.00', status: 'ACTIVE' },
  ];

  const columns: Column<typeof dummyProducts[0]>[] = [
    { key: 'name', header: 'Product Name' },
    { key: 'type', header: 'Type' },
    { key: 'salesPrice', header: 'Sales Price' },
    { key: 'costPrice', header: 'Cost Price' },
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
          <h1 className="text-2xl font-bold text-slate-900">Products & Catalog</h1>
          <p className="text-sm text-slate-500">Manage software products, add-ons, and brand variants</p>
        </div>
      </div>
      <Table
        columns={columns}
        data={dummyProducts}
        page={1}
        limit={10}
        total={3}
        onPageChange={() => {}}
      />
    </div>
  );
};

const PlansPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
      <p className="text-sm text-slate-500">Configure recurring billing cycles and renewal conditions</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Plans management stub view
      </div>
    </div>
  );
};

const TaxesPage: FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tax Rates</h1>
      <p className="text-sm text-slate-500">Manage GST, VAT, and regional compliance taxes</p>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
        Tax configuration stub view
      </div>
    </div>
  );
};

export const catalogRoutes: RouteItem[] = [
  {
    path: '/catalog/products',
    element: <ProductsPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    path: '/catalog/plans',
    element: <PlansPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
  {
    path: '/catalog/taxes',
    element: <TaxesPage />,
    allowedRoles: ['ADMIN', 'STAFF'],
  },
];

export const catalogSidebarEntries: SidebarEntry[] = [
  {
    id: 'catalog-products',
    title: 'Products & Variants',
    path: '/catalog/products',
    iconName: 'Package',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'Catalog',
  },
  {
    id: 'catalog-plans',
    title: 'Subscription Plans',
    path: '/catalog/plans',
    iconName: 'Calendar',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'Catalog',
  },
  {
    id: 'catalog-taxes',
    title: 'Tax Rates',
    path: '/catalog/taxes',
    iconName: 'Receipt',
    allowedRoles: ['ADMIN', 'STAFF'],
    group: 'Catalog',
  },
];
