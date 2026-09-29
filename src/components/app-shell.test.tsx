import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import type { AuthUser } from '@/types/auth';
import { AppShell } from './app-shell';

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }));
jest.mock('@/components/logout-button', () => ({ LogoutButton: () => <button type="button">Sign out</button> }));

const usePathnameMock = usePathname as jest.Mock;

const user: AuthUser = {
  _id: 'user-1',
  organizationId: 'org-1',
  name: 'Workspace User',
  email: 'user@example.com',
  role: 'OWNER',
  branchAccess: 'ALL',
  modulePermissions: ['POS', 'BILLING'],
  status: 'ACTIVE',
};

describe('AppShell navigation', () => {
  it('shows an active Users link to owners only', () => {
    usePathnameMock.mockReturnValue('/app/users');
    const { rerender } = render(<AppShell user={user}><p>Current route</p></AppShell>);

    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/app/users');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Branches' })).toHaveAttribute('href', '/app/branches');
    expect(screen.getByRole('link', { name: 'Organization' })).toHaveAttribute('href', '/app/organization');
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/app/billing');
    expect(screen.queryByRole('link', { name: 'Point of sale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sales' })).not.toBeInTheDocument();

    rerender(<AppShell user={{ ...user, role: 'MANAGER' }}><p>Current route</p></AppShell>);

    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Branches' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billing' })).toBeInTheDocument();

    rerender(<AppShell user={{ ...user, role: 'CASHIER' }}><p>Current route</p></AppShell>);

    expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();

    rerender(<AppShell user={{ ...user, modulePermissions: ['POS'] }}><p>Current route</p></AppShell>);

    expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();
  });
});