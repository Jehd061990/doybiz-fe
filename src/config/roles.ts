export const ROLES = ['OWNER', 'MANAGER', 'CASHIER'] as const;

export type UserRole = (typeof ROLES)[number];
