import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function StaffLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="STAFF">{children}</ModuleRouteGuard>;
}
