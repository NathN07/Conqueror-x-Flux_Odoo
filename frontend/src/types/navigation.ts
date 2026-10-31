import { ReactNode } from 'react';
import { UserRole } from './auth';

export interface RouteItem {
  path: string;
  element: ReactNode;
  allowedRoles: UserRole[];
}

export interface SidebarEntry {
  id: string;
  title: string;
  path: string;
  iconName?: string;
  allowedRoles: UserRole[];
  badge?: string;
  group?: string;
}
