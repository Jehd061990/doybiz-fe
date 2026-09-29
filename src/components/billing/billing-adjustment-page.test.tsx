import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCustomMutation, useList } from '@refinedev/core';
import { useRouter } from 'next/navigation';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { OrganizationBranch, OrganizationUser } from '@/types/user-management';
import { BillingAdjustmentPage } from './billing-adjustment-page';

jest.mock('@refinedev/core', () => ({ useCustomMutation: jest.fn(), useList: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/branches/use-branches', () => ({ useBranches: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCustomMutationMock = useCustomMutation as jest.Mock;
const useListMock = useList as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useBranchesMock = useBranches as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;

const owner: AuthUser = {
  _id: 'owner-1',
  organizationId: 'org-1',
  name: 'Casey Owner',
  email: 'owner@example.com',
  role: 'OWNER',
  branchAccess: 'ALL',
  modulePermissions: ['BILLING'],
  status: 'ACTIVE',
};

const users: OrganizationUser[] = [{
  id: 'user-1',
  organizationId: 'org-1',
  name: 'Alex Cashier',
  email: 'alex@example.com',
  role: 'CASHIER',
  branchAccess: [],
  modulePermissions: [],
  status: 'ACTIVE',
}];

const branches: OrganizationBranch[] = [{
  id: 'branch-1',
  organizationId: 'org-1',
  name: 'Main Branch',
  address: '1 Main Street',
  contactNumber: '555-0101',
  status: 'ACTIVE',
}];

const queryResult = (data: unknown[], isLoading = false, error?: unknown) => ({
  result: { data, total: data.length },
  query: { isLoading, isError: Boolean(error), error },
});

function setSession(user: AuthUser = owner) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

describe('BillingAdjustmentPage', () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    useRouterMock.mockReturnValue({ push });
    useListMock.mockReturnValue(queryResult(users));
    useBranchesMock.mockReturnValue(queryResult(branches));
    useCustomMutationMock.mockReturnValue({ mutateAsync: jest.fn(), mutation: { isPending: false } });
  });

  it('requires selected targets and pending-status acknowledgement before creating an adjustment', async () => {
    const mutateAsync = jest.fn();
    useCustomMutationMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<BillingAdjustmentPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create adjustment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Select at least one organization user or branch.');

    fireEvent.click(screen.getByLabelText(/Alex Cashier/));
    fireEvent.click(screen.getByRole('button', { name: 'Create adjustment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirm that selected additions may become pending');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends only selected target IDs and opens the backend-created billing record', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: {
      success: true,
      billing: { id: 'adjustment-1', _id: 'adjustment-1' },
    } });
    useCustomMutationMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<BillingAdjustmentPage />);
    fireEvent.click(screen.getByLabelText(/Alex Cashier/));
    fireEvent.click(screen.getByLabelText(/Main Branch/));
    fireEvent.click(screen.getByLabelText(/I understand that selected additions/));
    fireEvent.click(screen.getByRole('button', { name: 'Create adjustment' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      url: '/billing/adjustments',
      method: 'post',
      values: { userIds: ['user-1'], branchIds: ['branch-1'] },
    }));
    expect(mutateAsync.mock.calls[0][0].values).not.toHaveProperty('organizationId');
    expect(push).toHaveBeenCalledWith('/app/billing/adjustment-1');
  });

  it('keeps billing management owner-only and maps backend errors safely', async () => {
    setSession({ ...owner, role: 'MANAGER' });
    const managerPage = render(<BillingAdjustmentPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Only an organization owner can make this billing change.');
    expect(useListMock).not.toHaveBeenCalled();
    expect(useCustomMutationMock).not.toHaveBeenCalled();

    managerPage.unmount();
    setSession();
    useCustomMutationMock.mockReturnValue({
      mutateAsync: jest.fn().mockRejectedValue({ status: 400, message: 'database billing details' }),
      mutation: { isPending: false },
    });
    render(<BillingAdjustmentPage />);
    fireEvent.click(screen.getByLabelText(/Alex Cashier/));
    fireEvent.click(screen.getByLabelText(/I understand that selected additions/));
    fireEvent.click(screen.getByRole('button', { name: 'Create adjustment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The selected additions could not be added to a billing adjustment.');
    expect(screen.queryByText(/database billing details/)).not.toBeInTheDocument();
  });
});