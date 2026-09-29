import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCustom, useCustomMutation } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type { AuthUser } from '@/types/auth';
import type { OrganizationBranch } from '@/types/user-management';
import type { PosCreateSaleResponse, PosPaymentResponse, PosReceipt, PosSale, PosService, PosServiceListResponse } from '@/types/pos';
import { PosPage } from './pos-page';

jest.mock('@refinedev/core', () => ({ useCustom: jest.fn(), useCustomMutation: jest.fn() }));
jest.mock('@/lib/branches/use-branches', () => ({ useBranches: jest.fn() }));
jest.mock('@/lib/auth/use-auth-session', () => ({ useAuthSession: jest.fn() }));

const useCustomMock = useCustom as jest.Mock;
const useCustomMutationMock = useCustomMutation as jest.Mock;
const useBranchesMock = useBranches as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;

const cashier: AuthUser = {
  _id: 'cashier-1',
  organizationId: 'org-1',
  name: 'Casey Cashier',
  email: 'cashier@example.com',
  role: 'CASHIER',
  branchAccess: ['branch-1'],
  modulePermissions: ['POS', 'APPOINTMENTS'],
  permissionPreset: 'CASHIER',
  status: 'ACTIVE',
};

const branches: OrganizationBranch[] = [
  { id: 'branch-1', organizationId: 'org-1', name: 'Main Branch', address: '1 Main Street', contactNumber: '555-0101', status: 'ACTIVE' },
];

const service: PosService = {
  id: 'service-1',
  branchId: 'branch-1',
  name: 'Haircut',
  description: 'Standard haircut',
  price: 300,
  durationMinutes: 30,
  status: 'ACTIVE',
};

const servicesResponse: PosServiceListResponse = {
  success: true,
  data: [service],
  pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
};

const receipt: PosReceipt = {
  business: { name: 'DoyBiz Salon' },
  branch: { name: 'Main Branch' },
  sale: {
    id: 'sale-1', saleNumber: 'SALE-20260929-0001', branchId: 'branch-1', subtotal: 600, discount: 0,
    tax: 0, total: 600, amountPaid: 0, change: 0, paymentStatus: 'UNPAID', status: 'COMPLETED',
    createdAt: '2026-09-29T10:00:00.000Z', updatedAt: '2026-09-29T10:00:00.000Z',
  },
  cashier: { name: 'Casey Cashier' },
  customer: null,
  items: [{ name: 'Haircut', itemType: 'SERVICE', quantity: 2, unitPrice: 300, discount: 0, subtotal: 600, total: 600, durationMinutes: 30 }],
  payments: [],
};

const completedSale: PosSale = receipt.sale;

const branchesQuery = (data: OrganizationBranch[] = branches) => ({
  result: { data, total: data.length },
  query: { isLoading: false, isError: false, error: null },
});

function setSession(user: AuthUser = cashier) {
  useAuthSessionMock.mockReturnValue({
    session: { authenticated: true, organization: { id: user.organizationId }, user },
    isLoading: false,
    error: null,
  });
}

function setPosHooks(
  user: AuthUser = cashier,
  saleMutation = jest.fn().mockResolvedValue({ data: { success: true, sale: completedSale } satisfies PosCreateSaleResponse }),
  paymentMutation = jest.fn().mockResolvedValue({
    data: {
      success: true,
      payment: { amount: 300, amountReceived: 350, change: 50, paymentMethod: 'CASH', status: 'COMPLETED', paidAt: '2026-09-29T10:05:00.000Z' },
      sale: { ...completedSale, amountPaid: 300, change: 50, paymentStatus: 'PARTIALLY_PAID' },
    } satisfies PosPaymentResponse,
  }),
) {
  setSession(user);
  useBranchesMock.mockReturnValue(branchesQuery());
  useCustomMock.mockImplementation(({ url }: { url: string }) => url.startsWith('/services')
    ? { result: { data: servicesResponse }, query: { isLoading: false, isError: false, error: null, refetch: jest.fn() } }
    : { result: { data: { success: true, receipt } }, query: { isLoading: false, isError: false, error: null, refetch: jest.fn() } });
  useCustomMutationMock.mockImplementation(() => {
    const mutationCall = useCustomMutationMock.mock.calls.length;
    return {
      mutateAsync: mutationCall % 2 === 1 ? saleMutation : paymentMutation,
      mutation: { isPending: false },
    };
  });
  return { saleMutation, paymentMutation };
}

describe('PosPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not show POS content without effective POS module permission', () => {
    setPosHooks({ ...cashier, modulePermissions: ['APPOINTMENTS'] });
    render(<PosPage />);

    expect(screen.getByRole('alert')).toHaveTextContent("You don't have access to this module.");
    expect(useBranchesMock).not.toHaveBeenCalled();
  });

  it('shows the service-catalog permission contract gap without pretending POS access is absent', () => {
    setPosHooks({ ...cashier, modulePermissions: ['POS'] });
    render(<PosPage />);
    fireEvent.change(screen.getByLabelText('Sale branch'), { target: { value: 'branch-1' } });

    expect(screen.getByRole('heading', { name: 'Point of sale' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('service catalog requires the APPOINTMENTS module');
    expect(screen.queryByRole('button', { name: 'Add service' })).not.toBeInTheDocument();
    expect(useCustomMock).toHaveBeenCalledWith(expect.objectContaining({
      url: '/services?branchId=branch-1&status=ACTIVE&page=1&limit=100',
      queryOptions: { enabled: false },
    }));
  });

  it('loads only available branches, adds services, and submits backend sale fields before showing confirmation', async () => {
    const { saleMutation } = setPosHooks();
    render(<PosPage />);
    fireEvent.change(screen.getByLabelText('Sale branch'), { target: { value: 'branch-1' } });

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add service' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another (1)' }));
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create sale' }));

    await waitFor(() => expect(saleMutation).toHaveBeenCalledWith({
      url: '/sales',
      method: 'post',
      values: {
        branchId: 'branch-1',
        items: [{ itemType: 'SERVICE', referenceId: 'service-1', quantity: 2, discount: 0 }],
      },
    }));
    expect(await screen.findByRole('heading', { name: 'SALE-20260929-0001' })).toBeInTheDocument();
    expect(screen.getByText('Receipt details')).toBeInTheDocument();
    expect(screen.getAllByText('UNPAID')).toHaveLength(2);
  });

  it('records a partial cash payment and displays backend-confirmed change and status', async () => {
    const { paymentMutation } = setPosHooks();
    render(<PosPage />);
    fireEvent.change(screen.getByLabelText('Sale branch'), { target: { value: 'branch-1' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add service' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create sale' }));
    await screen.findByRole('heading', { name: 'SALE-20260929-0001' });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('Cash received'), { target: { value: '350' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(paymentMutation).toHaveBeenCalledWith({
      url: '/sales/sale-1/payments',
      method: 'post',
      values: { amount: 300, paymentMethod: 'CASH', amountReceived: 350 },
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Change due: ₱50.00');
    expect(screen.getAllByText('PARTIALLY_PAID')).toHaveLength(2);
  });

  it('keeps sale state and cart after backend checkout rejection', async () => {
    const saleMutation = jest.fn().mockRejectedValue({ status: 400, message: 'You do not have access to this branch' });
    setPosHooks(cashier, saleMutation);
    render(<PosPage />);
    fireEvent.change(screen.getByLabelText('Sale branch'), { target: { value: 'branch-1' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add service' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create sale' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose an active branch available to your account.');
    expect(screen.getByRole('button', { name: /Add another/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'SALE-20260929-0001' })).not.toBeInTheDocument();
  });
});