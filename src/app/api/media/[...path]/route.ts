import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const backendApiUrl = process.env.DOYBIZ_API_URL?.replace(/\/+$/, '');
  if (!backendApiUrl) {
    return NextResponse.json(
      { success: false, message: 'Backend API URL is not configured.' },
      { status: 500 },
    );
  }

  // DOYBIZ_API_URL includes the /api prefix for JSON endpoints, but uploaded
  // files are served by Express at /uploads/media (outside the /api namespace).
  const backendOrigin = backendApiUrl.replace(/\/api$/i, '');
  const { path } = await context.params;
  const safePath = path.map(segment => encodeURIComponent(segment)).join('/');

  try {
    const upstream = await fetch(\`\${backendOrigin}/uploads/media/\${safePath}\`, {
      cache: 'no-store',
      redirect: 'manual',
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const headers = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) headers.set('cache-control', cacheControl);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unable to load media.' },
      { status: 502 },
    );
  }
}
