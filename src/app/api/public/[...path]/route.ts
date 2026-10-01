import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function proxyPublicRequest(request: NextRequest, context: RouteContext) {
  const backendApiUrl = process.env.DOYBIZ_API_URL?.replace(/\/+$/, '');
  if (!backendApiUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured.' }, { status: 500 });
  }

  const { path } = await context.params;
  const suffix = path.map(segment => encodeURIComponent(segment)).join('/');
  const url = `${backendApiUrl}/public/${suffix}`;
  const headers = new Headers({ accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // The public backend resolver uses the incoming host for production domain
  // resolution and query tenant identifiers for local development.
  const incomingHost = request.headers.get('host');
  if (incomingHost) headers.set('host', incomingHost);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const upstream = await fetch(`${url}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to reach the backend. Try again shortly.' },
      { status: 502 },
    );
  }
}

export const GET = proxyPublicRequest;
export const POST = proxyPublicRequest;