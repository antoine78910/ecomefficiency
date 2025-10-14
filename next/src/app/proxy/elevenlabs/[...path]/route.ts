import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://elevenlabs.io'
// Force deployment: Extended session cookies to 30 days
const SHEET_HTML_URL = process.env.ELEVENLABS_SHEET_HTML_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpOisYNfPcQUJoqTXDLoUw3-jrwGkgXNHXg7uHT4-e0uKYVOZwqbzmGzG1bLVXz3Ork-KlhAyGo57V/pubhtml'

function normalizeHeadersForBrowser(resHeaders: Headers, proxyBase: string) {
  // Avoid double-decoding errors in the browser
  resHeaders.delete('content-encoding')
  resHeaders.delete('content-length')
  // Allow our inline fixes
  resHeaders.delete('content-security-policy')
  // Rewrite redirect locations to proxy path
  const loc = resHeaders.get('location')
  if (loc) {
    try {
      const u = new URL(loc, UPSTREAM)
      if (u.origin === UPSTREAM) {
        // Static assets go to /elevenlabs, app/pages go to the session-aware proxyBase
        const rewrittenPath = u.pathname.startsWith('/_next') || u.pathname.includes('/static/')
          ? '/elevenlabs' + u.pathname
          : proxyBase + u.pathname
        const proxied = rewrittenPath + (u.search || '')
        resHeaders.set('location', proxied)
      }
    } catch {}
  }
}

function rewriteRequestCookiesForSession(cookieHeader: string | null, sessionKey: string | null): string | null {
  if (!cookieHeader) return null
  if (!sessionKey) return cookieHeader
  const prefix = `s${sessionKey}_`
  const parts = cookieHeader.split(';').map(s => s.trim()).filter(Boolean)
  const kept: string[] = []
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    const value = part.slice(eq + 1)
    if (name.startsWith(prefix)) {
      const upstreamName = name.slice(prefix.length)
      if (upstreamName) kept.push(`${upstreamName}=${value}`)
    }
  }
  return kept.length ? kept.join('; ') : ''
}

function buildUpstreamHeaders(req: NextRequest, sessionKey: string | null): HeadersInit {
  const headers: HeadersInit = {
    'user-agent': req.headers.get('user-agent') || '',
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'accept-encoding': 'identity', // disable compression to prevent decoding mismatch
    'referer': UPSTREAM + '/',
    'origin': UPSTREAM,
  }
  const cookie = rewriteRequestCookiesForSession(req.headers.get('cookie'), sessionKey)
  if (cookie !== null) (headers as any)['cookie'] = cookie
  return headers
}

type Ctx = { params: Promise<{ path?: string[] }> }

function extractSession(path?: string[]) {
  let segs = path ? [...path] : []
  let sessionKey: string | null = null
  if (segs[0] === 's' && /^[0-9]{5}$/.test(String(segs[1] || ''))) {
    sessionKey = String(segs[1])
    segs.splice(0, 2)
  }
  // Detect trailing account index like /app/home/1 → use for session namespacing
  let accFromPath: number | null = null
  if (segs[0] === 'app' && segs.length >= 2) {
    const last = String(segs[segs.length - 1] || '')
    if (/^[1-4]$/.test(last)) {
      accFromPath = parseInt(last, 10)
      segs = segs.slice(0, -1)
    }
  }
  const upstreamPath = '/' + segs.join('/')
  const proxyBase = '/proxy/elevenlabs' + (sessionKey ? `/s/${sessionKey}` : '')
  const publicBase = '/elevenlabs' + (sessionKey ? `/s/${sessionKey}` : '')
  return { sessionKey, proxyBase, publicBase, upstreamPath, accFromPath }
}

function rewriteSetCookiesForSession(from: Headers, to: Headers, proxyBase: string, sessionKey: string | null, isHttps: boolean) {
  to.delete('set-cookie')
  for (const [k, v] of from.entries()) {
    if (k.toLowerCase() === 'set-cookie') {
      let rewritten = v
        .replace(/;\s*Domain=[^;]+/gi, '')
        .replace(/;\s*SameSite=Lax/gi, '; SameSite=None')
        .replace(/;\s*SameSite=Strict/gi, '; SameSite=None')
      
      // Add 30-day expiration for session cookies
      if (!/;\s*Max-Age=/i.test(rewritten) && !/;\s*Expires=/i.test(rewritten)) {
        rewritten += '; Max-Age=2592000' // 30 days in seconds
      }
      
      if (sessionKey) {
        const eq = rewritten.indexOf('=')
        if (eq > 0) {
          const name = rewritten.slice(0, eq)
          const rest = rewritten.slice(eq)
          rewritten = `s${sessionKey}_` + name + rest
        }
      }
      if (/;\s*Path=/i.test(rewritten)) {
        rewritten = rewritten.replace(/;\s*Path=[^;]*/i, `; Path=${proxyBase}`)
      } else {
        rewritten += `; Path=${proxyBase}`
      }
      // In dev on http://localhost, browsers ignore Secure cookies and reject SameSite=None without Secure.
      // Relax attributes for local dev to allow cookies to stick.
      if (!isHttps) {
        rewritten = rewritten
          .replace(/;\s*Secure/gi, '')
          .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
      }
      to.append('set-cookie', rewritten)
    }
  }
}

function decodeEntities(s: string): string {
  try {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  } catch { return s }
}

