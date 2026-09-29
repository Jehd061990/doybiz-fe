import type { ModuleName } from '@/config/modules';
import type { UserRole } from '@/config/roles';
import type { AccountStatus, PermissionPreset } from '@/types/auth';

export interface OrganizationUser {
  id: string;
  _id?: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  branchAccess: string[] | 'ALL';
  modulePermissions: ModuleName[];
  permissionPreset?: PermissionPreset;
  status: AccountStatus;
}

export interface OrganizationBranch {
  id: string;
  _id?: string;
  name: string;
  status: AccountStatus;
}

export interface CreateOrganizationUserValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchAccess: string[] | 'ALL';
  permissionPreset: PermissionPreset;
  modulePermissions?: ModuleName[];
  status: AccountStatus;
}

export interface UpdateOrganizationUserValues {
  name: string;
  email: string;
  role: UserRole;
  branchAccess: string[] | 'ALL';
  permissionPreset: PermissionPreset;
  modulePermissions?: ModuleName[];
  applyPreset?: true;
  status: AccountStatus;
}