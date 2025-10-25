import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './integrations/supabase/middleware'
import { performSecurityCheck, getClientIP } from './lib/security'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // 🔒 SÉCURITÉ : Vérification des blocages IP et pays
  // Skip security check for admin routes and static assets
  if (!pathname.startsWith('/admin') && 
      !pathname.startsWith('/_next') && 
      !pathname.startsWith('/api/admin') &&
      !pathname.includes('.')) {
    
    try {
      const clientIP = getClientIP(req)
      const userAgent = req.headers.get('user-agent') || ''
      
      const securityCheck = await performSecurityCheck(
        clientIP, 
        userAgent, 
        pathname
      )
      
      if (securityCheck.isBlocked) {
        console.log(`🚫 Accès bloqué: ${clientIP} - ${securityCheck.reason}`)
        
        // Retourner une page de service indisponible simple
        const blockedResponse = new NextResponse(
          `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Service unavailable</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #000;
                margin: 0; padding: 0; min-height: 100vh;
                display: flex; align-items: center; justify-content: center;
                color: white;
              }
              .container { 
                text-align: center; max-width: 400px; margin: 2rem;
              }
              .icon { font-size: 3rem; margin-bottom: 1rem; }
              h1 { color: white; margin-bottom: 1rem; font-size: 1.5rem; }
              p { color: #999; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🚫</div>
              <h1>Service unavailable</h1>
              <p>Our service is temporarily unavailable</p>
            </div>
          </body>
          </html>
          `,
          {
            status: 503,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Security-Block': 'true',
              'X-Block-Reason': securityCheck.reason || 'unknown'
            }
          }
        )
        return blockedResponse
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de sécurité:', error)
      // En cas d'erreur, on continue (ne pas bloquer l'app)
    }
  }
  
  // Skip Supabase session update for admin routes (they have their own auth)
  let response: NextResponse
  if (pathname.startsWith('/admin')) {
    response = NextResponse.next({ request: { headers: req.headers } })
  } else {
    // Update Supabase session cookies first
    const supabaseResponse = await updateSession(req)
    // If Supabase middleware returned a response, use it as base
    response = supabaseResponse
  }
  const url = req.nextUrl
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
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }
  if (pathname.startsWith('/elevenlabs/')) {
    const r = url.clone(); r.pathname = '/proxy/elevenlabs' + pathname.slice('/elevenlabs'.length);
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }
  if (pathname.startsWith('/pipiads/')) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname.slice('/pipiads'.length);
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }
  if (pathname === '/proxy/pipiads' || pathname === '/proxy/pipiads/') {
    const r = url.clone(); r.pathname = '/proxy/pipiads/dashboard';
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }
  if (/^\/\d+\.\d+\.\d+-[^/]+\//.test(pathname)) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname;
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }
  if (/^\/v\d+\//.test(pathname)) {
    const r = url.clone(); r.pathname = '/proxy/pipiads' + pathname;
    response = NextResponse.rewrite(r, { request: { headers: req.headers } })
    return response
  }

  // tools subdomain routes
  if (hostname === 'tools.localhost' || bareHostname.startsWith('tools.')) {
    // /starter => marketing starter tools page
    if (pathname === '/starter') {
      const r = url.clone(); r.pathname = '/startertools';
      return NextResponse.rewrite(r)
    }
    // /pro => marketing pro tools page
    if (pathname === '/pro') {
      const r = url.clone(); r.pathname = '/protools';
      return NextResponse.rewrite(r)
    }
    // default legacy to /tools (keep root only)
    if (pathname === '/' || pathname === '') {
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
    if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/public_app_assets') && !pathname.startsWith('/app_assets')) {
      // Allow static assets like /tools-logos/* under app.*
      if (/^\/tools(\/|$)/.test(pathname)) {
        const r = url.clone(); r.pathname = '/';
        return NextResponse.rewrite(r)
      }
    }
    // Do not rewrite to /app anymore; let / (root) render its own route under app.*
  }

  // Do not auto-redirect signed-in users from main domain to app.*; stay on landing or current page

  return response
}

// Skip middleware for Next.js internals and assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public_app_assets|app_assets).*)',
  ],
}

