import { apiRequest } from './client';
import { apiDataProvider } from './data-provider';

jest.mock('./client', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly payload?: unknown) {
      super(message);
    }
  },
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);

describe('Refine user and branch endpoint mappings', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('loads the complete organization-scoped users endpoint and unwraps its response', async () => {
    apiRequestMock.mockResolvedValueOnce({
      success: true,
      users: [{ _id: 'user-1', name: 'Owner', passwordHash: undefined }],
    });

    const result = await apiDataProvider.getList({
      resource: 'users',
      pagination: { currentPage: 1, pageSize: 100 },
      filters: [],
      sorters: [],
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/users');
    expect(result).toEqual({
      data: [{ _id: 'user-1', id: 'user-1', name: 'Owner', passwordHash: undefined }],
      total: 1,
    });
  });

  it('uses the exact user create, get, and patch contracts', async () => {
    apiRequestMock
      .mockResolvedValueOnce({ success: true, user: { _id: 'user-2', name: 'Cashier' } })
      .mockResolvedValueOnce({ success: true, user: { _id: 'user-2', name: 'Cashier' } })
      .mockResolvedValueOnce({ success: true, user: { _id: 'user-2', name: 'Cashier Updated' } });

    await apiDataProvider.create({
      resource: 'users',
      variables: { name: 'Cashier', email: 'cashier@example.com', role: 'CASHIER' },
    });
    await apiDataProvider.getOne({ resource: 'users', id: 'user-2' });
    await apiDataProvider.update({
      resource: 'users',
      id: 'user-2',
      variables: { name: 'Cashier Updated', applyPreset: false },
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/users', {
      method: 'POST',
      body: { name: 'Cashier', email: 'cashier@example.com', role: 'CASHIER' },
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/users/user-2');
    expect(apiRequestMock).toHaveBeenNthCalledWith(3, '/users/user-2', {
      method: 'PATCH',
      body: { name: 'Cashier Updated', applyPreset: false },
    });
  });

  it('accepts the existing bare organization branch array response', async () => {
    apiRequestMock.mockResolvedValueOnce([{ _id: 'branch-1', name: 'Main Branch' }]);

    const result = await apiDataProvider.getList({
      resource: 'branches',
      pagination: { currentPage: 1, pageSize: 100 },
      filters: [],
      sorters: [],
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/branches');
    expect(result.data).toEqual([{ _id: 'branch-1', id: 'branch-1', name: 'Main Branch' }]);
  });

  it('creates a branch with only the backend-supported fields and unwraps its raw response', async () => {
    const branch = {
      _id: 'branch-2',
      organizationId: 'org-1',
      name: 'North Branch',
      address: '12 North Road',
      contactNumber: '555-0102',
      status: 'ACTIVE',
    };
    apiRequestMock.mockResolvedValueOnce(branch);

    const result = await apiDataProvider.create({
      resource: 'branches',
      variables: {
        name: 'North Branch',
        address: '12 North Road',
        contactNumber: '555-0102',
        status: 'ACTIVE',
      },
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/branches', {
      method: 'POST',
      body: {
        name: 'North Branch',
        address: '12 North Road',
        contactNumber: '555-0102',
        status: 'ACTIVE',
      },
    });
    expect(result.data).toEqual({ ...branch, id: 'branch-2' });
  });

  it('does not invent organization, branch detail, or branch update endpoints', async () => {
    await expect(apiDataProvider.getList({
      resource: 'organizations',
      pagination: { currentPage: 1, pageSize: 20 },
      filters: [],
      sorters: [],
    })).rejects.toMatchObject({ status: 404 });
    await expect(apiDataProvider.getOne({ resource: 'branches', id: 'branch-1' }))
      .rejects.toMatchObject({ status: 405 });
    await expect(apiDataProvider.update({
      resource: 'branches',
      id: 'branch-1',
      variables: { status: 'INACTIVE' },
    })).rejects.toMatchObject({ status: 405 });
  });

  it('preserves backend billing detail payments and paid/outstanding totals', async () => {
    const record = {
      _id: 'billing-1',
      invoiceNumber: 'INV-2026-000001',
      billingType: 'ADJUSTMENT',
      totalAmount: 1200,
      currency: 'PHP',
      status: 'PENDING',
    };
    const payments = [{ _id: 'payment-1', amount: 200, status: 'COMPLETED', providerStatus: 'SUCCEEDED' }];
    apiRequestMock.mockResolvedValueOnce({
      success: true,
      record,
      payments,
      paidAmount: 0,
      outstandingAmount: 1200,
    });

    const result = await apiDataProvider.getOne({ resource: 'billing', id: 'billing-1' });

    expect(apiRequestMock).toHaveBeenCalledWith('/billing/billing-1');
    expect(result.data).toEqual({
      ...record,
      id: 'billing-1',
      payments,
      paidAmount: 0,
      outstandingAmount: 1200,
    });
  });
});