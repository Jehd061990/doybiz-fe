import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCreate } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { OrganizationBranch } from '@/types/user-management';
import { BranchCreatePage, BranchListPage } from './branch-management-pages';

jest.mock('@refinedev/core', () => ({ useCreate: jest.fn() }));
jest.mock('@/lib/branches/use-branches', () => ({ useBranches: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCreateMock = useCreate as jest.Mock;
const useBranchesMock = useBranches as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;

const owner: AuthUser = {
  _id: 'owner-1',
  organizationId: 'org-1',
  name: 'Casey Owner',
  email: 'owner@example.com',
  role: 'OWNER',
  branchAccess: 'ALL',
  modulePermissions: ['POS'],
  status: 'ACTIVE',
};

const manager: AuthUser = { ...owner, _id: 'manager-1', role: 'MANAGER', branchAccess: ['branch-1'] };

const branches: OrganizationBranch[] = [
  {
    id: 'branch-1',
    organizationId: 'org-1',
    name: 'Main Branch',
    address: '1 Main Street',
    contactNumber: '555-0101',
    status: 'ACTIVE',
  },
  {
    id: 'branch-2',
    organizationId: 'org-1',
    name: 'North Branch',
    address: '12 North Road',
    contactNumber: '555-0102',
    status: 'INACTIVE',
  },
];

const branchQuery = (data: OrganizationBranch[], state: 'loaded' | 'loading' | 'error' = 'loaded', error?: unknown) => ({
  result: { data, total: data.length },
  query: { isLoading: state === 'loading', isError: state === 'error', error },
});

function setSession(user: AuthUser = owner) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

function fillBranchForm() {
  fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'South Branch' } });
  fireEvent.change(screen.getByLabelText('Address'), { target: { value: '24 South Road' } });
  fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '555-0103' } });
}

describe('Branch Management pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    useBranchesMock.mockReturnValue(branchQuery(branches));
  });

  it('shows backend-returned branch name, address, contact, and status without edit/delete actions', () => {
    render(<BranchListPage />);

    expect(screen.getByRole('heading', { name: 'Branches' })).toBeInTheDocument();
    expect(screen.getByText('ORGANIZATION org-1')).toBeInTheDocument();
    expect(screen.getByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('1 Main Street')).toBeInTheDocument();
    expect(screen.getByText('555-0101')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('shows list loading, empty, error, and local filter states', () => {
    useBranchesMock.mockReturnValue(branchQuery([], 'loading'));
    const { rerender } = render(<BranchListPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading organization branches');

    useBranchesMock.mockReturnValue(branchQuery([]));
    rerender(<BranchListPage />);
    expect(screen.getByText('No branches found.')).toBeInTheDocument();

    useBranchesMock.mockReturnValue(branchQuery([], 'error', { status: 500, message: 'database trace' }));
    rerender(<BranchListPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load organization branches.');
    expect(screen.queryByText('database trace')).not.toBeInTheDocument();

    useBranchesMock.mockReturnValue(branchQuery(branches));
    rerender(<BranchListPage />);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'INACTIVE' } });
    expect(screen.getByText('North Branch')).toBeInTheDocument();
    expect(screen.queryByText('Main Branch')).not.toBeInTheDocument();
  });

  it('allows managers to view only returned branches but not create them', () => {
    setSession(manager);
    useBranchesMock.mockReturnValue(branchQuery([branches[0]]));
    render(<BranchListPage />);

    expect(screen.getByText('Main Branch')).toBeInTheDocument();
    expect(screen.queryByText('North Branch')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create branch' })).not.toBeInTheDocument();
  });

  it('creates a branch using only the model fields and the authenticated organization scope', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: branches[0] });
    useCreateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<BranchCreatePage />);
    fillBranchForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      resource: 'branches',
      values: {
        name: 'South Branch',
        address: '24 South Road',
        contactNumber: '555-0103',
        status: 'ACTIVE',
      },
    }));
    expect(mutateAsync.mock.calls[0][0].values).not.toHaveProperty('organizationId');
    expect(await screen.findByRole('status')).toHaveTextContent('Branch created successfully.');
    expect(screen.getByLabelText('Branch name')).toHaveValue('');
  });

  it('maps branch create errors safely and prevents non-owner create access', async () => {
    const mutateAsync = jest.fn().mockRejectedValue({ status: 400, payload: { error: 'duplicate database error' } });
    useCreateMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    const { rerender } = render(<BranchCreatePage />);
    fillBranchForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create branch' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the branch details and try again.');
    expect(screen.getByLabelText('Branch name')).toHaveValue('South Branch');

    const createHookCallsBeforeDeniedRender = useCreateMock.mock.calls.length;
    setSession(manager);
    rerender(<BranchCreatePage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Only an organization owner can create branches.');
    expect(useCreateMock).toHaveBeenCalledTimes(createHookCallsBeforeDeniedRender);
  });
});