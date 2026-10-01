import type { ModuleName } from './modules';
import type { UserRole } from './roles';
import type { PermissionPreset } from '@/types/auth';

export const ROLE_PRESET_MODULES: Record<PermissionPreset, ModuleName[]> = {
  OWNER: ['POS', 'SALES', 'APPOINTMENTS', 'SERVICES', 'CUSTOMERS', 'REPORTS', 'STAFF', 'BILLING'],
  MANAGER: ['POS', 'SALES', 'APPOINTMENTS', 'SERVICES', 'CUSTOMERS', 'REPORTS', 'STAFF'],
  CASHIER: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS'],
};
export const getPresetPreview = (role: UserRole, preset: PermissionPreset): ModuleName[] => {
  if (role === 'OWNER') return [...ROLE_PRESET_MODULES.OWNER];
  return [...ROLE_PRESET_MODULES[preset]];
};
