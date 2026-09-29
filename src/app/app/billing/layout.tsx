import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function BillingModuleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="BILLING">{children}</ModuleRouteGuard>;
}