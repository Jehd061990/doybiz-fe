import { canAccessBranch, canAccessModuleRoute, hasModuleAccess, isActiveUser, isKnownRole } from './access';
import type { AuthUser } from '@/types/auth';

const cashier: AuthUser = {
  _id: 'user-1',
  organizationId: 'org-1',
  name: 'Casey Cashier',
  email: 'casey@example.com',
  role: 'CASHIER',
  branchAccess: ['branch-a'],
  modulePermissions: ['POS'],
  permissionPreset: 'CASHIER',
  status: 'ACTIVE',
};

describe('authorization display helpers', () => {
  it('recognizes supported organization roles', () => {
    expect(isKnownRole('OWNER')).toBe(true);
    expect(isKnownRole('CASHIER')).toBe(true);
    expect(isKnownRole('SUPER_ADMIN')).toBe(false);
  });

  it('checks module and branch access independently', () => {
    expect(hasModuleAccess(cashier, 'POS')).toBe(true);
    expect(hasModuleAccess(cashier, 'SALES')).toBe(false);
    expect(canAccessBranch(cashier, 'branch-a')).toBe(true);
    expect(canAccessBranch(cashier, 'branch-b')).toBe(false);
  });

  it('requires both effective module permission and an implemented route', () => {
    expect(canAccessModuleRoute({ ...cashier, role: 'OWNER', modulePermissions: ['BILLING'] }, 'BILLING')).toBe(true);
    expect(canAccessModuleRoute({ ...cashier, role: 'CASHIER', modulePermissions: ['BILLING'] }, 'BILLING')).toBe(false);
    expect(canAccessModuleRoute({ ...cashier, role: 'OWNER', modulePermissions: ['POS'] }, 'POS')).toBe(true);
    expect(canAccessModuleRoute({ ...cashier, role: 'OWNER', modulePermissions: ['SALES'] }, 'SALES')).toBe(false);
    expect(canAccessModuleRoute({ ...cashier, role: 'OWNER', modulePermissions: ['BILLING'] }, 'POS')).toBe(false);
  });

  it('recognizes active status and owner-wide branch access', () => {
    expect(isActiveUser(cashier)).toBe(true);
    expect(canAccessBranch({ ...cashier, role: 'OWNER', branchAccess: 'ALL' }, 'branch-b')).toBe(true);
  });
});
