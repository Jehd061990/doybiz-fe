import { apiRequest } from '@/lib/api/client';
import type { AuthSession, AuthUser } from '@/types/auth';
import authProvider from './auth-provider';

jest.mock('@/lib/api/client', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly payload?: unknown) {
      super(message);
    }
  },
  apiRequest: jest.fn(),
}));

const user: AuthUser = {
  _id: 'user-1',
  organizationId: 'org-1',
  name: 'Workspace Owner',
  email: 'owner@example.com',
  role: 'OWNER',
  branchAccess: 'ALL',
  modulePermissions: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'REPORTS', 'STAFF', 'BILLING'],
  permissionPreset: 'OWNER',
  status: 'ACTIVE',
};

const authenticatedSession: AuthSession = {
  authenticated: true,
  organization: { id: 'org-1' },
  user,
};

const apiRequestMock = jest.mocked(apiRequest);

describe('Refine auth provider', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('logs in a single-organization user and returns the authenticated identity', async () => {
    apiRequestMock.mockResolvedValueOnce({ success: true, user });
    const login = await authProvider.login({ email: user.email, password: 'test-only-password' });

    expect(login).toEqual({ success: true, redirectTo: '/app' });
    expect(apiRequestMock).toHaveBeenLastCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: user.email, password: 'test-only-password' },
      apiBase: '',
    });

    apiRequestMock.mockResolvedValueOnce(authenticatedSession);
    expect(await authProvider.check()).toEqual({ authenticated: true });
    apiRequestMock.mockResolvedValueOnce(authenticatedSession);
    expect(await authProvider.getIdentity?.()).toEqual(user);
  });

  it('leaves invalid credentials unauthenticated and supports cookie-backed logout', async () => {
    apiRequestMock.mockRejectedValueOnce(new Error('Email or password is incorrect.'));
    const login = await authProvider.login({ email: user.email, password: 'wrong-test-password' });
    expect(login.success).toBe(false);

    const emptySession: AuthSession = { authenticated: false, organization: null, user: null };
    apiRequestMock.mockResolvedValueOnce(emptySession);
    expect(await authProvider.check()).toEqual({
      authenticated: false,
      logout: true,
      redirectTo: '/login',
    });

    apiRequestMock.mockResolvedValueOnce({ success: true });
    expect(await authProvider.logout({})).toEqual({ success: true, redirectTo: '/login' });
    expect(apiRequestMock).toHaveBeenLastCalledWith('/api/auth/logout', { method: 'POST', apiBase: '' });
  });
});