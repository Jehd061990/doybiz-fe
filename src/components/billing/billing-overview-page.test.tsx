import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCustom, useCustomMutation, useList } from '@refinedev/core';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { BillingEstimate, BillingRecord, OrganizationSubscription } from '@/types/billing';
import { BillingOverviewPage } from './billing-overview-page';

jest.mock('@refinedev/core', () => ({
  useCustom: jest.fn(),
  useCustomMutation: jest.fn(),
  useList: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCustomMock = useCustom as jest.Mock;
const useCustomMutationMock = useCustomMutation as jest.Mock;
const useListMock = useList as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
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

const estimate: BillingEstimate = {
  plan: { id: 'plan-1', name: 'DoyBiz Standard', code: 'STANDARD', currency: 'PHP', billingInterval: 'MONTHLY' },
  setupFee: 5000,
  activeOrganizationUsers: 8,
  includedUserSeats: 6,
  additionalUserCount: 2,
  monthlyBranchCharges: 2998,
  additionalUserCharges: 400,
  monthlyTotal: 3398,
  currency: 'PHP',
  breakdown: [],
  additionalUserDetails: [],
};

const subscription: OrganizationSubscription = {
  status: 'ACTIVE',
  paymentTermMonths: 3,
  startedAt: '2026-01-01T00:00:00.000Z',
  currentPeriodStart: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: '2026-11-30T23:59:59.999Z',
  setupFeeStatus: 'PAID',
};

const billingRecord: BillingRecord = {
  id: 'billing-1',
  invoiceNumber: 'INV-2026-000001',
  billingType: 'ADJUSTMENT',
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-11-30T23:59:59.999Z',
  subtotal: 506.67,
  setupFee: 0,
  branchCharges: 0,
  additionalUserCharges: 506.67,
  lineItems: [{ description: 'Additional user charge', targetType: 'USER', branchCharge: 0, additionalUserCharge: 506.67, amount: 506.67 }],
  totalAmount: 506.67,
  currency: 'PHP',
  status: 'PENDING',
  dueDate: '2026-09-30T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const listQuery = (data: BillingRecord[] = [billingRecord], isLoading = false, error?: unknown) => ({
  result: { data, total: data.length },
  query: { isLoading, isError: Boolean(error), error, refetch: jest.fn() },
});

const customQuery = (data: unknown, isLoading = false, error?: unknown) => ({
  result: { data },
  query: { isLoading, isError: Boolean(error), error, refetch: jest.fn() },
});

function setSession(user: AuthUser = owner) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

function setOverview(records: BillingRecord[] = [billingRecord]) {
  useListMock.mockReturnValue(listQuery(records));
  useCustomMock.mockImplementation(({ url }: { url: string }) => url === '/subscription/estimate'
    ? customQuery({ success: true, estimate })
    : customQuery({ success: true, subscription }));
}

describe('BillingOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    setOverview();
    useRouterMock.mockReturnValue({ push: jest.fn() });
    useCustomMutationMock.mockReturnValue({ mutateAsync: jest.fn(), mutation: { isPending: false } });
  });

  it('renders seat counts and estimate exactly as returned by the backend', () => {
    render(<BillingOverviewPage />);

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('₱3,398.00')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'INV-2026-000001' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending adjustments' })).toBeInTheDocument();
    expect(screen.getAllByText('₱506.67')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Create prepaid adjustment' })).toHaveAttribute('href', '/app/billing/adjustments/create');
  });

  it('shows loading and safely handles an unauthorized billing response', () => {
    useListMock.mockReturnValue(listQuery([], true));
    const { rerender } = render(<BillingOverviewPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading billing information');

    useListMock.mockReturnValue(listQuery([], false, { status: 403, message: 'internal billing details' }));
    rerender(<BillingOverviewPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Billing access is not available for your account.');
    expect(screen.queryByText('internal billing details')).not.toBeInTheDocument();
  });

  it('shows an empty history state while retaining backend seat information', () => {
    setOverview([]);
    render(<BillingOverviewPage />);

    expect(screen.getByText('No billing records found.')).toBeInTheDocument();
    expect(screen.getByText('Active users')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('does not show owner billing mutation controls to a manager', () => {
    setSession({ ...owner, role: 'MANAGER' });
    setOverview([]);
    render(<BillingOverviewPage />);

    expect(screen.queryByRole('button', { name: 'Generate current invoice' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create prepaid adjustment' })).not.toBeInTheDocument();
  });

  it('generates an invoice using the backend action and refetches returned billing records', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: { success: true, billing: billingRecord } });
    useCustomMutationMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    setOverview([]);
    render(<BillingOverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate current invoice' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      url: '/billing/generate',
      method: 'post',
      values: {},
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Invoice INV-2026-000001 is ready.');
  });

  it('starts an initial prepaid subscription using an allowed term and opens the setup invoice', async () => {
    const generateInvoice = jest.fn();
    const activateSubscription = jest.fn().mockResolvedValue({ data: {
      success: true,
      subscription,
      setupInvoice: { ...billingRecord, id: 'setup-1', invoiceNumber: 'INV-SETUP-1' },
    } });
    let mutationHookCall = 0;
    useCustomMutationMock.mockImplementation(() => {
      const currentHook = mutationHookCall++ % 2;
      return {
        mutateAsync: currentHook === 0 ? generateInvoice : activateSubscription,
        mutation: { isPending: false },
      };
    });
    useListMock.mockReturnValue(listQuery([]));
    useCustomMock.mockImplementation(({ url }: { url: string }) => url === '/subscription/estimate'
      ? customQuery({ success: true, estimate })
      : customQuery({ success: true, subscription: null }));
    const push = jest.fn();
    useRouterMock.mockReturnValue({ push });
    render(<BillingOverviewPage />);
    fireEvent.change(screen.getByLabelText('Prepaid term'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start prepaid subscription' }));

    await waitFor(() => expect(activateSubscription).toHaveBeenCalledWith({
      url: '/subscription/activate',
      method: 'post',
      values: { paymentTermMonths: 6 },
    }));
    expect(push).toHaveBeenCalledWith('/app/billing/setup-1');
  });
});