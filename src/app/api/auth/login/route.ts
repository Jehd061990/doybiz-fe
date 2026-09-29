import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_SECONDS, AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth/cookies';
import type { AuthUser } from '@/types/auth';

interface BackendLoginResponse {
  success?: boolean;
  token?: unknown;
  user?: unknown;
  message?: unknown;
}

const safeLoginError = (message: unknown, status: number) => {
  if (typeof message === 'string' && message.includes('organizationId is required')) {
    return {
      code: 'ORGANIZATION_REQUIRED',
      message: 'We could not complete sign-in. Contact your organization administrator for help.',
    };
  }
  if (status === 400 || status === 401) {
    return { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect, or the account is inactive.' };
  }
  return { code: 'AUTH_SERVICE_ERROR', message: 'Unable to sign in right now. Try again shortly.' };
};

const toPublicUser = (value: unknown): AuthUser | null => {
  if (typeof value !== 'object' || value === null) return null;
  const user = value as Record<string, unknown>;
  if (typeof user._id !== 'string' || typeof user.organizationId !== 'string'
    || typeof user.name !== 'string' || typeof user.email !== 'string'
    || (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'CASHIER')
    || (user.status !== 'ACTIVE' && user.status !== 'INACTIVE')
    || (user.branchAccess !== 'ALL' && !Array.isArray(user.branchAccess))
    || !Array.isArray(user.modulePermissions)) return null;

  return {
    _id: user._id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role,
    branchAccess: user.branchAccess as string[] | 'ALL',
    modulePermissions: user.modulePermissions as AuthUser['modulePermissions'],
    ...(typeof user.permissionPreset === 'string' ? { permissionPreset: user.permissionPreset as AuthUser['permissionPreset'] } : {}),
    status: user.status,
  };
};

export async function POST(request: NextRequest) {
  const backendApiUrl = process.env.DOYBIZ_API_URL?.replace(/\/+$/, '');
  if (!backendApiUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured.' }, { status: 500 });
  }

  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'A valid JSON login request is required.' }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${backendApiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });
    const result = await backendResponse.json() as BackendLoginResponse;
    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, ...safeLoginError(result.message, backendResponse.status) },
        { status: backendResponse.status },
      );
    }

    const user = toPublicUser(result.user);
    if (!user || typeof result.token !== 'string' || result.success !== true) {
      return NextResponse.json({ success: false, message: 'The backend returned an invalid login response.' }, { status: 502 });
    }

    const response = NextResponse.json({ success: true, user });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: AUTH_SESSION_SECONDS,
    };
    response.cookies.set(AUTH_TOKEN_COOKIE, result.token, cookieOptions);
    response.cookies.set(AUTH_USER_COOKIE, JSON.stringify(user), cookieOptions);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: 'Unable to reach the backend. Try again shortly.' }, { status: 502 });
  }
}
