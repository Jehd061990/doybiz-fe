export const MODULE_REGISTRY = [
  { key: 'POS', label: 'Point of sale', route: '/app/pos' },
  { key: 'SALES', label: 'Sales', route: null },
  { key: 'APPOINTMENTS', label: 'Appointments', route: '/app/appointments' },
  { key: 'CUSTOMERS', label: 'Customers', route: '/app/customers' },
  { key: 'REPORTS', label: 'Reports', route: null },
  { key: 'STAFF', label: 'Staff', route: null },
  { key: 'BILLING', label: 'Billing', route: '/app/billing', allowedRoles: ['OWNER', 'MANAGER'] },
] as const;

export type ModuleName = (typeof MODULE_REGISTRY)[number]['key'];

export const MODULES: readonly ModuleName[] = MODULE_REGISTRY.map(module => module.key);

export const getModuleDefinition = (module: ModuleName) =>
  MODULE_REGISTRY.find(definition => definition.key === module);
