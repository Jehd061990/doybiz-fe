import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';
import OrganizationContextRoute from './page';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/auth/server-session', () => ({ getAuthSession: jest.fn() }));

const getAuthSessionMock = jest.mocked(getAuthSession);
const redirectMock = jest.mocked(redirect);

describe('OrganizationContextRoute', () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    redirectMock.mockReset();
  });

  it('shows only organization context provided by the authenticated session', async () => {
    getAuthSessionMock.mockResolvedValue({
      authenticated: true,
      organization: { id: 'org-session-1' },
      user: {
        _id: 'user-1',
        organizationId: 'org-session-1',
        name: 'Workspace Owner',
        email: 'owner@example.com',
        role: 'OWNER',
        branchAccess: 'ALL',
        modulePermissions: ['POS'],
        status: 'ACTIVE',
      },
    });

    render(await OrganizationContextRoute());

    expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByText('org-session-1')).toBeInTheDocument();
    expect(screen.queryByText(/ACTIVE|address|phone|subscription/i)).not.toBeInTheDocument();
  });

  it('redirects when authenticated organization context is unavailable', async () => {
    getAuthSessionMock.mockResolvedValue({ authenticated: false, organization: null, user: null });

    await OrganizationContextRoute();

    expect(redirectMock).toHaveBeenCalledWith('/login');
  });
});