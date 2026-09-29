'use client';

import { useList } from '@refinedev/core';
import type { OrganizationBranch } from '@/types/user-management';

export function useBranches() {
  return useList<OrganizationBranch>({ resource: 'branches', pagination: { mode: 'off' } });
}