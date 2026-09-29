import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function AppointmentsModuleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="APPOINTMENTS">{children}</ModuleRouteGuard>;
}
