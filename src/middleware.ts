import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Host-based routing for the app subdomain.
// - app.localhost:5000/      → /app
// - app.localhost:5000/tools → /tools (unchanged)
// - app.localhost:5000/account → /account (unchanged)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 🔐 Admin token gate (protects /admin and /api/admin)
  const expectedAdminToken = process.env.ADMIN_PANEL_TOKEN || 'Zjhfc82005ad'
  const isAdminSurface =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')

  if (isAdminSurface) {
    const queryToken = String(req.nextUrl.searchParams.get('token') || '')
    const cookieToken = String(req.cookies.get('ee_admin_token')?.value || '')
    const provided = queryToken || cookieToken

    if (!expectedAdminToken || provided !== expectedAdminToken) {
      return new NextResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Unauthorized</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial"><div style="max-width:520px;padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)"><h1 style="margin:0 0 10px;font-size:22px">Unauthorized</h1><p style="margin:0;color:rgba(255,255,255,.65);font-size:14px;line-height:1.5">Open <code style="background:rgba(255,255,255,.08);padding:.12rem .35rem;border-radius:.4rem">/admin?token=…</code> with the correct token.</p></div></body></html>`,
        {
          status: 401,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      )
    }

    const shouldSetCookie = queryToken && queryToken === expectedAdminToken && cookieToken !== expectedAdminToken
    if (pathname.startsWith('/admin') && queryToken) {
      const clean = req.nextUrl.clone()
      clean.searchParams.delete('token')
      const res = NextResponse.redirect(clean, 302)
      if (shouldSetCookie) {
        res.cookies.set('ee_admin_token', expectedAdminToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: req.nextUrl.protocol === 'https:',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        })
      }
      res.headers.set('X-Robots-Tag', 'noindex, nofollow')
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    const res = NextResponse.next()
    if (shouldSetCookie) {
      res.cookies.set('ee_admin_token', expectedAdminToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

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

  // partners portal should not expose /app (reserved for app.* and custom domains)
  if (host.startsWith('partners.') && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Block /dashboard on all domains EXCEPT partners.* (it's only for partners.ecomefficiency.com)
  if (!host.startsWith('partners.') && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) {
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/sign-in'
    return NextResponse.redirect(redirectUrl)
  }

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

