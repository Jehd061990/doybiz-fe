import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCustomMutation, useOne } from '@refinedev/core';
import { useParams } from 'next/navigation';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { BillingRecordDetail } from '@/types/billing';
import { BillingRecordPage } from './billing-record-page';

jest.mock('@refinedev/core', () => ({ useCustomMutation: jest.fn(), useOne: jest.fn() }));
jest.mock('next/navigation', () => ({ useParams: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCustomMutationMock = useCustomMutation as jest.Mock;
const useOneMock = useOne as jest.Mock;
const useParamsMock = useParams as jest.Mock;
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

const record: BillingRecordDetail = {
  id: 'billing-1',
  invoiceNumber: 'INV-2026-000001',
  billingType: 'ADJUSTMENT',
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-11-30T23:59:59.999Z',
  subtotal: 1200,
  setupFee: 0,
  branchCharges: 0,
  additionalUserCharges: 1200,
  lineItems: [{ description: 'Additional user charge', targetType: 'USER', branchCharge: 0, additionalUserCharge: 1200, amount: 1200 }],
  totalAmount: 1200,
  currency: 'PHP',
  status: 'PENDING',
  dueDate: '2026-09-30T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  payments: [{ id: 'completed-1', amount: 200, paymentMethod: 'GCASH', status: 'COMPLETED', paidAt: '2026-09-02T00:00:00.000Z' }],
  paidAmount: 200,
  outstandingAmount: 1000,
};

function setSession(user: AuthUser = owner) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

function setRecord(value: BillingRecordDetail = record) {
  useOneMock.mockReturnValue({
    result: value,
    query: {
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({ data: { data: value } }),
    },
  });
}

describe('BillingRecordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    setRecord();
    useParamsMock.mockReturnValue({ id: 'billing-1' });
    useCustomMutationMock.mockReturnValue({ mutateAsync: jest.fn(), mutation: { isPending: false } });
  });

  it('renders backend detail totals, line items, and completed payment history', () => {
    render(<BillingRecordPage />);

    expect(screen.getByRole('heading', { name: 'INV-2026-000001' })).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '₱200.00' })).toBeInTheDocument();
    expect(screen.getByText('₱1,000.00')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Additional user charge' })).toBeInTheDocument();
    expect(screen.getByText('GCASH')).toBeInTheDocument();
  });

  it('initiates payment through the billing endpoint and follows only its returned HTTPS action', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ data: {
      success: true,
      record,
      payment: { status: 'PENDING' },
      xenditPayment: {
        id: 'provider-id',
        status: 'ACCEPTING_PAYMENTS',
        reference_id: 'BILLING-billing-1',
        amount: 1200,
        currency: 'PHP',
        actions: [{ name: 'checkout', url: 'https://pay.example.test/checkout' }],
      },
    } });
    useCustomMutationMock.mockReturnValue({ mutateAsync, mutation: { isPending: false } });
    render(<BillingRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Xendit' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      url: '/billing/billing-1/xendit/payment',
      method: 'post',
      values: {},
    }));
    expect(await screen.findByRole('link', { name: 'Continue to payment' })).toHaveAttribute('href', 'https://pay.example.test/checkout');
    expect(screen.getByRole('status')).toHaveTextContent('remains unpaid until backend confirmation');
    expect(screen.getByText(/Provider status: ACCEPTING_PAYMENTS/)).toBeInTheDocument();
  });

  it('keeps paid records read-only', () => {
    setRecord({ ...record, status: 'PAID', paidAmount: 1200, outstandingAmount: 0 });
    render(<BillingRecordPage />);

    expect(screen.getByText('This billing record is read-only.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay with Xendit' })).not.toBeInTheDocument();
  });

  it('disables repeated payment initiation while the backend request is pending', () => {
    useCustomMutationMock.mockReturnValue({ mutateAsync: jest.fn(), mutation: { isPending: true } });
    render(<BillingRecordPage />);

    expect(screen.getByRole('button', { name: 'Starting payment…' })).toBeDisabled();
  });

  it('does not load billing records for a manager without billing-module access', () => {
    setSession({ ...owner, role: 'MANAGER', modulePermissions: ['POS'] });
    render(<BillingRecordPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Billing access is not available for your account.');
    expect(useOneMock).not.toHaveBeenCalled();
  });

  it('shows payment errors safely', async () => {
    useCustomMutationMock.mockReturnValue({
      mutateAsync: jest.fn().mockRejectedValue({ status: 400, message: 'XENDIT_SECRET_KEY is not configured' }),
      mutation: { isPending: false },
    });
    render(<BillingRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Xendit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A payment request could not be created.');
    expect(screen.queryByText(/XENDIT_SECRET_KEY/)).not.toBeInTheDocument();
  });
});