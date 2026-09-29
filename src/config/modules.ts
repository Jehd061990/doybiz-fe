export const MODULES = [
  'POS',
  'SALES',
  'APPOINTMENTS',
  'CUSTOMERS',
  'REPORTS',
  'STAFF',
  'BILLING',
] as const;

export type ModuleName = (typeof MODULES)[number];
