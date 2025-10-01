import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname
  const hostHeader = (req.headers.get('host') || '')
  const hostname = hostHeader.toLowerCase().split(':')[0]
  const bareHostname = hostname.replace(/^www\./, '')
  const hasAuth = Boolean(
    req.cookies.get('sb-access-token') ||
    req.cookies.get('sb:token') ||
    req.cookies.get('sb-refresh-token') ||
    (req.cookies.get('ee-auth')?.value === '1')
  )

  // Pretty aliases to proxy routes
  if (pathname === '/pipiads' || pathname === '/pipiads/') {
    const r = url.clone(); r.pathname = '/proxy/pipiads/dashboard';
    return NextResponse.rewrite(r)
  }
  if (pathname.startsWith('/elevenlabs/')) {
    const r = url.clone(); r.pathname = '/proxy/elevenlabs' + pathname.slice('/elevenlabs'.length);
    return NextResponse.rewrite(r)
  }
  if (pathname.startsWith('/pipiads/')) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname.slice('/pipiads'.length);
    return NextResponse.rewrite(r)
  }
  if (pathname === '/proxy/pipiads' || pathname === '/proxy/pipiads/') {
    const r = url.clone(); r.pathname = '/proxy/pipiads/dashboard';
    return NextResponse.rewrite(r)
  }
  if (/^\/\d+\.\d+\.\d+-[^/]+\//.test(pathname)) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname;
    return NextResponse.rewrite(r)
  }
  if (/^\/v\d+\//.test(pathname)) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname;
    return NextResponse.rewrite(r)
  }

  // tools subdomain legacy routes => redirect to main tools page
  if (hostname === 'tools.localhost' || bareHostname.startsWith('tools.')) {
    if (pathname === '/' || pathname === '' || pathname.startsWith('/pro') || pathname.startsWith('/starter')) {
      const r = url.clone(); r.pathname = '/tools';
      return NextResponse.rewrite(r)
    }
  }

  // Route /tools/seo to /tools but keep intent (will open modal in Tools page)
  if (pathname === '/tools/seo') {
    const r = url.clone(); r.pathname = '/tools';
    return NextResponse.rewrite(r)
  }

  // app subdomain => serve dashboard content directly on root (no rewrite to /app), protect it
  if (hostname === 'app.localhost' || bareHostname.startsWith('app.')) {
    // IMPORTANT: Allow unauthenticated access to root '/' so Supabase auth hash can be processed client-side.
    // Otherwise we lose the #access_token fragment on redirect and the user can't be auto-logged in after email verification.
    if (!hasAuth && pathname !== '/' && pathname !== '' && pathname.startsWith('/app')) {
      const r = url.clone(); r.pathname = '/sign-in';
      r.searchParams.set('callback', pathname + (url.search ? url.search : ''))
      return NextResponse.redirect(r)
    }
    // Disallow marketing routes under app.* (but don't affect API or Next internals)
    if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/public_app_assets')) {
      if (pathname.startsWith('/tools')) {
        const r = url.clone(); r.pathname = '/';
        return NextResponse.rewrite(r)
      }
    }
    // Do not rewrite to /app anymore; let / (root) render its own route under app.*
  }

  // If user is signed-in on main domain, send to app subdomain root (robust for localhost and custom ports)
  if (hasAuth && !(hostname === 'app.localhost' || bareHostname.startsWith('app.'))) {
    const r = url.clone();
    if (hostname === 'localhost') {
      r.hostname = 'app.localhost';
      r.pathname = '/';
      return NextResponse.redirect(r)
    }
    r.hostname = 'app.' + bareHostname.replace(/^app\./, '')
    r.pathname = '/';
    return NextResponse.redirect(r)
  }

  return NextResponse.next()
}

// Skip middleware for Next.js internals and assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public_app_assets).*)',
  ],
}

