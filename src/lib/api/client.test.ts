import { resolveApiUrl } from './client';

describe('API URL resolution', () => {
  it('routes backend resources through the same-origin proxy', () => {
    expect(resolveApiUrl('/users')).toBe('/api/backend/users');
    expect(resolveApiUrl('/billing/estimate')).toBe('/api/backend/billing/estimate');
  });

  it('keeps auth routes on the same origin without the backend proxy prefix', () => {
    expect(resolveApiUrl('/api/auth/session', '')).toBe('/api/auth/session');
  });
});
