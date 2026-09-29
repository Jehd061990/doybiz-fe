import type { ReactNode } from 'react';
import { ModuleRouteGuard } from '@/components/module-route-guard';

export default function PosModuleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ModuleRouteGuard module="POS">{children}</ModuleRouteGuard>;
}