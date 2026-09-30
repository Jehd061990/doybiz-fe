import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function SalesLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="SALES">{children}</ModuleRouteGuard>;
}
