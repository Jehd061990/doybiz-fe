import type { ModuleName } from '@/config/modules';
import type { UserRole } from '@/config/roles';
import type { AuthUser } from '@/types/auth';

export const isKnownRole = (role: string): role is UserRole =>
  role === 'OWNER' || role === 'MANAGER' || role === 'CASHIER';

export const hasModulePermission = (user: AuthUser, module: ModuleName): boolean =>
  user.modulePermissions.includes(module);

export const canAccessBranch = (user: AuthUser, branchId: string): boolean =>
  user.role === 'OWNER' || user.branchAccess === 'ALL' || user.branchAccess.includes(branchId);

export const isActiveUser = (user: AuthUser): boolean => user.status === 'ACTIVE';
