import { canAccessBranch, hasModulePermission, isActiveUser, isKnownRole } from './access';
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
    expect(hasModulePermission(cashier, 'POS')).toBe(true);
    expect(hasModulePermission(cashier, 'SALES')).toBe(false);
    expect(canAccessBranch(cashier, 'branch-a')).toBe(true);
    expect(canAccessBranch(cashier, 'branch-b')).toBe(false);
  });

  it('recognizes active status and owner-wide branch access', () => {
    expect(isActiveUser(cashier)).toBe(true);
    expect(canAccessBranch({ ...cashier, role: 'OWNER', branchAccess: 'ALL' }, 'branch-b')).toBe(true);
  });
});