function extractFromSheetHtml(html: string, rowIndex1: number): { email?: string; password?: string } {
  try {
    console.log('[EE][EL][sheet_debug]', { rowIndex1, htmlLength: html.length })
    
    const trMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
    const rows: Array<{ cells: string[]; raw: string }> = trMatches.map(m => {
      const raw = m[0] || ''
      const inner = m[1] || ''
      const tdMatches = Array.from(inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(x => x[1] || '')
      const toText = (c: string) => {
        try {
          const soft = /<div[^>]*class=["'][^"']*softmerge-inner[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(c)?.[1]
          const base = soft != null ? soft : c
          return decodeEntities(base.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\s+/g,' ').trim())
        } catch { return '' }
      }
      const cells = tdMatches.map(toText)
      return { cells, raw }
    })
    
    console.log('[EE][EL][sheet_debug]', { 
      totalRows: rows.length,
      rowsPreview: rows.slice(0, 3).map(r => ({ 
        firstCell: r.cells[0]?.substring(0, 50), 
        cellCount: r.cells.length 
      }))
    })
    
    // Prefer rows whose first cell mentions ElevenLabs
    const serviceRows = rows.filter(r => (r.cells[0] || '').toLowerCase().includes('elevenlabs') && r.cells.length >= 3)
    const pickFrom = serviceRows.length ? serviceRows : rows.filter(r => r.cells.length >= 3)
    const idx = Math.max(1, rowIndex1) - 1
    const chosen = pickFrom[idx] || pickFrom[0]
    
    console.log('[EE][EL][sheet_debug]', { 
      serviceRows: serviceRows.length,
      pickFromRows: pickFrom.length,
      chosenIndex: idx,
      hasChosen: !!chosen
    })
    
    if (!chosen) {
      console.log('[EE][EL][sheet_error]', 'No suitable row found')
      return {}
    }
    
    const email = chosen.cells[1] || ''
    const password = chosen.cells[2] || ''
    
    console.log('[EE][EL][sheet_extracted]', { 
      email, 
      passwordLength: password.length,
      allCells: chosen.cells.map(c => c.substring(0, 20))
    })
    
    return { email, password }
  } catch (error) { 
    console.log('[EE][EL][sheet_error]', error)
    return {} 
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  
  // Direct access - no authentication required
  const upstreamPath = '/' + (path || []).join('/')
  const proxyBase = '/elevenlabs'
  const publicBase = proxyBase
  const publicRoot = proxyBase
  const sessionKey = 'simple'
  const accFromPath = 1
  const url = new URL(req.url)
  const upstreamUrl = new URL(upstreamPath + (url.search || ''), UPSTREAM)
  // Reverse proxy sign-in as well (no external redirect)
  const res = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: buildUpstreamHeaders(req, sessionKey),
    redirect: 'manual',
  })
  const respHeaders = new Headers(res.headers)
  normalizeHeadersForBrowser(respHeaders, publicBase)
  // Bind and namespace cookies to the session path
  const isHttps = (new URL(req.url)).protocol === 'https:'
  rewriteSetCookiesForSession(res.headers, respHeaders, publicBase, sessionKey, isHttps)
  // HTML: best-effort rewrite of asset URLs to /elevenlabs
  const ct = respHeaders.get('content-type') || ''
  if (ct.includes('text/html')) {
    const html = await res.text()
    // Log actual asset URLs found in HTML
    const assetMatches = html.match(/src="[^"]*\.(js|css)"/g) || []
    const assetUrls = assetMatches.slice(0, 5) // Show first 5 assets
    
    console.log('[EE][EL][html_debug]', { 
      htmlLength: html.length,
      hasNextAssets: html.includes('/_next/'),
      hasStaticAssets: html.includes('/static/'),
      assetUrls: assetUrls,
      url: upstreamUrl.toString()
    })
    
    // Get credentials - hardcoded for local testing
    const email = 'wczznbezhttdvtnjqe@enotj.com'
    const password = 'test123??'
    
    console.log('[EE][EL][local_creds]', { 
      emailLength: email.length,
      passwordLength: password.length,
      hasEmail: !!email,
      hasPassword: !!password
    })
    
    console.log('[EE][EL][creds]', { 
      sessionKey,
      acc: accFromPath,
      source: 'hardcoded_local',
      emailLen: email.length,
      passLen: password.length,
      path: upstreamPath
    })
    
    let rewritten = html
      .replaceAll('href="/app_assets/', 'href="/elevenlabs/app_assets/')
      .replaceAll('src="/app_assets/', 'src="/elevenlabs/app_assets/')
      .replaceAll('href="/_next/', 'href="/elevenlabs/_next/')
      .replaceAll('src="/_next/', 'src="/elevenlabs/_next/')
      .replaceAll('href="/static/', 'href="/elevenlabs/static/')
      .replaceAll('src="/static/', 'src="/elevenlabs/static/')
      .replaceAll('href="https://elevenlabs.io/app_assets/', 'href="/elevenlabs/app_assets/')
      .replaceAll('src="https://elevenlabs.io/app_assets/', 'src="/elevenlabs/app_assets/')
      .replaceAll('href="https://elevenlabs.io/_next/', 'href="/elevenlabs/_next/')
      .replaceAll('src="https://elevenlabs.io/_next/', 'src="/elevenlabs/_next/')
      .replaceAll('href="https://elevenlabs.io/static/', 'href="/elevenlabs/static/')
      .replaceAll('src="https://elevenlabs.io/static/', 'src="/elevenlabs/static/')
      .replaceAll('https://elevenlabs.io/app_assets/', '/elevenlabs/app_assets/')
      .replaceAll('https://elevenlabs.io/_next/', '/elevenlabs/_next/')
      .replaceAll('https://elevenlabs.io/static/', '/elevenlabs/static/')
    
    console.log('[EE][EL][html_rewrite]', { 
      originalLength: html.length,
      rewrittenLength: rewritten.length,
      hasElevenlabsAssets: rewritten.includes('/elevenlabs/_next/') || rewritten.includes('/elevenlabs/app_assets/'),
      hasAppAssets: rewritten.includes('/elevenlabs/app_assets/')
    })
    
    rewritten = rewritten
      .replaceAll('href="/app/', `href="${publicBase}/app/`)
      .replaceAll('src="/app/', `src="${publicBase}/app/`)
      .replaceAll('action="/app/', `action="${publicBase}/app/`)
      .replaceAll('href="https://elevenlabs.io/app/', `href="${publicBase}/app/`)
      .replaceAll('src="https://elevenlabs.io/app/', `src="${publicBase}/app/`)
      .replaceAll('href="/public_app_assets/', 'href="/public_app_assets/')
      .replaceAll('src="/public_app_assets/', 'src="/public_app_assets/')
      .replaceAll('https://payload.elevenlabs.io', '/proxy/elapi')
    
    // Add auto-login script if credentials are available
    if (email && password && upstreamPath.includes('/sign-in')) {
      const autoLoginScript = `
        <div id="elevenlabs-loader" style="
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: #000000; color: white; display: flex; flex-direction: column; 
          justify-content: center; align-items: center; z-index: 9999; font-family: system-ui;
        ">
          <div style="text-align: center; max-width: 400px; padding: 40px;">
            <div style="width: 60px; height: 60px; border: 4px solid #374151; border-top: 4px solid #7c3aed; 
                        border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 30px;"></div>
            <h2 style="margin: 0 0 15px; font-size: 28px; font-weight: 600; color: white;">Logging you to the ElevenLabs account...</h2>
            <p style="margin: 0 0 40px; opacity: 0.7; color: #9ca3af; font-size: 16px;">Please wait while we automatically log you in.</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
              <div style="background: #1a1a1a; border: 1px solid #374151; border-radius: 8px; padding: 15px; text-align: left;">
                <div style="color: #7c3aed; font-size: 12px; font-weight: 500; margin-bottom: 5px;">EMAIL</div>
                <div style="color: #e5e7eb; font-size: 14px;">wczznbezhttdvtnjqe@enotj.com</div>
              </div>
              <div style="background: #1a1a1a; border: 1px solid #374151; border-radius: 8px; padding: 15px; text-align: left;">
                <div style="color: #7c3aed; font-size: 12px; font-weight: 500; margin-bottom: 5px;">PASSWORD</div>
                <div style="color: #e5e7eb; font-size: 14px;">••••••••</div>
              </div>
            </div>
          </div>
          <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </div>
        
        <script>
        (function() {
          // Show loader immediately
          const loader = document.getElementById('elevenlabs-loader');
          if (loader) loader.style.display = 'flex';
          
          // Hide loader and redirect to home after successful login
          function checkForRedirect() {
            if (location.pathname.includes('/app/home') || location.pathname.includes('/app/dashboard')) {
              if (loader) loader.style.display = 'none';
              return true;
            }
            return false;
          }
          
          // Check every 2 seconds for redirect
          const redirectChecker = setInterval(() => {
            if (checkForRedirect()) {
              clearInterval(redirectChecker);
            }
          }, 2000);
          
          // Hide loader after 30 seconds max
          setTimeout(() => {
            if (loader) loader.style.display = 'none';
            clearInterval(redirectChecker);
          }, 30000);
          
          let tries = 0;
          const maxTries = 50;
          
          function poll() {
            tries++;
            
            // Find email input using multiple strategies
            let emailInput = document.querySelector('input[type="email"], input[name="email"]');
            if (!emailInput) {
              const inputs = document.querySelectorAll('input[placeholder]');
              for (const input of inputs) {
                const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
                if (placeholder.includes('email') || placeholder.includes('mail')) {
                  emailInput = input;
                  break;
                }
              }
            }
            
            const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
            
            // Find submit button using multiple strategies
            let submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
            if (!submitBtn) {
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('sign in') || text.includes('log in') || text.includes('login') || text.includes('submit')) {
                  submitBtn = btn;
                  break;
                }
              }
            }
            
            if (emailInput && passwordInput && submitBtn && tries <= maxTries) {
              emailInput.value = '${email}';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              passwordInput.value = '${password}';
              passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
              passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              setTimeout(() => {
                submitBtn.click();
              }, 100);
            } else if (tries < maxTries) {
              setTimeout(poll, 1000);
            } else {
              // Hide loader if max tries reached
              if (loader) loader.style.display = 'none';
            }
          }
          
          setTimeout(poll, 2000);
        })();
        </script>
      `;
      
      // Insert script before closing body tag
      if (rewritten.includes('</body>')) {
        rewritten = rewritten.replace('</body>', autoLoginScript + '</body>');
      } else {
        rewritten += autoLoginScript;
      }
    }
    
    // Firebase auth iframe/handler to same-origin to avoid third-party storage restrictions
    rewritten = rewritten
      .replace(/src=\"\/?__\/auth\//g, 'src="'+`${publicRoot}`+'/__/auth/')
      .replace(/href=\"\/?__\/auth\//g, 'href="'+`${publicRoot}`+'/__/auth/')
      .replace(/src=\"https:\/\/elevenlabs\.io\/__\/auth\//g, 'src="'+`${publicRoot}`+'/__/auth/')
      .replace(/href=\"https:\/\/elevenlabs\.io\/__\/auth\//g, 'href="'+`${publicRoot}`+'/__/auth/')
      // Firebase config scripts to same-origin path so they run in first-party context
      .replaceAll('src="/__/firebase/', `src="${publicRoot}/__/firebase/`)
      .replaceAll('href="/__/firebase/', `href="${publicRoot}/__/firebase/`)
      .replaceAll('src="https://elevenlabs.io/__/firebase/', `src="${publicRoot}/__/firebase/`)
      .replaceAll('href="https://elevenlabs.io/__/firebase/', `href="${publicRoot}/__/firebase/`)
      // Drop heavy sentry/monitoring, cookie banners, and preloads to reduce noise
      // Also drop inline/meta CSP that would block our fixes
      .replace(/<link[^>]*sentry[^>]*>/gi, '')
      .replace(/<script[^>]*sentry[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*cookiebot[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*src=["'][^"']*cookiebot[^"']*["'][^>]*><\/script>/gi, '')
      .replace(/<script[^>]*src=["'][^"']*consentcdn[^"']*["'][^>]*><\/script>/gi, '')
      .replace(/<meta[^>]*http-equiv=["']content-security-policy["'][^>]*>/gi, '')
      .replace(/<link[^>]*preload[^>]*>/g, '')
      // Proxy API calls to our endpoint to bypass CORS
      .replaceAll('https://api.us.elevenlabs.io', '/proxy/elapi')
      .replaceAll('https://api.elevenlabs.io', '/proxy/elapi')
      // Google identity/recaptcha endpoints via proxy
      .replaceAll('https://identitytoolkit.googleapis.com', '/proxy/gid')
      .replaceAll('https://securetoken.googleapis.com', '/proxy/gid')
      .replaceAll('https://recaptchaenterprise.googleapis.com', '/proxy/gid')
      .replaceAll('https://www.googleapis.com', '/proxy/gid')
      // Ensure we can access auth iframes: remove restrictive sandbox and allow same-origin/script
      .replace(/(<iframe[^>]*src=["'][^"']*__\/auth[^>]*?)\s+sandbox=\"[^\"]*\"/gi, '$1')
      .replace(/(<iframe[^>]*src=["'][^"']*__\/auth[^>]*?)\s+sandbox='[^']*'/gi, '$1')
      .replace(/(<iframe[^>]*src=["'][^"']*__\/auth[^>]*?)(?=>)/gi, '$1 sandbox="allow-scripts allow-same-origin allow-forms allow-popups"')
      .replace(/(<iframe[^>]*src=["'][^"']*__\/firebase[^>]*?)\s+sandbox=\"[^\"]*\"/gi, '$1')
      .replace(/(<iframe[^>]*src=["'][^"']*__\/firebase[^>]*?)\s+sandbox='[^']*'/gi, '$1')
      .replace(/(<iframe[^>]*src=["'][^"']*__\/firebase[^>]*?)(?=>)/gi, '$1 sandbox="allow-scripts allow-same-origin allow-forms allow-popups"')

    // Inject a small runtime shim to reroute dynamic fetch/XHR to /proxy/elapi and fix client-side navigations
    const earlyBoot = `
<script>(function(){try{
  var sk='${sessionKey||''}';
  var prev=''; try{ prev=localStorage.getItem('__ee_session_key')||''; }catch{}
  var shouldClear = !!sk && !!prev && prev!==sk;
  if (shouldClear){
    try{ localStorage.clear(); }catch{}
    try{ sessionStorage.clear(); }catch{}
    try{ if (window.indexedDB && indexedDB.databases){ indexedDB.databases().then(function(dbs){ try{ dbs.forEach(function(db){ try{ if(db && db.name) indexedDB.deleteDatabase(db.name); }catch{} }); }catch{} }); } }catch{}
  }
  try{ localStorage.setItem('__ee_session_key', sk || ''); }catch{}
  // EARLY network override so all app scripts proxy through our endpoints
  try{
    var _origFetch = window.fetch;
    window.fetch = function(input, init){
      try{
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (typeof url === 'string'){
          var lower = url.toLowerCase();
          if (
            lower.indexOf('https://api.us.elevenlabs.io')===0 || lower.indexOf('https://api.elevenlabs.io')===0 ||
            lower.indexOf('https://payload.elevenlabs.io')===0 ||
            lower.indexOf('https://identitytoolkit.googleapis.com')===0 || lower.indexOf('https://securetoken.googleapis.com')===0 ||
            lower.indexOf('https://recaptchaenterprise.googleapis.com')===0 || lower.indexOf('https://www.googleapis.com')===0
          ){
          var proxied = url
            .replace('https://api.us.elevenlabs.io','/proxy/elapi')
            .replace('https://api.elevenlabs.io','/proxy/elapi')
            .replace('https://payload.elevenlabs.io','/proxy/elapi')
            .replace('https://identitytoolkit.googleapis.com','/proxy/gid')
            .replace('https://securetoken.googleapis.com','/proxy/gid')
            .replace('https://recaptchaenterprise.googleapis.com','/proxy/gid')
            .replace('https://www.googleapis.com','/proxy/gid');
          var doFetch = function(req){
            return _origFetch(req, init).then(function(res){
              try{
                var u = (typeof req === 'string') ? req : (req && req.url) || '';
                if (typeof u === 'string' && u.indexOf('/proxy/gid')===0 && u.indexOf('accounts:signInWithPassword')>=0){
                  var rc = res.clone(); rc.text().then(function(t){ try{ console.log('[EE][EL][DEBUG][gid signInWithPassword]', { status: res.status, body: (t||'').slice(0,200) }); }catch{} });
                }
              }catch{}
              return res;
            });
          };
          if (typeof input === 'string') return doFetch(proxied);
          var clone = new Request(proxied, input);
          return doFetch(clone);
          }
        }
      }catch{}
      return _origFetch(input, init);
    };
  }catch{}
  try{
    var XO = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url){
      try{
        if (typeof url === 'string'){
          if (
            url.indexOf('https://api.us.elevenlabs.io')===0 || url.indexOf('https://api.elevenlabs.io')===0 ||
            url.indexOf('https://payload.elevenlabs.io')===0 ||
            url.indexOf('https://identitytoolkit.googleapis.com')===0 || url.indexOf('https://securetoken.googleapis.com')===0 ||
            url.indexOf('https://recaptchaenterprise.googleapis.com')===0 || url.indexOf('https://www.googleapis.com')===0
          ){
            url = url
              .replace('https://api.us.elevenlabs.io','/proxy/elapi')
              .replace('https://api.elevenlabs.io','/proxy/elapi')
              .replace('https://payload.elevenlabs.io','/proxy/elapi')
              .replace('https://identitytoolkit.googleapis.com','/proxy/gid')
              .replace('https://securetoken.googleapis.com','/proxy/gid')
              .replace('https://recaptchaenterprise.googleapis.com','/proxy/gid')
              .replace('https://www.googleapis.com','/proxy/gid');
          }
        }
      }catch{}
      return XO.apply(this, [method, url]);
    }
  }catch{}
  // Normalize dynamically-created auth/firebase iframes to same-origin and relax sandbox
  try{
    function __ee_pb(){ try{ var p=location.pathname||''; var i=p.indexOf('/app/'); return (i>=0? p.slice(0,i): ''); }catch{} return ''; }
    function __ee_norm(u){ try{
      if (!u || typeof u!=='string') return u;
      var pb = __ee_pb(); if (!pb) return u;
      if (u.indexOf('https://elevenlabs.io/__/auth/')===0) return pb + u.slice('https://elevenlabs.io'.length);
      if (u.indexOf('https://elevenlabs.io/__/firebase/')===0) return pb + u.slice('https://elevenlabs.io'.length);
      if (u.indexOf('/__/auth/')===0) return pb + u;
      if (u.indexOf('/__/firebase/')===0) return pb + u;
      if (u.indexOf('https://identitytoolkit.googleapis.com')===0) return '/proxy/gid' + u.slice('https://identitytoolkit.googleapis.com'.length);
      if (u.indexOf('https://securetoken.googleapis.com')===0) return '/proxy/gid' + u.slice('https://securetoken.googleapis.com'.length);
      if (u.indexOf('https://recaptchaenterprise.googleapis.com')===0) return '/proxy/gid' + u.slice('https://recaptchaenterprise.googleapis.com'.length);
      if (u.indexOf('https://www.googleapis.com')===0) return '/proxy/gid' + u.slice('https://www.googleapis.com'.length);
      return u;
    }catch{ return u; }}
    var __ee_setAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value){
      try{
        if (this && this.tagName === 'IFRAME' && (name=== 'src' || name=== 'SRC')){
          value = __ee_norm(value);
          try{ this.removeAttribute('sandbox'); }catch{}
          try{ this.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups'); }catch{}
        }
      }catch{}
      return __ee_setAttr.call(this, name, value);
    };
    var __ee_append = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child){
      try{
        if (child && child.tagName === 'IFRAME'){
          try{ var s = child.getAttribute('src')||''; var ns = __ee_norm(s); if (ns !== s) child.setAttribute('src', ns); }catch{}
          try{ child.removeAttribute('sandbox'); child.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups'); }catch{}
        }
      }catch{}
      return __ee_append.call(this, child);
    };
    setInterval(function(){ try{ Array.from(document.querySelectorAll('iframe')).forEach(function(f){ try{ var s=f.getAttribute('src')||''; var ns=__ee_norm(s); if (ns!==s) f.setAttribute('src', ns); f.removeAttribute('sandbox'); f.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups'); }catch{} }); }catch{} }, 800);
  }catch{}
  // Do not flush storage on sign-in: session cookie namespacing isolates accounts safely
  // But if acc changed, flush on sign-in so we always start clean for the chosen account
  try{
    var __qsacc = new URLSearchParams(location.search||'').get('acc')||'';
    var __onSI = (location.pathname||'').indexOf('/app/sign-in')!==-1;
    var __last = ''; try{ __last = localStorage.getItem('__ee_last_acc')||''; }catch{}
    if (__onSI && __qsacc && __qsacc !== __last) {
      try{ localStorage.clear(); }catch{}
      try{ sessionStorage.clear(); }catch{}
      try{ if (window.indexedDB && indexedDB.databases){ indexedDB.databases().then(function(dbs){ try{ (dbs||[]).forEach(function(db){ try{ if(db && db.name) indexedDB.deleteDatabase(db.name); }catch{} }); }catch{} }); } }catch{}
      try{ localStorage.setItem('__ee_last_acc', __qsacc); }catch{}
      try{ document.cookie.split(';').forEach(function(c){ try{ var n=c.split('=')[0].trim(); if(!n) return; document.cookie = n+'=; Path=/; Max-Age=0'; }catch{} }); }catch{}
    }
  }catch{}
}catch{}})();</script>`;
    let finalHtml = rewritten.replace('<head>', '<head>'+earlyBoot)
    const inject = `
<script>(function(){
  try{
    const origFetch = window.fetch;
    window.fetch = function(input, init){
      try{
        const url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (
          url.startsWith('https://api.us.elevenlabs.io') || url.startsWith('https://api.elevenlabs.io') ||
          url.startsWith('https://payload.elevenlabs.io') ||
          url.startsWith('https://identitytoolkit.googleapis.com') || url.startsWith('https://securetoken.googleapis.com') ||
          url.startsWith('https://recaptchaenterprise.googleapis.com') || url.startsWith('https://www.googleapis.com')
        ){
          const proxied = url
            .replace('https://api.us.elevenlabs.io','/proxy/elapi')
            .replace('https://api.elevenlabs.io','/proxy/elapi')
            .replace('https://payload.elevenlabs.io','/proxy/elapi')
            .replace('https://identitytoolkit.googleapis.com','/proxy/gid')
            .replace('https://securetoken.googleapis.com','/proxy/gid')
            .replace('https://recaptchaenterprise.googleapis.com','/proxy/gid')
            .replace('https://www.googleapis.com','/proxy/gid');
          if (typeof input === 'string') return origFetch(proxied, init);
          const clone = new Request(proxied, input);
          return origFetch(clone, init);
        }
      }catch{}
      return origFetch(input, init);
    };
    try{
      const XO = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url){
        try{
          if (typeof url === 'string'){
            if (
              url.startsWith('https://api.us.elevenlabs.io') || url.startsWith('https://api.elevenlabs.io') ||
              url.startsWith('https://payload.elevenlabs.io') ||
              url.startsWith('https://identitytoolkit.googleapis.com') || url.startsWith('https://securetoken.googleapis.com') ||
              url.startsWith('https://recaptchaenterprise.googleapis.com') || url.startsWith('https://www.googleapis.com')
            ){
              url = url
                .replace('https://api.us.elevenlabs.io','/proxy/elapi')
                .replace('https://api.elevenlabs.io','/proxy/elapi')
                .replace('https://payload.elevenlabs.io','/proxy/elapi')
                .replace('https://identitytoolkit.googleapis.com','/proxy/gid')
                .replace('https://securetoken.googleapis.com','/proxy/gid')
                .replace('https://recaptchaenterprise.googleapis.com','/proxy/gid')
                .replace('https://www.googleapis.com','/proxy/gid');
            }
          }
        }catch{}
        return XO.apply(this, [method, url]);
      }
    }catch{}
    const push = history.pushState, replace = history.replaceState;
    function normalize(h){
      try{
        if (typeof h === 'string'){
          if (h.startsWith('/app/')) return '${publicBase}'+h;
          if (h.startsWith('http://localhost:5000/app/')) return h.replace('http://localhost:5000','');
          try{ var origin = location.origin; if (origin && h.startsWith(origin+'/app/')) return h.replace(origin,''); }catch{}
        }
      }catch{} return h;
    }
    history.pushState = function(state, title, url){ return push.call(history, state, title, normalize(url)); };
    history.replaceState = function(state, title, url){ return replace.call(history, state, title, normalize(url)); };
    try{
      var _loc = window.location;
      var _assign = _loc.assign.bind(_loc);
      var _replace = _loc.replace.bind(_loc);
      _loc.assign = function(u){ try{ u = normalize(u); }catch{} return _assign(u); };
      _loc.replace = function(u){ try{ u = normalize(u); }catch{} return _replace(u); };
      document.addEventListener('click', function(ev){ try{ var a = ev.target && (ev.target.closest ? ev.target.closest('a') : null); if(a && a.getAttribute){ var href = a.getAttribute('href')||''; if(href && href.startsWith('/app/')){ ev.preventDefault(); _loc.assign(normalize(href)); } } }catch{} }, true);
      // If an account index is in the query (?acc=1..4), persist it in path as /app/.../<acc>
      // Do NOT add suffix on sign-in page to avoid breaking route resolution.
      try {
        var qs = new URLSearchParams(location.search||'');
        var acc = qs.get('acc');
        var pth = location.pathname || '';
        var onSignin = pth.indexOf('/app/sign-in') !== -1;
        if (!onSignin && acc && (acc==='1' || acc==='2' || acc==='3' || acc==='4')) {
          var ends = pth.endsWith('/1') || pth.endsWith('/2') || pth.endsWith('/3') || pth.endsWith('/4');
          if (!ends) {
            var base = pth.endsWith('/') ? pth.slice(0, -1) : pth;
            var newP = base + '/' + acc;
            var newU = newP + location.search + location.hash;
            history.replaceState(history.state, '', newU);
          }
        }
        // If suffix is already present on sign-in, strip it back to /app/sign-in
        if (onSignin) {
          var parts = pth.split('/');
          var last = parts[parts.length - 1] || '';
          if (last==='1' || last==='2' || last==='3' || last==='4') {
            var clean = parts.slice(0, -1).join('/') || '/';
            var cleanedUrl = clean + location.search + location.hash;
            history.replaceState(history.state, '', cleanedUrl);
          }
        }
      } catch {}
    }catch{}

    // Loader overlay utilities
    function ensureLoader(){
      try{
        if (document.getElementById('ee-loader')) return;
        var style = document.createElement('style'); style.id='ee-loader-style'; style.textContent = '#ee-loader{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#000000;z-index:2147483647}#ee-loader .bars{display:flex;align-items:center}#ee-loader .bar{display:inline-block;width:3px;height:20px;background:#9e4cfc;border-radius:10px;animation:ee-scale 1s linear infinite}#ee-loader .bar:nth-child(2){height:35px;margin:0 5px;animation-delay:.25s}#ee-loader .bar:nth-child(3){animation-delay:.5s}@keyframes ee-scale{20%{transform:scaleY(1.5)}40%{transform:scaleY(1)}}';
        document.head.appendChild(style);
        var d = document.createElement('div'); d.id='ee-loader'; d.innerHTML = '<div class="bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>';
        document.body.appendChild(d);
      }catch{}
    }
    window.eeShowLoader = function(){ try{ ensureLoader(); var el=document.getElementById('ee-loader'); if (el) el.style.display='flex'; }catch{} }
    window.eeHideLoader = function(){ try{ var el=document.getElementById('ee-loader'); if (el) el.style.display='none'; }catch{} }
    // Hide loader on app pages (not sign-in)
    try { if (location.pathname.startsWith('${publicBase}/app/') && !location.pathname.includes('/app/sign-in')) { window.eeHideLoader(); } } catch {}

    // Defensive: hide only known cookie overlays; do not touch generic full-screen elements to avoid killing app root
    try{
      function hideKnown(){ try{
        var ids = ['CybotCookiebotDialog'];
        ids.forEach(function(id){ var el = document.getElementById(id); if (el) try{ el.style.setProperty('display','none','important'); }catch{} });
        var ifr = Array.from(document.querySelectorAll('iframe'));
        ifr.forEach(function(f){ try{ var src=(f.getAttribute('src')||'').toLowerCase(); if(src.includes('cookiebot')||src.includes('consentcdn')) f.remove(); }catch{} });
      }catch{} }
      var t = setInterval(hideKnown, 500); setTimeout(function(){ try{ clearInterval(t) }catch{} }, 8000);
    }catch{}

    // Auth guard: if on /app/* and not signed in, redirect to sign-in with redirect back
    try {
      if (location.pathname.startsWith('${publicBase}/app/') && !location.pathname.includes('/app/sign-in')) {
        fetch('/proxy/elapi/v1/voices/settings/default', { method: 'GET', credentials: 'include' }).then(function(r){
          try {
            if (!r || (r.status >= 400)) {
              var after = (location.pathname.split('/app/')[1]||'home');
              var dest = '${publicBase}/app/sign-in?redirect=' + encodeURIComponent('/app/' + after);
              if (location.pathname !== dest) location.replace(dest);
            }
          } catch {}
        }).catch(function(){
          try {
            var after = (location.pathname.split('/app/')[1]||'home');
            var dest = '${publicBase}/app/sign-in?redirect=' + encodeURIComponent('/app/' + after);
            if (location.pathname !== dest) location.replace(dest);
          } catch {}
        });
      }
    } catch {}

    // If on sign-in, ensure any lingering auth cookies are dropped before app loads
    try {
      if (location.pathname.indexOf('/app/sign-in') !== -1) {
        var pb2 = (function(){ try{ var p=location.pathname||''; var i=p.indexOf('/app/'); return (i>=0? p.slice(0,i): ''); }catch{} return ''; })();
        document.cookie.split(';').forEach(function(c){
          try{ var n=c.split('=')[0].trim(); if(!n) return; document.cookie = n+'=; Path=/; Max-Age=0'; if(pb2) document.cookie = n+'=; Path='+pb2+'; Max-Age=0'; }catch{}
        });
      }
    } catch {}
  }catch(e){}
})();</script>`;
    finalHtml = finalHtml.replace('</head>', inject + '\n</head>')
    // DISABLED: Auto-login selection by account number - using hardcoded credentials instead
    /*
    let autoEmail = '' + (process.env.ELEVENLABS_EMAIL || '')
    let autoPass = '' + (process.env.ELEVENLABS_PASSWORD || '')
    const accFromQuery = parseInt(url.searchParams.get('acc') || '0', 10)
    const accIdx = (accFromPath && accFromPath >=1 && accFromPath <=4) ? accFromPath : accFromQuery
    if (accIdx >= 1 && accIdx <= 4) {
      const envE = (process.env as any)['ELEVENLABS_EMAIL_' + String(accIdx)] || autoEmail
      const envP = (process.env as any)['ELEVENLABS_PASSWORD_' + String(accIdx)] || autoPass
      autoEmail = '' + (envE || '')
      autoPass = '' + (envP || '')
    }
    const accDisplay = accIdx || 1
    // Prefer HTML Sheet (published) if available; search row by label like "elevenlabs 1"
    try {
      const sr = await fetch(SHEET_HTML_URL, { cache: 'no-store' })
      console.log('[EE][EL][sheet_html] fetched', { status: sr.status, ok: sr.ok })
      if (sr.ok) {
        const htmlSheet = await sr.text()
        const label = 'elevenlabs ' + String(accIdx || 1)
        const trMatches = Array.from(htmlSheet.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
        const rows = trMatches.map(m => m[1] || '')
        let foundEmail = ''
        let foundPass = ''
        for (const inner of rows) {
          const tds = Array.from(inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(x => x[1] || '')
          if (tds.length >= 3) {
            const text0 = (tds[0] || '').replace(/<div[^>]*class=["'][^"']*softmerge-inner[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, '$1').replace(/<[^>]*>/g, '').trim().toLowerCase()
            if (text0.includes(label)) {
              const text1 = (tds[1] || '').replace(/<div[^>]*class=["'][^"']*softmerge-inner[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, '$1').replace(/<[^>]*>/g, '').trim()
              const text2 = (tds[2] || '').replace(/<[^>]*>/g, '').trim()
              foundEmail = text1
              foundPass = text2
              break
            }
          }
        }
        if (!foundEmail || !foundPass) {
          // Fallback: first data row with an email-like column 2 and non-empty column 3
          const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          for (const inner of rows) {
            const tds = Array.from(inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(x => x[1] || '')
            if (tds.length >= 3) {
              const c2 = (tds[1] || '').replace(/<div[^>]*class=["'][^"']*softmerge-inner[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, '$1').replace(/<[^>]*>/g, '').trim()
              const c3 = (tds[2] || '').replace(/<[^>]*>/g, '').trim()
              if (emailRe.test(c2) && c3) { foundEmail = c2; foundPass = c3; break }
            }
          }
        }
        if (foundEmail || foundPass) {
          autoEmail = foundEmail || autoEmail
          autoPass = foundPass || autoPass
          const src = (label && (foundEmail || foundPass)) ? 'sheet_html' : 'sheet_html_fallback'
          console.log('[EE][EL][creds]', { sessionKey, acc: accIdx || 1, source: src, emailLen: (autoEmail||'').length, passLen: (autoPass||'').length, path: upstreamUrl.pathname })
        } else {
          console.log('[EE][EL][creds]', { sessionKey, acc: accIdx || 1, source: 'sheet_html_none', emailLen: 0, passLen: 0, path: upstreamUrl.pathname })
        }
      }
    } catch (e) {
      console.log('[EE][EL][sheet_html][error]', String(e))
    }
    if ((!autoEmail || !autoPass) && process.env.ELEVENLABS_SHEET_CSV_URL) {
      try {
        const r = await fetch(process.env.ELEVENLABS_SHEET_CSV_URL, { cache: 'no-store' })
        if (r.ok) {
          const text = await r.text()
          const rows = text.split(/\r?\n/).filter(Boolean)
          const elRows = rows.filter(l => /(^|,)\s*ElevenLabs\s*(,|$)/i.test(l))
          const idx = Math.max(0, (accIdx || 1) - 1)
          const row = elRows[idx]
          if (row) {
            const cells = row.match(/\"[^\"]*\"|[^,]+/g) || []
            const emailCell = (cells[1] || '').replace(/^\"|\"$/g, '').trim()
            const passCell = (cells[2] || '').replace(/^\"|\"$/g, '').trim()
            if (emailCell) autoEmail = emailCell
            if (passCell) autoPass = passCell
          }
        }
      } catch {}
    }
    */
    // Use hardcoded credentials for auto-login
    const hardcodedEmail = 'wczznbezhttdvtnjqe@enotj.com'
    const hardcodedPassword = 'test123??'
    
    if ((upstreamUrl.pathname.startsWith('/app/sign-in') || upstreamUrl.pathname.startsWith('/app/sso')) && hardcodedEmail && hardcodedPassword) {
      const autologin = `
<script>(function(){
  try{ document.cookie.split(';').forEach(function(c){ var n=c.split('=')[0].trim(); if(!n) return; document.cookie = n+'=; Path=${proxyBase}; Max-Age=0'; document.cookie = n+'=; Path=/; Max-Age=0'; }); }catch{}
  var email = ${JSON.stringify(''+hardcodedEmail)};
  var password = ${JSON.stringify(''+hardcodedPassword)};
  try { console.log('[EE][EL][AUTO] start', { acc: ${accFromPath || 1}, emailLen: (email||'').length, passLen: (password||'').length, path: location.pathname }); } catch{}
  try { window.eeShowLoader && window.eeShowLoader(); } catch{}
  // Safety: never leave loader on sign-in for too long
  try { setTimeout(function(){ try{ if ((location.pathname||'').indexOf('/app/sign-in')!==-1) { window.eeHideLoader && window.eeHideLoader(); } }catch{} }, 2000); }catch{}
  function setReactValue(el, value){ try { var d=Object.getOwnPropertyDescriptor(el.__proto__,'value')?.set||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; d&&d.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } catch{} }
  // Collect same-origin search roots (document + iframes + shadow DOM)
  function collectRoots(){
    var roots=[document];
    try{
      var ifr=Array.from(document.querySelectorAll('iframe'));
      for(var i=0;i<ifr.length;i++){
        try{ var doc = ifr[i].contentDocument || (ifr[i].contentWindow && ifr[i].contentWindow.document); if (doc && roots.indexOf(doc)===-1) roots.push(doc); }catch{}
      }
    }catch{}
    try{
      var all = Array.from(document.querySelectorAll('*'));
      for(var j=0;j<all.length;j++){
        try{ var sr = all[j].shadowRoot; if (sr && roots.indexOf(sr)===-1) roots.push(sr); }catch{}
      }
    }catch{}
    return roots;
  }
  function findEmail(){
    try {
      var roots = collectRoots();
      for (var r=0;r<roots.length;r++){
        var root = roots[r];
        try{
          var direct = root.querySelector('input[type="email"], input[autocomplete="email"], input[autocomplete="username"], input[name="email"], input[name*="email" i], input[id*="email" i], input[placeholder*="mail" i]');
          if (direct) return direct;
          var candidates = Array.from(root.querySelectorAll('input'));
          for (var i=0;i<candidates.length;i++){
            var el = candidates[i];
            try{
              var type = (el.getAttribute('type')||'').toLowerCase();
              if (type && type !== 'text' && type !== 'email') continue;
              var name = (el.getAttribute('name')||'').toLowerCase();
              var id = (el.getAttribute('id')||'').toLowerCase();
              var ph = (el.getAttribute('placeholder')||'').toLowerCase();
              var aria = (el.getAttribute('aria-label')||'').toLowerCase();
              var lbl = '';
              try { if (el.labels && el.labels.length) { for (var j=0;j<el.labels.length;j++){ lbl += ' ' + (el.labels[j].textContent||''); } lbl = lbl.toLowerCase(); } } catch {}
              if (
                name.includes('email') || id.includes('email') ||
                ph.includes('email') || ph.includes('e-mail') || ph.includes('courriel') || ph.includes('mail') ||
                aria.includes('email') || aria.includes('e-mail') || aria.includes('courriel') ||
                lbl.includes('email')
              ) return el;
            }catch{}
          }
        }catch{}
      }
    } catch {}
    return null;
  }
  function findPass(){
    try {
      var roots = collectRoots();
      for (var r=0;r<roots.length;r++){
        var root = roots[r];
        try{
          var direct = root.querySelector('input[type="password"], input[name="password"], input[name*="pass" i], input[id*="pass" i], input[placeholder*="pass" i]');
          if (direct) return direct;
          var candidates = Array.from(root.querySelectorAll('input'));
          for (var i=0;i<candidates.length;i++){
            var el = candidates[i];
            try{
              var type = (el.getAttribute('type')||'').toLowerCase();
              var name = (el.getAttribute('name')||'').toLowerCase();
              var id = (el.getAttribute('id')||'').toLowerCase();
              var ph = (el.getAttribute('placeholder')||'').toLowerCase();
              var aria = (el.getAttribute('aria-label')||'').toLowerCase();
              var lbl = '';
              try { if (el.labels && el.labels.length) { for (var j=0;j<el.labels.length;j++){ lbl += ' ' + (el.labels[j].textContent||''); } lbl = lbl.toLowerCase(); } } catch {}
              if (
                type==='password' || name.includes('pass') || id.includes('pass') ||
                ph.includes('pass') || aria.includes('pass') || lbl.includes('pass') ||
                ph.includes('mot de passe') || aria.includes('mot de passe')
              ) return el;
            }catch{}
          }
        }catch{}
      }
    } catch {}
    return null;
  }
  function findSignIn(){
    try {
      var roots = collectRoots();
      for (var r=0;r<roots.length;r++){
        var root = roots[r];
        try{
          var n = root.querySelector('button[type="submit"], button[data-testid="sign-in-submit-button"], input[type="submit"]');
          if (n) return n;
          var els = Array.from(root.querySelectorAll('button,[role="button"],input[type="submit"]'));
          var btn = els.find(function(el){ var t=(el.textContent||el.value||'').toLowerCase(); return t.includes('sign in')||t.includes('log in')||t.includes('continue')||t.includes('next')||t.includes('se connecter')||t.includes('connexion')||t.includes('continuer'); });
          if (btn) return btn;
        }catch{}
      }
    } catch { return null }
    return null;
  }
  var __cookieClicked=false;
  function acceptCookies(){
    try {
      if (__cookieClicked) return;
      var roots = collectRoots();
      for (var r=0;r<roots.length;r++){
        var root = roots[r];
        try{
          var btns = Array.from(root.querySelectorAll('button,[role="button"]'));
          var b = btns.find(function(n){ var t=(n.textContent||'').toLowerCase(); return (t.includes('accept')&&t.includes('cookie')) || t.includes('allow all') || t.includes('tout accepter') || t.includes('accepter'); });
          if (b) { console.log('[EE][EL][AUTO] acceptCookies: clicking'); __cookieClicked=true; b.click(); return; }
        }catch{}
      }
    } catch {}
  }
  function ensureEmailMode(){
    try {
      if (findEmail()) return;
      var roots = collectRoots();
      for (var r=0;r<roots.length;r++){
        var root = roots[r];
        try{
          var btns = Array.from(root.querySelectorAll('button,[role="button"],a'));
          var target = btns.find(function(n){ var t=(n.textContent||'').toLowerCase(); return (t.includes('email')||t.includes('e-mail')||t.includes('courriel')) && (t.includes('continue')||t.includes('sign in')||t.includes('log in')||t.includes('with')||t.includes('continuer')||t.includes('se connecter')); });
          if (target) { target.click(); return; }
          // Also try inputs that look like provider selectors
          var provider = btns.find(function(n){ var t=(n.textContent||'').toLowerCase(); return t.includes('continue with') && t.includes('email'); });
          if (provider) { provider.click(); return; }
        }catch{}
      }
    } catch {}
  }
  var tries=0,max=240; var timer=setInterval(function(){
    tries++; acceptCookies(); ensureEmailMode();
    var e=findEmail(), p=findPass(), s=findSignIn();
    if (tries<=5 || tries%10===0) { try { console.log('[EE][EL][AUTO] poll', { tries, hasEmail: !!e, hasPass: !!p, hasBtn: !!s }); } catch{} }
    if(e && e.value!==email){ try{ console.log('[EE][EL][AUTO] set email'); }catch{} e.focus(); setReactValue(e,email); }
    if(p && p.value!==password){ try{ console.log('[EE][EL][AUTO] set password'); }catch{} p.focus(); setReactValue(p,password); }
    if(s){ try{ s.removeAttribute('disabled'); s.disabled=false; }catch{} }
    if(e&&p&&e.value&&p.value){ try{ console.log('[EE][EL][AUTO] submit'); var f=e.closest('form')||p.closest('form')|| (s && s.closest && s.closest('form')); if(f && f.requestSubmit){ f.requestSubmit(); } else if (f) { f.submit(); } else if (s) { s.click(); } }catch{ try{ console.log('[EE][EL][AUTO] click fallback'); }catch{} if(s) s.click(); } clearInterval(timer); }
    // Midway nudges: click email mode again
    if (!e && !p && tries===40){ try{ console.log('[EE][EL][AUTO] nudge: ensure email mode'); }catch{} ensureEmailMode(); }
    // Last resort: flush storage and reload once if nothing appears after long wait
    if (!e && !p && tries===120){
      try{ console.log('[EE][EL][AUTO] fallback: flush storage and reload'); }catch{}
      try{ localStorage.clear(); }catch{}
      try{ sessionStorage.clear(); }catch{}
      try{ document.cookie.split(';').forEach(function(c){ try{ var n=c.split('=')[0].trim(); if(!n) return; document.cookie = n+'=; Path=/; Max-Age=0'; }catch{} }); }catch{}
      try{ location.reload(); }catch{}
    }
    if(tries>max){ try{ console.log('[EE][EL][AUTO] timeout'); }catch{} clearInterval(timer); }
  },200);
  var hideTimer = setInterval(function(){ try { if (location.pathname.startsWith('${publicBase}/app/') && !location.pathname.includes('/app/sign-in')) { window.eeHideLoader && window.eeHideLoader(); clearInterval(hideTimer);} } catch{} }, 500);
})();</script>`
      finalHtml = finalHtml.replace('</body>', autologin + '\n</body>')
    }
    respHeaders.set('content-type', 'text/html; charset=utf-8')
    return new Response(finalHtml, { status: res.status, statusText: res.statusText, headers: respHeaders })
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: respHeaders })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const { sessionKey, proxyBase, upstreamPath } = extractSession(path)
  const url = new URL(req.url)
  const upstreamUrl = new URL(upstreamPath + (url.search || ''), UPSTREAM)
  const body = await req.arrayBuffer()
  const res = await fetch(upstreamUrl.toString(), {
    method: 'POST',
    headers: {
      ...buildUpstreamHeaders(req, sessionKey),
      'content-type': req.headers.get('content-type') || 'application/x-www-form-urlencoded',
    },
    body,
    redirect: 'manual',
  })
  const respHeaders = new Headers(res.headers)
  normalizeHeadersForBrowser(respHeaders, proxyBase)
  const isHttpsPost = (new URL(req.url)).protocol === 'https:'
  rewriteSetCookiesForSession(res.headers, respHeaders, proxyBase, sessionKey, isHttpsPost)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: respHeaders })
}