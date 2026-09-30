import type { AuthProvider } from '@refinedev/core';
import { ApiError, apiRequest } from '@/lib/api/client';
import type { AuthResponse, AuthSession } from '@/types/auth';

const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return { success: false, error: new Error('Enter your email and password.') };
    }
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        apiBase: '',
      });
      return { success: true, redirectTo: response.user.role === 'PLATFORM_ADMIN' ? '/app/super-admin' : '/app' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error('Login failed.') };
    }
  },
  logout: async () => {
    await apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST', apiBase: '' });
    return { success: true, redirectTo: '/login' };
  },
  check: async () => {
    try {
      const session = await apiRequest<AuthSession>('/api/auth/session', { apiBase: '' });
      return session.authenticated
        ? { authenticated: true }
        : { authenticated: false, logout: true, redirectTo: '/login' };
    } catch {
      return { authenticated: false, logout: true, redirectTo: '/login' };
    }
  },
  onError: async error => {
    if (error instanceof ApiError && error.status === 401) {
      return { logout: true, redirectTo: '/login', error };
    }
    return {};
  },
  getIdentity: async () => {
    const session = await apiRequest<AuthSession>('/api/auth/session', { apiBase: '' });
    return session.authenticated ? session.user : null;
  },
  getPermissions: async () => {
    const session = await apiRequest<AuthSession>('/api/auth/session', { apiBase: '' });
    if (!session.user) return null;
    if (session.user.role === 'PLATFORM_ADMIN') return { role: session.user.role };
    return {
      role: session.user.role,
      branchAccess: session.user.branchAccess,
      modulePermissions: session.user.modulePermissions,
      status: session.user.status,
    };
  },
};

export default authProvider;
