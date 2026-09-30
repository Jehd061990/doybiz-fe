import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function ReportsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="REPORTS">{children}</ModuleRouteGuard>;
}
