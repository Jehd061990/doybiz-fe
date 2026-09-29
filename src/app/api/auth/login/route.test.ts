/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from './route';

const loginRequest = () => new NextRequest('http://localhost/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'owner@example.com', password: 'wrong-password' }),
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.DOYBIZ_API_URL = 'http://backend.test/api';
  });

  afterEach(() => jest.restoreAllMocks());

  it('sets the JWT in an HttpOnly cookie without returning it to the browser', async () => {
    const user = {
      _id: 'user-1',
      organizationId: 'org-1',
      name: 'Workspace Owner',
      email: 'owner@example.com',
      role: 'OWNER',
      branchAccess: 'ALL',
      modulePermissions: ['POS'],
      status: 'ACTIVE',
    };
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      token: 'server-only-test-token',
      user,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await POST(loginRequest());
    const body = await response.json();
    const tokenCookie = response.cookies.get('doybiz_token');

    expect(body).toEqual({ success: true, user });
    expect(body).not.toHaveProperty('token');
    expect(tokenCookie?.value).toBe('server-only-test-token');
    expect(tokenCookie?.httpOnly).toBe(true);
    expect(response.cookies.get('doybiz_user')?.httpOnly).toBe(true);
  });

  it('returns a safe organization-required response without exposing backend detail', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      message: 'organizationId is required when email is associated with multiple organizations',
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(body).toEqual({
      success: false,
      code: 'ORGANIZATION_REQUIRED',
      message: 'We could not complete sign-in. Contact your organization administrator for help.',
    });
    expect(body.message).not.toContain('organizationId');
    expect(body.message).not.toContain('multiple organizations');
  });

  it('does not expose raw invalid-credential errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      message: 'Invalid credentials or inactive account',
    }), { status: 400, headers: { 'content-type': 'application/json' } }));

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(body).toEqual({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect, or the account is inactive.',
    });
    expect(body.message).not.toContain('Invalid credentials or inactive account');
  });
});