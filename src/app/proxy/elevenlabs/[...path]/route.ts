import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://elevenlabs.io'
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
        // Static assets go to /app_assets, app/pages go to the session-aware proxyBase
        const rewrittenPath = u.pathname.startsWith('/_next') || u.pathname.includes('/static/')
          ? '/app_assets' + u.pathname
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
  const segs = path ? [...path] : []
  let sessionKey: string | null = null
  if (segs[0] === 's' && /^[0-9]{5}$/.test(String(segs[1] || ''))) {
    sessionKey = String(segs[1])
    segs.splice(0, 2)
  }
  const upstreamPath = '/' + segs.join('/')
  const proxyBase = '/proxy/elevenlabs' + (sessionKey ? `/s/${sessionKey}` : '')
  return { sessionKey, proxyBase, upstreamPath }
}

function rewriteSetCookiesForSession(from: Headers, to: Headers, proxyBase: string, sessionKey: string | null) {
  to.delete('set-cookie')
  for (const [k, v] of from.entries()) {
    if (k.toLowerCase() === 'set-cookie') {
      let rewritten = v
        .replace(/;\s*Domain=[^;]+/gi, '')
        .replace(/;\s*SameSite=Lax/gi, '; SameSite=None')
        .replace(/;\s*SameSite=Strict/gi, '; SameSite=None')
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
    // Prefer rows whose first cell mentions ElevenLabs
    const serviceRows = rows.filter(r => (r.cells[0] || '').toLowerCase().includes('elevenlabs') && r.cells.length >= 3)
    const pickFrom = serviceRows.length ? serviceRows : rows.filter(r => r.cells.length >= 3)
    const idx = Math.max(1, rowIndex1) - 1
    const chosen = pickFrom[idx] || pickFrom[0]
    if (!chosen) return {}
    const email = chosen.cells[1] || ''
    const password = chosen.cells[2] || ''
    return { email, password }
  } catch { return {} }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const { sessionKey, proxyBase, upstreamPath } = extractSession(path)
  const url = new URL(req.url)
  if (sessionKey) {
    const stable = '/proxy/elevenlabs' + upstreamPath + (url.search || '')
    return Response.redirect(new URL(stable, url.origin), 302)
  }
  const upstreamUrl = new URL(upstreamPath + (url.search || ''), UPSTREAM)
  const res = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: buildUpstreamHeaders(req, sessionKey),
    redirect: 'manual',
  })
  const respHeaders = new Headers(res.headers)
  normalizeHeadersForBrowser(respHeaders, proxyBase)
  // Bind and namespace cookies to the session path
  rewriteSetCookiesForSession(res.headers, respHeaders, proxyBase, sessionKey)
  // HTML: best-effort rewrite of asset URLs to /app_assets
  const ct = respHeaders.get('content-type') || ''
  if (ct.includes('text/html')) {
    const html = await res.text()
    let rewritten = html
      .replaceAll('href="/_next/', 'href="/app_assets/_next/')
      .replaceAll('src="/_next/', 'src="/app_assets/_next/')
      .replaceAll('href="/static/', 'href="/app_assets/static/')
      .replaceAll('src="/static/', 'src="/app_assets/static/')
      .replaceAll('href="https://elevenlabs.io/_next/', 'href="/app_assets/_next/')
      .replaceAll('src="https://elevenlabs.io/_next/', 'src="/app_assets/_next/')
      .replaceAll('href="/app/', `href="${proxyBase}/app/`)
      .replaceAll('src="/app/', `src="${proxyBase}/app/`)
      .replaceAll('action="/app/', `action="${proxyBase}/app/`)
      .replaceAll('href="https://elevenlabs.io/app/', `href="${proxyBase}/app/`)
      .replaceAll('src="https://elevenlabs.io/app/', `src="${proxyBase}/app/`)
      .replaceAll('href="/public_app_assets/', 'href="/public_app_assets/')
      .replaceAll('src="/public_app_assets/', 'src="/public_app_assets/')
      .replaceAll('https://payload.elevenlabs.io', '/proxy/elapi')
      // Firebase auth iframe/handler to same-origin to avoid third-party storage restrictions
      .replaceAll('src="/__/auth/', `src="${proxyBase}/__/auth/`)
      .replaceAll('href="/__/auth/', `href="${proxyBase}/__/auth/`)
      .replaceAll('src="https://elevenlabs.io/__/auth/', `src="${proxyBase}/__/auth/`)
      .replaceAll('href="https://elevenlabs.io/__/auth/', `href="${proxyBase}/__/auth/`)
      // Drop heavy sentry/monitoring and preloads to reduce noise
      .replace(/<link[^>]*sentry[^>]*>/g, '')
      .replace(/<script[^>]*sentry[^>]*><\/script>/g, '')
      .replace(/<link[^>]*preload[^>]*>/g, '')
      // Proxy API calls to our endpoint to bypass CORS
      .replaceAll('https://api.us.elevenlabs.io', '/proxy/elapi')
      .replaceAll('https://api.elevenlabs.io', '/proxy/elapi')
      // Google identity/recaptcha endpoints via proxy
      .replaceAll('https://identitytoolkit.googleapis.com', '/proxy/gid')
      .replaceAll('https://securetoken.googleapis.com', '/proxy/gid')
      .replaceAll('https://recaptchaenterprise.googleapis.com', '/proxy/gid')
      .replaceAll('https://www.googleapis.com', '/proxy/gid')

    // Inject a small runtime shim to reroute dynamic fetch/XHR to /proxy/elapi and fix client-side navigations
    const earlyBoot = `
<script>(function(){try{ var sk='${sessionKey||''}'; if (!window.__ee_session || window.__ee_session!==sk){ try{ localStorage.clear(); sessionStorage.clear(); }catch{} try{ if (window.indexedDB && indexedDB.databases){ indexedDB.databases().then(function(dbs){ try{ dbs.forEach(function(db){ try{ if(db && db.name) indexedDB.deleteDatabase(db.name); }catch{} }); }catch{} }); } }catch{} window.__ee_session=sk; } }catch{}})();</script>`;
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
          if (h.startsWith('/app/')) return '${proxyBase}'+h;
          if (h.startsWith('http://localhost:5000/app/')) return h.replace('http://localhost:5000','');
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
    try { if (location.pathname.startsWith('${proxyBase}/app/') && !location.pathname.includes('/app/sign-in')) { window.eeHideLoader(); } } catch {}

    // Auth guard: if on /app/* and not signed in, redirect to sign-in with redirect back
    try {
      if (location.pathname.startsWith('${proxyBase}/app/') && !location.pathname.includes('/app/sign-in')) {
        fetch('/proxy/elapi/v1/voices/settings/default', { method: 'GET', credentials: 'include' }).then(function(r){
          try {
            if (!r || (r.status >= 400)) {
              var after = (location.pathname.split('/app/')[1]||'home');
              var dest = '${proxyBase}/app/sign-in?redirect=' + encodeURIComponent('/app/' + after);
              if (location.pathname !== dest) location.replace(dest);
            }
          } catch {}
        }).catch(function(){
          try {
            var after = (location.pathname.split('/app/')[1]||'home');
            var dest = '${proxyBase}/app/sign-in?redirect=' + encodeURIComponent('/app/' + after);
            if (location.pathname !== dest) location.replace(dest);
          } catch {}
        });
      }
    } catch {}
  }catch(e){}
})();</script>`;
    finalHtml = finalHtml.replace('</head>', inject + '\n</head>')
    // Auto-login selection by account number (acc=1..4): ENV first, optional CSV fallback
    let autoEmail = '' + (process.env.ELEVENLABS_EMAIL || '')
    let autoPass = '' + (process.env.ELEVENLABS_PASSWORD || '')
    const accIdx = parseInt(url.searchParams.get('acc') || '0', 10)
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
    if (upstreamUrl.pathname.startsWith('/app/sign-in') && autoEmail && autoPass) {
      const autologin = `
