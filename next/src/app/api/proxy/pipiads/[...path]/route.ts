import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PIPIADS_BASE_URL = 'https://app.pipiads.com';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const pathStr = Array.isArray(path) ? path.join('/') : '';
    const search = req.nextUrl.search || '';
    const targetUrl = `${PIPIADS_BASE_URL}/${pathStr}${search}`;

    console.log('[PROXY][PIPIADS][GET]', targetUrl);

    const headers = new Headers();
    
    // Forward important headers
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      headers.set('Cookie', cookieHeader);
    }
    
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }

    headers.set('User-Agent', req.headers.get('user-agent') || 'Mozilla/5.0');
    headers.set('Referer', PIPIADS_BASE_URL);
    headers.set('Origin', PIPIADS_BASE_URL);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    
    // Forward important response headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    // Forward cookies
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.set('Set-Cookie', setCookie);
    }

    // CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (e: any) {
    console.error('[PROXY][PIPIADS][GET] Error:', e);
    return NextResponse.json({ error: 'Proxy error', message: e.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const pathStr = Array.isArray(path) ? path.join('/') : '';
    const search = req.nextUrl.search || '';
    const targetUrl = `${PIPIADS_BASE_URL}/${pathStr}${search}`;

    console.log('[PROXY][PIPIADS][POST]', targetUrl);

    const headers = new Headers();
    
    // Forward important headers
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      headers.set('Cookie', cookieHeader);
    }
    
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }

    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    headers.set('User-Agent', req.headers.get('user-agent') || 'Mozilla/5.0');
    headers.set('Referer', PIPIADS_BASE_URL);
    headers.set('Origin', PIPIADS_BASE_URL);

    const body = await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    
    const respContentType = response.headers.get('content-type');
    if (respContentType) {
      responseHeaders.set('Content-Type', respContentType);
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      responseHeaders.set('Set-Cookie', setCookie);
    }

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    const respBody = await response.arrayBuffer();

    return new NextResponse(respBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (e: any) {
    console.error('[PROXY][PIPIADS][POST] Error:', e);
    return NextResponse.json({ error: 'Proxy error', message: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

