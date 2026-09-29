import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth/cookies';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function proxyBackendRequest(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });

  const backendApiUrl = process.env.DOYBIZ_API_URL?.replace(/\/+$/, '');
  if (!backendApiUrl) return NextResponse.json({ success: false, message: 'Backend API URL is not configured.' }, { status: 500 });

  const { path } = await context.params;
  const suffix = path.map(segment => encodeURIComponent(segment)).join('/');
  const url = `${backendApiUrl}/${suffix}${request.nextUrl.search}`;
  const headers = new Headers({ authorization: `Bearer ${token}`, accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    const response = new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
    if (upstream.status === 401) {
      for (const name of [AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE]) {
        response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
      }
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, message: 'Unable to reach the backend. Try again shortly.' }, { status: 502 });
  }
}

export const GET = proxyBackendRequest;
export const POST = proxyBackendRequest;
export const PATCH = proxyBackendRequest;
export const PUT = proxyBackendRequest;
export const DELETE = proxyBackendRequest;
