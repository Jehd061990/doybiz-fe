import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';
import { ModuleRouteGuard } from './module-route-guard';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/auth/server-session', () => ({ getAuthSession: jest.fn() }));

const getAuthSessionMock = jest.mocked(getAuthSession);
const redirectMock = jest.mocked(redirect);

const managerSession = {
  authenticated: true,
  organization: { id: 'org-1' },
  user: {
    _id: 'manager-1',
    organizationId: 'org-1',
    name: 'Manager',
    email: 'manager@example.com',
    role: 'MANAGER' as const,
    branchAccess: ['branch-1'],
    modulePermissions: ['BILLING' as const],
    status: 'ACTIVE' as const,
  },
};

describe('ModuleRouteGuard', () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    redirectMock.mockReset();
  });

  it('renders protected module content when the authenticated user has its effective permission', async () => {
    getAuthSessionMock.mockResolvedValue(managerSession);

    render(await ModuleRouteGuard({ module: 'BILLING', children: <p>Billing content</p> }));

    expect(screen.getByText('Billing content')).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('allows a user with POS permission through the POS module guard', async () => {
    getAuthSessionMock.mockResolvedValue({
      ...managerSession,
      user: { ...managerSession.user, modulePermissions: ['POS'] },
    });

    render(await ModuleRouteGuard({ module: 'POS', children: <p>POS checkout</p> }));

    expect(screen.getByText('POS checkout')).toBeInTheDocument();
  });

  it('blocks a user without the module permission with a safe message', async () => {
    getAuthSessionMock.mockResolvedValue({
      ...managerSession,
      user: { ...managerSession.user, modulePermissions: ['POS'] },
    });

    render(await ModuleRouteGuard({ module: 'BILLING', children: <p>Billing content</p> }));

    expect(screen.getByRole('alert')).toHaveTextContent("You don't have access to this module.");
    expect(screen.queryByText('Billing content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users through the existing login route', async () => {
    getAuthSessionMock.mockResolvedValue({ authenticated: false, organization: null, user: null });

    render(await ModuleRouteGuard({ module: 'BILLING', children: <p>Billing content</p> }));

    expect(redirectMock).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Billing content')).not.toBeInTheDocument();
  });

  it('allows Reports now that the Reports module is registered as a supported route', async () => {
    getAuthSessionMock.mockResolvedValue({
      ...managerSession,
      user: { ...managerSession.user, modulePermissions: ['REPORTS'] },
    });

    render(await ModuleRouteGuard({ module: 'REPORTS', children: <p>Reports content</p> }));

    expect(screen.getByText('Reports content')).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
