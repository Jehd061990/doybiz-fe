import type { ModuleName } from '@/config/modules';
import type { UserRole } from '@/config/roles';

export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type PermissionPreset = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface AuthUser {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  branchAccess: string[] | 'ALL';
  modulePermissions: ModuleName[];
  permissionPreset?: PermissionPreset;
  status: AccountStatus;
}

export interface PlatformAdminUser {
  _id: 'platform-admin';
  name: string;
  email: string;
  role: 'PLATFORM_ADMIN';
  scope: 'PLATFORM_ADMIN';
  status: 'ACTIVE';
}

export type AuthIdentity = AuthUser | PlatformAdminUser;

export interface AuthOrganizationContext {
  id: string;
}

export interface AuthSession {
  authenticated: boolean;
  organization: AuthOrganizationContext | null;
  user: AuthIdentity | null;
}

export interface AuthResponse {
  success: true;
  user: AuthIdentity;
}
