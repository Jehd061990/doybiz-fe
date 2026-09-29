import { MODULES, type ModuleName } from './modules';
import type { PermissionPreset } from '@/types/auth';
import type { UserRole } from './roles';

const PRESET_MODULES: Record<PermissionPreset, readonly ModuleName[]> = {
  OWNER: MODULES,
  MANAGER: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'REPORTS', 'STAFF'],
  CASHIER: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS'],
};

export function getPresetPreview(role: UserRole, preset: PermissionPreset): ModuleName[] {
  return role === 'OWNER' ? [...MODULES] : [...PRESET_MODULES[preset]];
}