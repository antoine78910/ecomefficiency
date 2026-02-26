import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './integrations/supabase/middleware'
import { performSecurityCheck, getClientIP } from './lib/security'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const userAgent = req.headers.get('user-agent') || ''
  // Allow search engines + key AI crawlers (prevents accidental de-indexing via 503 security blocks)
  const isSearchBot =
    /googlebot|google-inspectiontool|googleother|google-extended|adsbot-google|mediapartners-google|storebot-google|apis-google|feedfetcher-google|bingbot|duckduckbot|baiduspider|yandexbot|slurp|facebookexternalhit|twitterbot|linkedinbot|gptbot|chatgpt-user/i.test(
      userAgent
    )

  // 🔐 Admin token gate (protects /admin and /api/admin)
  // - Access with /admin?token=Zjhfc82005ad once, it sets a httpOnly cookie.
  // - Afterwards, navigation + API calls are allowed via cookie.
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
        `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Unauthorized</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial} .card{max-width:520px;padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)} .muted{color:rgba(255,255,255,.65);font-size:14px;line-height:1.5} code{background:rgba(255,255,255,.08);padding:.12rem .35rem;border-radius:.4rem}</style></head><body><div class="card"><h1 style="margin:0 0 10px;font-size:22px">Unauthorized</h1><p class="muted" style="margin:0 0 14px">This area is protected.</p><p class="muted" style="margin:0">Open <code>/admin?token=…</code> with the correct token.</p></div></body></html>`,
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

    // If token is provided via query, store it once as cookie.
    const shouldSetCookie = queryToken && queryToken === expectedAdminToken && cookieToken !== expectedAdminToken

    // For page routes, clean the URL (remove token) after setting cookie.
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
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }
      res.headers.set('X-Robots-Tag', 'noindex, nofollow')
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    const res = NextResponse.next({ request: { headers: req.headers } })
    if (shouldSetCookie) {
      res.cookies.set('ee_admin_token', expectedAdminToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
  
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
  const isLocalhostHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')

  // ✅ Cleanup redirects for known junk URLs seen in GSC.
  // These should never be indexed; redirecting removes noisy 404s.
  let cleanedPathname = pathname
  if (cleanedPathname === '/fr' || cleanedPathname.startsWith('/fr/')) cleanedPathname = '/'
  if (cleanedPathname === '/&' || cleanedPathname.includes('&')) {
    cleanedPathname = cleanedPathname.replace(/&+/g, '').replace(/\/{2,}/g, '/') || '/'
    if (!cleanedPathname.startsWith('/')) cleanedPathname = `/${cleanedPathname}`
  }
  if (cleanedPathname === '/tools/veo-3' || cleanedPathname === '/tools/gemini-nanobanana') cleanedPathname = '/tools'

  // Avoid changing host here: host canonicalization is handled by the platform (Vercel domains).
  // Doing it in both places can create redirect loops.
  const xfProto = String(req.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase()
  const isHttp = xfProto === 'http' || req.nextUrl.protocol === 'http:'
  // Local dev must stay on http://localhost (otherwise it redirects to https://localhost and fails)
  if (isHttp && !isLocalhostHost) {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.port = ''
    target.pathname = cleanedPathname
    return NextResponse.redirect(target, 308)
  }

  if (cleanedPathname !== pathname) {
    const r = url.clone(); r.pathname = cleanedPathname
    return NextResponse.redirect(r, 308)
  }

  // Marketing host should be canonicalized at the platform layer (Vercel/DNS),
  // not in middleware (prevents redirect loops showing up as "redirect errors" in Search Console).
  const MARKETING_HOST = 'ecomefficiency.com'

  // Keep marketing content (/blog, /articles) on the main domain only
  // This prevents duplicate indexing across subdomains like app.* and tools.*
  const isAppSubdomain = hostname === 'app.localhost' || bareHostname.startsWith('app.')
  const isToolsSubdomain = hostname === 'tools.localhost' || bareHostname.startsWith('tools.')
  const isPartnersSubdomain = hostname === 'partners.localhost' || bareHostname.startsWith('partners.')

  // ✅ Partners portal isolation:
  // Partners UI must live on partners.* only (not on app.*).
  // This prevents browser back/refresh from landing users on app.ecomefficiency.com/dashboard?slug=...
  // Note: do NOT redirect /signin (app auth relies on it in this codebase).
  const isPartnersOnlyPath =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/configuration' ||
    pathname.startsWith('/configuration/') ||
    pathname === '/lp' ||
    pathname.startsWith('/lp/')

  if (isAppSubdomain && isPartnersOnlyPath && !isLocalhostHost) {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.hostname = 'partners.ecomefficiency.com'
    target.port = ''
    return NextResponse.redirect(target, 308)
  }
  const isMarketingPath =
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/articles' ||
    pathname.startsWith('/articles/')

  if ((isAppSubdomain || isToolsSubdomain || isPartnersSubdomain) && isMarketingPath) {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.hostname = MARKETING_HOST
    target.port = ''
    return NextResponse.redirect(target, 308)
  }

  const isKnownDomain =
    bareHostname === 'ecomefficiency.com' ||
    bareHostname.endsWith('.ecomefficiency.com') ||
    bareHostname.endsWith('localhost')

  // ✅ Always keep /app on the app subdomain.
  // Fixes Stripe success redirect landing on www.ecomefficiency.com/app?checkout=success (no auth + wrong styling).
  if (bareHostname === 'ecomefficiency.com' && !hostname.startsWith('app.') && (pathname === '/app' || pathname.startsWith('/app/'))) {
    const target = new URL(req.nextUrl.toString())
    target.protocol = 'https:'
    target.hostname = 'app.ecomefficiency.com'
    target.port = ''
    return NextResponse.redirect(target, 308)
  }

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

    // Also allow public partner pages on partners.<domain>/<slug>
    // This is the default URL shown in the partners dashboard.
    const isPublicPartnerSlugPath = (() => {
      try {
        if (!pathname || pathname === '/' || pathname.includes('.') || pathname.includes('//')) return false;
        if (!/^\/[a-z0-9-]{2,40}$/i.test(pathname)) return false;
        const slug = pathname.slice(1).toLowerCase();
        const reserved = new Set([
          'lp',
          'signin',
          'signup',
          'dashboard',
          'configuration',
          'api',
          '_next',
          'robots.txt',
          'sitemap.xml',
        ]);
        return !reserved.has(slug);
      } catch {
        return false;
      }
    })();

    if (isPartnersProd && !(isAllowedPartnersPath || isPublicPartnerSlugPath)) {
      const target = new URL(req.nextUrl.toString());
      target.protocol = 'https:';
      target.hostname = MARKETING_HOST;
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
    // Never expose partners portal pages on app.* (local + prod).
    // This prevents duplicate surfaces like app.localhost/dashboard?slug=...
    if (
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname === '/configuration' ||
      pathname.startsWith('/configuration/') ||
      pathname === '/lp' ||
      pathname.startsWith('/lp/')
    ) {
      const r = url.clone();
      r.pathname = '/app';
      r.search = '';
      return NextResponse.redirect(r, 308);
    }

    // Serve the app at "/" via rewrite (keeps URL for auth hash flows, avoids redirects)
    if (pathname === '/' || pathname === '') {
      const r = url.clone();
      r.pathname = '/app';
      return NextResponse.rewrite(r, { request: { headers: req.headers } });
    }

    // On app.*, /signin and /signup always show the app page (avoid partners signin + redirect loop).
    if (pathname === '/signin' || pathname.startsWith('/signin/') || pathname === '/signup' || pathname.startsWith('/signup/')) {
      const r = url.clone();
      r.pathname = '/app';
      // keep search (e.g. callback=/app) so the app can redirect after login
      return NextResponse.redirect(r, 302);
    }

    // Do NOT redirect unauthenticated /app to /signin on app.* — serve /app and let the app show login.
    // (Redirecting caused a loop: /signin -> /app -> /signin.)
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
  // Ensure private/auth-heavy pages are never indexed (even if discovered via external links).
  // Note: /api/* is excluded from middleware matcher, so we cover only page routes here.
  const isPrivatePath =
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/subscription' ||
    pathname.startsWith('/subscription/') ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    pathname === '/create-customer-portal-session' ||
    pathname.startsWith('/create-customer-portal-session/') ||
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/') ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-up/') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password/') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/verify-email' ||
    pathname.startsWith('/verify-email/') ||
    pathname === '/classic-login' ||
    pathname.startsWith('/classic-login/') ||
    pathname === '/domains' ||
    pathname.startsWith('/domains/') ||
    pathname === '/proxy' ||
    pathname.startsWith('/proxy/');

  if (isPrivatePath) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response
}

// Skip middleware for Next.js internals and assets
export const config = {
  matcher: [
    // Exclude Next internals, API routes, and common static assets/folders to save Edge CPU
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public_app_assets|app_assets|tools-logos|tools-images|images|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|css|js|map)).*)',
  ],
}

