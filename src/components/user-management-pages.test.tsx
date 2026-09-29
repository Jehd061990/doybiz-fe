import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCreate, useList, useOne, useUpdate } from '@refinedev/core';
import { useParams, useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { OrganizationBranch, OrganizationUser } from '@/types/user-management';
import { UserCreatePage, UserEditPage, UserListPage } from './user-management-pages';

jest.mock('@refinedev/core', () => ({
  useCreate: jest.fn(),
  useList: jest.fn(),
  useOne: jest.fn(),
  useUpdate: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCreateMock = useCreate as jest.Mock;
const useListMock = useList as jest.Mock;
const useOneMock = useOne as jest.Mock;
const useUpdateMock = useUpdate as jest.Mock;
const useParamsMock = useParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;

const owner: AuthUser = {
  _id: 'owner-1',
  organizationId: 'org-1',
  name: 'Casey Owner',
  email: 'owner@example.com',
  role: 'OWNER',
  branchAccess: 'ALL',
  modulePermissions: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'REPORTS', 'STAFF', 'BILLING'],
  permissionPreset: 'OWNER',
  status: 'ACTIVE',
};

const managedUser: OrganizationUser = {
  id: 'user-2',
  organizationId: 'org-1',
  name: 'Taylor Manager',
  email: 'taylor@example.com',
  role: 'MANAGER',
  branchAccess: ['branch-1'],
  modulePermissions: ['POS', 'CUSTOMERS'],
  permissionPreset: 'MANAGER',
  status: 'ACTIVE',
};

const branches: OrganizationBranch[] = [
  { id: 'branch-1', name: 'Main Branch', status: 'ACTIVE' },
  { id: 'branch-2', name: 'North Branch', status: 'ACTIVE' },
];

const listResult = (data: unknown[], state: 'loaded' | 'loading' | 'error' = 'loaded', error?: unknown) => ({
  result: { data, total: data.length },
  query: {
    isLoading: state === 'loading',
    isError: state === 'error',
    error,
  },
});

function setSession(user: AuthUser = owner) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

function setListResults(users: OrganizationUser[] = [managedUser], branchData = branches) {
  useListMock.mockImplementation(({ resource }: { resource: string }) =>
    resource === 'users' ? listResult(users) : listResult(branchData));
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Cashier' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'test-password-123' } });
}

describe('User Management pages', () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    useRouterMock.mockReturnValue({ replace });
    useParamsMock.mockReturnValue({ id: managedUser.id });
  });

  it('loads organization users and displays role, status, branches, and effective modules', () => {
    setListResults();
    render(<UserListPage />);

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('Taylor Manager')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'MANAGER' })).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('POS, CUSTOMERS')).toBeInTheDocument();
    expect(screen.queryByText(/passwordHash|JWT/i)).not.toBeInTheDocument();
  });

  it('shows the loading state while organization users are being requested', () => {
    useListMock.mockImplementation(({ resource }: { resource: string }) =>
      resource === 'users' ? listResult([], 'loading') : listResult(branches));
    render(<UserListPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading organization users');
  });

  it('shows a useful empty state', () => {
    setListResults([]);
    render(<UserListPage />);

    expect(screen.getByText('No users found.')).toBeInTheDocument();
    screen.getAllByRole('link', { name: 'Create user' }).forEach(link => {
      expect(link).toHaveAttribute('href', '/app/users/create');
    });
  });

  it('filters the complete organization list locally by role and name', () => {
    const cashier: OrganizationUser = {
      ...managedUser,
      id: 'user-3',
      name: 'Jordan Cashier',
      email: 'jordan@example.com',
      role: 'CASHIER',
      permissionPreset: 'CASHIER',
    };
    setListResults([managedUser, cashier]);
    render(<UserListPage />);

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'CASHIER' } });
    expect(screen.getByText('Jordan Cashier')).toBeInTheDocument();
    expect(screen.queryByText('Taylor Manager')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'not-found@example.com' } });
    expect(screen.getByText('No users match these filters.')).toBeInTheDocument();
  });

  it('handles forbidden list responses without showing backend internals', () => {
    useListMock.mockImplementation(({ resource }: { resource: string }) =>
      resource === 'users'
        ? listResult([], 'error', { status: 403, message: 'stack trace and database details' })
        : listResult(branches));
    render(<UserListPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Only an organization owner can manage users.');
    expect(screen.queryByText(/stack trace|database details/)).not.toBeInTheDocument();
  });

  it('does not request or render owner-only management UI for a manager', () => {
    setSession({ ...managedUser, _id: managedUser.id, branchAccess: ['branch-1'] });
    render(<UserListPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Only an organization owner can manage users.');
    expect(useListMock).not.toHaveBeenCalled();
  });

  it('creates a user through Refine using the selected organization branch and backend preset defaults', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: managedUser });
    useCreateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    setListResults([], branches);
    render(<UserCreatePage />);
    fillCreateForm();
    fireEvent.click(screen.getByLabelText('Main Branch'));
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      resource: 'users',
      values: {
        name: 'New Cashier',
        email: 'new@example.com',
        password: 'test-password-123',
        role: 'CASHIER',
        permissionPreset: 'CASHIER',
        branchAccess: ['branch-1'],
        status: 'ACTIVE',
      },
    }));
    expect(replace).toHaveBeenCalledWith('/app/users');
  });

  it('shows a safe create validation error and keeps the form values available', async () => {
    const mutateAsync = jest.fn().mockRejectedValue({ status: 400, message: 'Invalid user role' });
    useCreateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    setListResults([], branches);
    render(<UserCreatePage />);
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Check the user details and try again.');
    expect(screen.getByLabelText('Name')).toHaveValue('New Cashier');
  });

  it('loads, edits, and submits role, branch, module, and status fields to the exact update contract', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: managedUser });
    useOneMock.mockReturnValue({ result: managedUser, query: { isLoading: false, isError: false, error: null } });
    useListMock.mockReturnValue(listResult(branches));
    useUpdateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<UserEditPage />);

    expect(screen.getByText('Organization ID:')).toBeInTheDocument();
    expect(screen.getByText('org-1')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Organization role'), { target: { value: 'CASHIER' } });
    fireEvent.click(screen.getByLabelText('Reports'));
    fireEvent.click(screen.getByLabelText('North Branch'));
    fireEvent.click(screen.getByLabelText('Inactive'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      resource: 'users',
      id: 'user-2',
      values: {
        name: 'Taylor Manager',
        email: 'taylor@example.com',
        role: 'CASHIER',
        permissionPreset: 'MANAGER',
        branchAccess: ['branch-1', 'branch-2'],
        status: 'INACTIVE',
        modulePermissions: ['POS', 'CUSTOMERS', 'REPORTS'],
      },
    }));
    expect(replace).toHaveBeenCalledWith('/app/users');
  });

  it('shows backend owner-protection rejection in safe language', async () => {
    const mutateAsync = jest.fn().mockRejectedValue({
      status: 400,
      message: 'The organization must retain at least one active owner',
    });
    useOneMock.mockReturnValue({ result: { ...managedUser, role: 'OWNER', branchAccess: 'ALL' }, query: { isLoading: false, isError: false, error: null } });
    useListMock.mockReturnValue(listResult(branches));
    useUpdateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<UserEditPage />);
    fireEvent.click(screen.getByLabelText('Inactive'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This user cannot be changed because the organization must retain an active owner.',
    );
  });
});