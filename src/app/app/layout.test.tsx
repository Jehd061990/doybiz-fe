import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';
import AppLayout from './layout';
import AuthenticatedWorkspacePage from './page';
import LoginPage from '../login/page';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/lib/auth/server-session', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/components/logout-button', () => ({ LogoutButton: () => <button type="button">Sign out</button> }));

const getAuthSessionMock = jest.mocked(getAuthSession);
const redirectMock = jest.mocked(redirect);

describe('authenticated route redirects', () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset();
    redirectMock.mockReset();
  });

  it('redirects unauthenticated requests from /app to /login', async () => {
    getAuthSessionMock.mockResolvedValue({ authenticated: false, organization: null, user: null });

    await AppLayout({ children: <p>Workspace</p> });

    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('redirects an authenticated user away from /login to /app', async () => {
    getAuthSessionMock.mockResolvedValue({
      authenticated: true,
      organization: { id: 'org-1' },
      user: {
        _id: 'user-1',
        organizationId: 'org-1',
        name: 'Workspace Owner',
        email: 'owner@example.com',
        role: 'OWNER',
        branchAccess: 'ALL',
        modulePermissions: ['POS'],
        status: 'ACTIVE',
      },
    });

    await LoginPage();

    expect(redirectMock).toHaveBeenCalledWith('/app');
  });

  it('renders the authenticated user in the workspace', async () => {
    getAuthSessionMock.mockResolvedValue({
      authenticated: true,
      organization: { id: 'org-1' },
      user: {
        _id: 'user-1',
        organizationId: 'org-1',
        name: 'Workspace Owner',
        email: 'owner@example.com',
        role: 'OWNER',
        branchAccess: 'ALL',
        modulePermissions: ['POS'],
        status: 'ACTIVE',
      },
    });

    render(await AuthenticatedWorkspacePage());

    expect(screen.getByRole('heading', { name: 'You’re signed in, Workspace.' })).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
  });
});