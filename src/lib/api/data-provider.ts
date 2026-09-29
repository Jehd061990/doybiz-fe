import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CustomParams,
  CustomResponse,
  DataProvider,
  GetListParams,
  GetListResponse,
  GetManyParams,
  GetManyResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core';
import { ApiError, apiRequest } from './client';

const resources = new Set(['users', 'branches', 'billing']);

const recordFrom = <TData extends BaseRecord = BaseRecord>(value: unknown): TData => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError('The backend returned an invalid record.', 502, value);
  }
  const record = value as Record<string, unknown>;
  const id = typeof record._id === 'string' || typeof record._id === 'number'
    ? record._id
    : record.id;
  if (typeof id !== 'string' && typeof id !== 'number') {
    throw new ApiError('The backend record is missing its identifier.', 502, value);
  }
  return { ...record, id } as TData;
};

const property = (value: unknown, name: string): unknown =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[name] : undefined;

const requireResource = (resource: string) => {
  if (!resources.has(resource)) throw new ApiError(`Unsupported backend resource: ${resource}`, 404);
};

const unsupported = (resource: string, operation: string): never => {
  throw new ApiError(`The backend does not support ${operation} for ${resource}.`, 405);
};

const getOneRecord = async <TData extends BaseRecord = BaseRecord>(resource: string, id: string | number): Promise<TData> => {
  requireResource(resource);
  if (resource === 'branches') return unsupported(resource, 'getOne');
  const payload = await apiRequest<unknown>(`/${resource}/${encodeURIComponent(String(id))}`);
  const record = recordFrom<TData>(property(payload, resource === 'users' ? 'user' : 'record'));
  if (resource === 'billing') {
    return {
      ...record,
      payments: property(payload, 'payments'),
      paidAmount: property(payload, 'paidAmount'),
      outstandingAmount: property(payload, 'outstandingAmount'),
    } as TData;
  }
  return record;
};

const createRecord = async <TData extends BaseRecord = BaseRecord>(resource: string, variables: object): Promise<TData> => {
  requireResource(resource);
  if (resource === 'billing') return unsupported(resource, 'create');
  const payload = await apiRequest<unknown>(`/${resource}`, { method: 'POST', body: variables });
  return recordFrom(property(payload, resource === 'users' ? 'user' : 'branch') ?? payload);
};

export const apiDataProvider: DataProvider = {
  getApiUrl: () => '/api/backend',
  getList: async <TData extends BaseRecord = BaseRecord>({ resource }: GetListParams): Promise<GetListResponse<TData>> => {
    requireResource(resource);
    const payload = await apiRequest<unknown>(`/${resource}`);
    const rows = Array.isArray(payload)
      ? payload
      : property(payload, resource) ?? (resource === 'billing' ? property(payload, 'billing') : undefined);
    if (!Array.isArray(rows)) throw new ApiError(`The backend returned an invalid ${resource} list.`, 502, payload);
    const data = rows.map(row => recordFrom<TData>(row));
    return { data, total: data.length };
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams): Promise<GetOneResponse<TData>> => ({
    data: await getOneRecord<TData>(resource, id),
  }),
  getMany: async <TData extends BaseRecord = BaseRecord>({ resource, ids }: GetManyParams): Promise<GetManyResponse<TData>> => ({
    data: await Promise.all(ids.map(id => getOneRecord<TData>(resource, id))),
  }),
  create: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>({ resource, variables }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    if (typeof variables !== 'object' || variables === null) return unsupported(resource, 'create');
    return { data: await createRecord<TData>(resource, variables) };
  },
  createMany: async () => unsupported('resources', 'createMany'),
  update: async <TData extends BaseRecord = BaseRecord, TVariables = unknown>({ resource, id, variables }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    requireResource(resource);
    if (resource !== 'users') return unsupported(resource, 'update');
    if (typeof variables !== 'object' || variables === null) return unsupported(resource, 'update');
    const payload = await apiRequest<unknown>(`/users/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: variables });
    return { data: recordFrom<TData>(property(payload, 'user')) };
  },
  updateMany: async () => unsupported('resources', 'updateMany'),
  deleteOne: async ({ resource }) => unsupported(resource, 'delete'),
  deleteMany: async () => unsupported('resources', 'deleteMany'),
  custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>({ url, method, payload, headers }: CustomParams<TQuery, TPayload>): Promise<CustomResponse<TData>> => {
    const response = await apiRequest<unknown>(url, {
      method: method.toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      body: payload,
      headers,
    });
    return { data: response as TData };
  },
};
