import { MODULE_REGISTRY, MODULES } from './modules';

describe('frontend module registry', () => {
  it('matches the backend module identifiers exactly and in stable order', () => {
    expect(MODULES).toEqual([
      'POS',
      'SALES',
      'APPOINTMENTS',
      'SERVICES',
      'CUSTOMERS',
      'REPORTS',
      'STAFF',
      'BILLING',
      'WEBSITE',
    ]);
    expect(MODULE_REGISTRY.map(module => module.key)).toEqual(MODULES);
    expect(MODULES).not.toContain('INVENTORY');
    expect(MODULES).not.toContain('SUPER_ADMIN');
  });

  it('has stable labels and registers the currently implemented module routes', () => {
    expect(MODULE_REGISTRY).toEqual([
      { key: 'POS', label: 'Point of sale', route: '/app/pos' },
      { key: 'SALES', label: 'Sales', route: '/app/sales' },
      { key: 'APPOINTMENTS', label: 'Appointments', route: '/app/appointments' },
      { key: 'SERVICES', label: 'Services', route: '/app/services' },
      { key: 'CUSTOMERS', label: 'Customers', route: '/app/customers' },
      { key: 'REPORTS', label: 'Reports', route: '/app/reports' },
      { key: 'STAFF', label: 'Staff', route: '/app/staff' },
      { key: 'BILLING', label: 'Billing', route: '/app/billing', allowedRoles: ['OWNER', 'MANAGER'] },
      { key: 'WEBSITE', label: 'Website', route: '/app/website' },
    ]);
  });
});
