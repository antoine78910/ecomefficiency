import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './integrations/supabase/middleware'
import { performSecurityCheck, getClientIP } from './lib/security'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const userAgent = req.headers.get('user-agent') || ''
  // Allow search engine crawlers (prevents accidental de-indexing via 503 security blocks)
  const isSearchBot =
    /googlebot|google-inspectiontool|bingbot|duckduckbot|baiduspider|yandexbot|slurp|facebookexternalhit|twitterbot|linkedinbot/i.test(
      userAgent
    )
  
  // 🔒 SÉCURITÉ : Vérification des blocages IP et pays
  // Skip security check for admin routes and static assets
  if (!pathname.startsWith('/admin') && 
      !pathname.startsWith('/_next') && 
      !pathname.startsWith('/api/admin') &&
      !pathname.includes('.') &&
      !isSearchBot) {
    
    try {
      const clientIP = getClientIP(req)
      
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
              // Ensure temporary block pages never get indexed
              'X-Robots-Tag': 'noindex, nofollow',
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
  let hasAuth = false
  if (pathname.startsWith('/admin')) {
    response = NextResponse.next({ request: { headers: req.headers } })
  } else {
    // Update Supabase session cookies first
    try {
      const supabaseResponse = await updateSession(req)
      // If Supabase middleware returned a response, use it as base
      response = supabaseResponse
      
      // Check auth AFTER updateSession: check all cookies that might indicate auth
      // Supabase uses cookies like sb-<project-id>-auth-token, so we check for any sb-* cookie
      const allCookies = req.cookies.getAll()
      hasAuth = allCookies.some(c => 
        c.name.startsWith('sb-') && c.value && c.value.length > 10
      ) || Boolean(req.cookies.get('ee-auth')?.value === '1')
    } catch (error) {
      // Never fail the whole request if Supabase middleware throws (prevents 500 MIDDLEWARE_INVOCATION_FAILED)
      console.error('Supabase middleware error:', error)
      response = NextResponse.next({ request: { headers: req.headers } })
      // Fallback: check cookies from request
      const allCookies = req.cookies.getAll()
      hasAuth = allCookies.some(c => 
        c.name.startsWith('sb-') && c.value && c.value.length > 10
      ) || Boolean(req.cookies.get('ee-auth')?.value === '1')
    }
  }
  const url = req.nextUrl
  const hostHeader = (req.headers.get('host') || '')
  const hostname = hostHeader.toLowerCase().split(':')[0]
  const bareHostname = hostname.replace(/^www\./, '')

  // Canonicalize host to avoid duplicate indexing (www vs non-www)
  // Primary host: https://ecomefficiency.com
  if (hostname === 'www.ecomefficiency.com') {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.hostname = 'ecomefficiency.com'
    target.port = ''
    return NextResponse.redirect(target, 308)
  }

  // Keep marketing content (/blog, /articles) on the main domain only
  // This prevents duplicate indexing across subdomains like app.* and tools.*
  const isAppSubdomain = hostname === 'app.localhost' || bareHostname.startsWith('app.')
  const isToolsSubdomain = hostname === 'tools.localhost' || bareHostname.startsWith('tools.')
  const isPartnersSubdomain = hostname === 'partners.localhost' || bareHostname.startsWith('partners.')
  const isMarketingPath =
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/articles' ||
    pathname.startsWith('/articles/')

  if ((isAppSubdomain || isToolsSubdomain || isPartnersSubdomain) && isMarketingPath) {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.hostname = 'ecomefficiency.com'
    target.port = ''
    return NextResponse.redirect(target, 308)
  }

  const isKnownDomain =
    bareHostname === 'ecomefficiency.com' ||
    bareHostname.endsWith('.ecomefficiency.com') ||
    bareHostname.endsWith('localhost')

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
    // Serve dedicated tools subdomain landing (keep root only)
    if (pathname === '/' || pathname === '' || pathname === '/tools' || pathname === '/tools/') {
      const r = url.clone(); r.pathname = '/tools-subdomain';
      return NextResponse.rewrite(r)
    }
  }

  // partners subdomain routes (white-label onboarding portal)
  // Note: we intentionally keep paths clean (/signup, /signin, /configuration) on partners.*
  if (hostname === 'partners.localhost' || bareHostname.startsWith('partners.')) {
    // On partners.ecomefficiency.com we want a fully separate surface:
    // only the partners portal + /lp should be accessible. Everything else should live on www.ecomefficiency.com.
    const isPartnersProd =
      bareHostname === 'partners.ecomefficiency.com' ||
      (bareHostname.startsWith('partners.') && bareHostname.endsWith('.ecomefficiency.com'));
    const isAllowedPartnersPath =
      pathname === '/' ||
      pathname === '' ||
      pathname === '/lp' ||
      pathname.startsWith('/lp/') ||
      pathname === '/signin' ||
      pathname.startsWith('/signin/') ||
      pathname === '/signup' ||
      pathname.startsWith('/signup/') ||
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname === '/configuration' ||
      pathname.startsWith('/configuration/');

    if (isPartnersProd && !isAllowedPartnersPath) {
      const target = new URL(req.nextUrl.toString());
      target.protocol = 'https:';
      target.hostname = 'ecomefficiency.com';
      target.port = '';
      return NextResponse.redirect(target);
    }

    // partners portal should not expose /app (reserved for app.* and custom domains)
    if (pathname === '/app' || pathname.startsWith('/app/')) {
      const r = url.clone(); r.pathname = '/dashboard';
      return NextResponse.redirect(r)
    }
    // If already authenticated, avoid bouncing users back to /signin.
    if (hasAuth && (pathname === '/signin' || pathname === '/signin/')) {
      const r = url.clone(); r.pathname = '/dashboard';
      return NextResponse.redirect(r)
    }
    // Default entry point
    if (pathname === '/' || pathname === '') {
      // Serve the partners landing page on root without changing URL
      const r = url.clone();
      r.pathname = '/lp';
      return NextResponse.rewrite(r)
    }
    // Allow everything else to resolve normally (App Router routes handle auth/onboarding)
    return response
  }

  // Custom domains (white-label public domains): serve dedicated /signin and /signup (do NOT redirect to /sign-in /sign-up)
  // This avoids blank pages caused by main-domain auth redirects on custom hosts.
  const isCustomDomain =
    !isKnownDomain &&
    !(hostname === 'tools.localhost' || bareHostname.startsWith('tools.')) &&
    !(hostname === 'app.localhost' || bareHostname.startsWith('app.')) &&
    !(hostname === 'partners.localhost' || bareHostname.startsWith('partners.'));

  if (isCustomDomain) {
    // Serve partner landing at "/" via rewrite (keeps URL stable, avoids redirects)
    if (pathname === '/' || pathname === '') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/signin' || pathname === '/signin/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/signin`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/signup' || pathname === '/signup/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/signup`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/app' || pathname === '/app/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/app`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/verify-email' || pathname === '/verify-email/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/verify-email`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/terms' || pathname === '/terms/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/terms`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/privacy' || pathname === '/privacy/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/privacy`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    if (pathname === '/terms-of-sale' || pathname === '/terms-of-sale/') {
      const r = url.clone();
      r.pathname = `/domains/${bareHostname}/terms-of-sale`;
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    // Note: / (root) is handled server-side in `app/page.tsx` via host detection.
  }

  // ONLY redirect /sign-in to /signin for custom white-label domains (not ecomefficiency.com, app.*, or partners.*)
  // Main domain (ecomefficiency.com) and app.* use /sign-in and /sign-up (with dashes) natively.
  // partners.* uses /signin (no dash) and is handled separately above.
  const isMainOrAppDomain = 
    bareHostname === 'ecomefficiency.com' || 
    bareHostname.startsWith('app.') ||
    bareHostname.startsWith('partners.') ||
    hostname.endsWith('localhost');
  
  if (!isMainOrAppDomain) {
    if (pathname === '/sign-in' || pathname === '/sign-in/') {
      const r = url.clone(); r.pathname = '/signin';
      return NextResponse.redirect(r)
    }
    if (pathname === '/sign-up' || pathname === '/sign-up/') {
      const r = url.clone(); r.pathname = '/signup';
      return NextResponse.redirect(r)
    }
  }
  // Configuration is partners-only
  if (pathname === '/configuration' || pathname.startsWith('/configuration/')) {
    const r = url.clone(); r.pathname = '/';
    return NextResponse.redirect(r)
  }

  // Route /tools/seo to /tools but keep intent (will open modal in Tools page)
  if (pathname === '/tools/seo') {
    const r = url.clone(); r.pathname = '/tools';
    return NextResponse.rewrite(r)
  }

  // Handle /sign-in and /sign-up on main domain: do not rewrite or redirect if not on app subdomain
  // This is a catch-all for the main domain to ensure it serves the marketing site's auth pages correctly
  if ((pathname === '/sign-in' || pathname === '/sign-up') && !hostname.includes('app.')) {
    return response;
  }

  // app subdomain => serve dashboard content directly on root (no rewrite to /app), protect it
  if (hostname === 'app.localhost' || bareHostname.startsWith('app.')) {
    // Serve the app at "/" via rewrite (keeps URL for auth hash flows, avoids redirects)
    if (pathname === '/' || pathname === '') {
      const r = url.clone();
      r.pathname = '/app';
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }
    // IMPORTANT: Allow unauthenticated access to root '/' so Supabase auth hash can be processed client-side.
    // Otherwise we lose the #access_token fragment on redirect and the user can't be auto-logged in after email verification.
    
    // Explicitly handle /signin and /signup on app subdomain to prevent loop
    if (pathname === '/signin' || pathname === '/signup') {
      return response;
    }

    if (!hasAuth && pathname !== '/' && pathname !== '' && pathname.startsWith('/app')) {
      const r = url.clone(); r.pathname = '/signin';
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
    // Exclude Next internals, API routes, and common static assets/folders to save Edge CPU
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public_app_assets|app_assets|tools-logos|tools-images|images|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|css|js|map)).*)',
  ],
}

