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
});