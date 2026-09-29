/** @jest-environment node */

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('expires both HttpOnly authentication cookies', async () => {
    const response = await POST();
    const cookies = response.headers.get('set-cookie') || '';

    expect(response.status).toBe(200);
    expect(cookies).toContain('doybiz_token=');
    expect(cookies).toContain('doybiz_user=');
    expect(cookies).toMatch(/Max-Age=0/i);
  });
});