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

export interface AuthOrganizationContext {
  id: string;
}

export interface AuthSession {
  authenticated: boolean;
  organization: AuthOrganizationContext | null;
  user: AuthUser | null;
}

export interface AuthResponse {
  success: true;
  user: AuthUser;
}
