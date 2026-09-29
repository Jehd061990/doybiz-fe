export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  apiBase?: string;
}

interface ApiErrorPayload {
  message?: unknown;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly payload?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const resolveApiUrl = (path: string, apiBase = '/api/backend'): string => {
  if (/^https?:\/\//i.test(path)) return path;
  if (apiBase === '') return path.startsWith('/') ? path : `/${path}`;
  return `${apiBase.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const apiBase = options.apiBase === undefined ? '/api/backend' : options.apiBase;
  const url = resolveApiUrl(path, apiBase);
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  const payload: unknown = response.status === 204
    ? undefined
    : contentType.includes('application/json')
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload
      ? (payload as ApiErrorPayload).message
      : undefined;
    throw new ApiError(typeof message === 'string' ? message : `Request failed (${response.status})`, response.status, payload);
  }

  return payload as T;
}
