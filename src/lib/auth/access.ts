import { MODULE_REGISTRY, type ModuleName } from '@/config/modules';
import type { UserRole } from '@/config/roles';
import type { AuthIdentity, AuthUser } from '@/types/auth';

export const isKnownRole = (role: string): role is UserRole =>
  role === 'OWNER' || role === 'MANAGER' || role === 'CASHIER';

export const isTenantUser = (user: AuthIdentity): user is AuthUser => user.role !== 'PLATFORM_ADMIN';

export const hasModuleAccess = (user: AuthIdentity, module: ModuleName): boolean =>
  user.role !== 'PLATFORM_ADMIN' && user.modulePermissions.includes(module);

export const canAccessModuleRoute = (user: AuthIdentity, module: ModuleName): boolean => {
  if (user.role === 'PLATFORM_ADMIN') return false;
  const definition = MODULE_REGISTRY.find(item => item.key === module);
  if (!definition?.route || !hasModuleAccess(user, module)) return false;
  return !('allowedRoles' in definition) || definition.allowedRoles.some(role => role === user.role);
};

export const canAccessBranch = (user: AuthUser, branchId: string): boolean =>
  user.role === 'OWNER' || user.branchAccess === 'ALL' || user.branchAccess.includes(branchId);

export const isActiveUser = (user: AuthUser): boolean => user.status === 'ACTIVE';
