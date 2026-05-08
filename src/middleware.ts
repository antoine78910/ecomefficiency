import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

function extractEmailFromJwt(token: string): string | null {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const payloadRaw = decodeBase64Url(parts[1])
    if (!payloadRaw) return null
    const payload = JSON.parse(payloadRaw) as { email?: string }
    const email = String(payload?.email || '').toLowerCase().trim()
    return email || null
  } catch {
    return null
  }
}

function extractSupabaseSessionEmail(req: NextRequest): string | null {
  try {
    const allCookies = req.cookies.getAll()
    for (const cookie of allCookies) {
      if (!cookie?.name?.startsWith('sb-')) continue
      const raw = decodeURIComponent(String(cookie.value || ''))
      const candidates = [raw]
      if (raw.startsWith('base64-')) {
        const decoded = decodeBase64Url(raw.slice('base64-'.length))
        if (decoded) candidates.push(decoded)
      }
      const jwtMatch = raw.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
      if (jwtMatch?.[0]) {
        const email = extractEmailFromJwt(jwtMatch[0])
        if (email) return email
      }
      for (const c of candidates) {
        try {
          const parsed = JSON.parse(c) as any
          const directEmail = String(parsed?.email || parsed?.user?.email || parsed?.[0]?.email || parsed?.[0]?.user?.email || '').toLowerCase().trim()
          if (directEmail) return directEmail
          const at = String(parsed?.access_token || parsed?.[0]?.access_token || '')
          const fromJwt = extractEmailFromJwt(at)
          if (fromJwt) return fromJwt
        } catch {}
      }
    }
  } catch {}
  return null
}

// Host-based routing for the app subdomain.
// - app.localhost:5000/      → /app
// - app.localhost:5000/tools → /tools (unchanged)
// - app.localhost:5000/account → /account (unchanged)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 🔐 Admin token gate (protects /admin and /api/admin)
  const isAdminSurface =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')

  if (isAdminSurface) {
    // Requested behavior: allow admin only for the expected signed-in session user.
    const allowedAdminEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()
    const sessionEmail = extractSupabaseSessionEmail(req)
    const hasUserAuth = (() => {
      try {
        const allCookies = req.cookies.getAll()
        return (
          allCookies.some((c) => c.name.startsWith('sb-') && c.value && c.value.length > 10) ||
          req.cookies.get('ee-auth')?.value === '1'
        )
      } catch {
        return false
      }
    })()
    const hasAllowedSession = Boolean(sessionEmail && sessionEmail === allowedAdminEmail)

    if (!hasUserAuth || !hasAllowedSession) {
      const target = req.nextUrl.clone()
      target.pathname = '/sign-in'
      target.search = ''
      return NextResponse.redirect(target, 302)
    }

    const res = NextResponse.next()
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
  const bareHost = host.toLowerCase().split(':')[0].replace(/^www\./, '')

  // ✅ Always keep /app on the app subdomain (prevents checkout success landing on marketing host)
  if (bareHost === 'ecomefficiency.com' && !host.toLowerCase().startsWith('app.') && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
    const target = url.clone()
    target.protocol = 'https:'
    target.hostname = 'app.ecomefficiency.com'
    target.port = ''
    return NextResponse.redirect(target, 308)
  }

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

