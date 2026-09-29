import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from './cookies';
import type { AuthSession, AuthUser } from '@/types/auth';

const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Partial<AuthUser>;
  return typeof user._id === 'string'
    && typeof user.organizationId === 'string'
    && typeof user.name === 'string'
    && typeof user.email === 'string'
    && (user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'CASHIER')
    && Array.isArray(user.modulePermissions)
    && (user.branchAccess === 'ALL' || Array.isArray(user.branchAccess))
    && (user.status === 'ACTIVE' || user.status === 'INACTIVE');
};

export async function getAuthSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const serializedUser = cookieStore.get(AUTH_USER_COOKIE)?.value;
  if (!token || !serializedUser) return { authenticated: false, organization: null, user: null };

  try {
    const user: unknown = JSON.parse(serializedUser);
    if (!isAuthUser(user) || user.status !== 'ACTIVE') {
      return { authenticated: false, organization: null, user: null };
    }
    return { authenticated: true, organization: { id: user.organizationId }, user };
  } catch {
    return { authenticated: false, organization: null, user: null };
  }
}
