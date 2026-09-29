import { MODULE_REGISTRY, MODULES } from './modules';

describe('frontend module registry', () => {
  it('matches the backend module identifiers exactly and in stable order', () => {
    expect(MODULES).toEqual([
      'POS',
      'SALES',
      'APPOINTMENTS',
      'CUSTOMERS',
      'REPORTS',
      'STAFF',
      'BILLING',
    ]);
    expect(MODULE_REGISTRY.map(module => module.key)).toEqual(MODULES);
    expect(MODULES).not.toContain('INVENTORY');
    expect(MODULES).not.toContain('SUPER_ADMIN');
  });

  it('has stable labels and only registers the implemented Billing route', () => {
    expect(MODULE_REGISTRY).toEqual([
      { key: 'POS', label: 'Point of sale', route: null },
      { key: 'SALES', label: 'Sales', route: null },
      { key: 'APPOINTMENTS', label: 'Appointments', route: null },
      { key: 'CUSTOMERS', label: 'Customers', route: null },
      { key: 'REPORTS', label: 'Reports', route: null },
      { key: 'STAFF', label: 'Staff', route: null },
      { key: 'BILLING', label: 'Billing', route: '/app/billing', allowedRoles: ['OWNER', 'MANAGER'] },
    ]);
  });
});