'use client';

import { useGetIdentity } from '@refinedev/core';
import type { AuthSession, AuthUser } from '@/types/auth';

const EMPTY_SESSION: AuthSession = { authenticated: false, organization: null, user: null };

export function useAuthSession() {
  const { data: user, isLoading, error } = useGetIdentity<AuthUser>();
  const session: AuthSession = user
    ? { authenticated: true, organization: { id: user.organizationId }, user }
    : EMPTY_SESSION;

  return { session, isLoading, error };
}