<script>(function(){
  try{ document.cookie.split(';').forEach(function(c){ var n=c.split('=')[0].trim(); if(!n) return; document.cookie = n+'=; Path=${proxyBase}; Max-Age=0'; document.cookie = n+'=; Path=/; Max-Age=0'; }); }catch{}
  var email = ${JSON.stringify(''+autoEmail)};
  var password = ${JSON.stringify(''+autoPass)};
  try { console.log('[EE][EL][AUTO] start', { acc: ${accDisplay}, emailLen: (email||'').length, passLen: (password||'').length, path: location.pathname }); } catch{}
  try { window.eeShowLoader && window.eeShowLoader(); } catch{}
  function setReactValue(el, value){ try { var d=Object.getOwnPropertyDescriptor(el.__proto__,'value')?.set||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; d&&d.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } catch{} }
  function q(sel){ try { return document.querySelector(sel) } catch { return null } }
  function findEmail(){ return q('input[type="email"], input[name="email"], input[autocomplete="email"], input[placeholder*="mail" i]') }
  function findPass(){ return q('input[type="password"], input[name="password"], input[autocomplete="current-password"], input[placeholder*="pass" i]') }
  function findSignIn(){ var n = q('button[data-testid="sign-in-submit-button"]'); if(n) return n; var els = Array.from(document.querySelectorAll('button,[role="button"],input[type="submit"]')); return els.find(function(n){ var t=(n.textContent||n.value||'').toLowerCase(); return t.includes('sign in')||t.includes('log in'); }); }
  function acceptCookies(){
    try { var b = Array.from(document.querySelectorAll('button')).find(function(n){ return /(accept|allow).*(cookies|all)/i.test(n.textContent||''); }); if (b) { console.log('[EE][EL][AUTO] acceptCookies: clicking'); b.click(); } } catch {}
  }
  var tries=0,max=120; var timer=setInterval(function(){
    tries++; acceptCookies();
    var e=findEmail(), p=findPass(), s=findSignIn();
    if (tries<=5 || tries%10===0) { try { console.log('[EE][EL][AUTO] poll', { tries, hasEmail: !!e, hasPass: !!p, hasBtn: !!s }); } catch{} }
    if(e && e.value!==email){ try{ console.log('[EE][EL][AUTO] set email'); }catch{} e.focus(); setReactValue(e,email); }
    if(p && p.value!==password){ try{ console.log('[EE][EL][AUTO] set password'); }catch{} p.focus(); setReactValue(p,password); }
    if(s){ s.removeAttribute('disabled'); s.disabled=false; }
    if(e&&p&&s&&e.value&&p.value){ try{ console.log('[EE][EL][AUTO] submit'); var form=s.closest('form'); if(form){ form.requestSubmit?form.requestSubmit():form.submit(); } else { s.click(); } }catch{ try{ console.log('[EE][EL][AUTO] click fallback'); }catch{} s.click(); } clearInterval(timer); }
    if(tries>max){ try{ console.log('[EE][EL][AUTO] timeout'); }catch{} clearInterval(timer); }
  },200);
  var hideTimer = setInterval(function(){ try { if (location.pathname.startsWith('${proxyBase}/app/') && !location.pathname.includes('/app/sign-in')) { window.eeHideLoader && window.eeHideLoader(); clearInterval(hideTimer);} } catch{} }, 500);
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
  rewriteSetCookiesForSession(res.headers, respHeaders, proxyBase, sessionKey)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: respHeaders })
}