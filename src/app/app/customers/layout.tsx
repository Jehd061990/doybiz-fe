import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function CustomersLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="CUSTOMERS">{children}</ModuleRouteGuard>;
}
