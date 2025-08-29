import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Host-based routing for the app subdomain.
// - app.localhost:5000/      → /app
// - app.localhost:5000/tools → /tools (unchanged)
// - app.localhost:5000/account → /account (unchanged)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Pretty alias: /pipiads/* → /proxy/pipiads/*
  if (pathname === '/pipiads' || pathname === '/pipiads/') {
    const url = req.nextUrl.clone()
    url.pathname = '/proxy/pipiads/dashboard'
    return NextResponse.rewrite(url)
  }
  if (pathname.startsWith('/pipiads/')) {
    const url = req.nextUrl.clone()
    url.pathname = '/proxy/pipiads' + pathname.slice('/pipiads'.length)
    return NextResponse.rewrite(url)
  }
  // Redirect bare /proxy/pipiads (optionally with trailing slash) to dashboard by default
  if (pathname === '/proxy/pipiads' || pathname === '/proxy/pipiads/') {
    const url = req.nextUrl.clone()
    url.pathname = '/proxy/pipiads/dashboard'
    return NextResponse.rewrite(url)
  }
  // Rewrite Pipiads runtime assets like /3.7.5-xxxx/... to /proxy/pipiads/...
  if (/^\/\d+\.\d+\.\d+-[^/]+\//.test(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = '/proxy/pipiads' + pathname
    return NextResponse.rewrite(url)
  }
  // Rewrite Pipiads API like /v1/... to /proxy/pipiads/v1/...
  if (/^\/v\d+\//.test(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = '/proxy/pipiads' + pathname
    return NextResponse.rewrite(url)
  }


  const url = req.nextUrl
  const host = req.headers.get('host') || ''

  if (host.startsWith('app.')) {
    // Map root to /app
    if (url.pathname === '/') {
      const rewriteUrl = url.clone()
      rewriteUrl.pathname = '/app'
      return NextResponse.rewrite(rewriteUrl)
    }
    // Map /tools → /app/tools for app subdomain
    if (url.pathname === '/tools') {
      const rewriteUrl = url.clone()
      rewriteUrl.pathname = '/app/tools'
      return NextResponse.rewrite(rewriteUrl)
    }
    // Map /account under app subdomain directly
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}

