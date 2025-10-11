import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://pipiads.com'

function normalizeHeaders(h: Headers, appendAccQuery?: string) {
  h.delete('content-encoding'); h.delete('content-length'); h.delete('content-security-policy');
  const loc = h.get('location'); if (loc) {
    try {
      const u = new URL(loc, UPSTREAM)
      if (u.hostname && u.hostname.endsWith('pipiads.com')) {
        let target = '/pipiads' + u.pathname + (u.search || '')
        // Only append acc for non-API paths
        if (!/^\/pipiads\/(v\d+|api)\//.test(target) && appendAccQuery && !/(?:[?&])acc=/.test(target)) {
          target += (target.includes('?') ? '&' : '?') + appendAccQuery
        }
        h.set('location', target)
      }
    } catch {}
  }
}

function copyAndRewriteSetCookies(from: Headers, to: Headers, isHttps: boolean, sessionPrefix: string) {
  // Remove any existing combined cookie header to avoid duplicates
  to.delete('set-cookie')
  // Append each Set-Cookie individually after rewriting attributes
  for (const [k, v] of from.entries()) {
    if (k.toLowerCase() === 'set-cookie') {
      // Only strip Domain so cookies bind to our host (localhost / ecomefficiency.site).
      // Keep original SameSite/Path/Secure to avoid dev http issues.
      let rewritten = v.replace(/;\s*Domain=[^;]+/gi, '')
      if (!isHttps) {
        // In local http development, Secure cookies are ignored by the browser; drop Secure so they stick.
        rewritten = rewritten.replace(/;\s*Secure/gi, '')
        // SameSite=None requires Secure; downgrade to Lax for localhost
        rewritten = rewritten.replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
      }
      // Namespace cookie names for per-account session isolation
      rewritten = rewritten.replace(/^([^=;]+)=/, (_m, name) => `${sessionPrefix}${name}=`)
      to.append('set-cookie', rewritten)
      // Also duplicate without prefix so client code can read original names
      try {
        let dup = v.replace(/;\s*Domain=[^;]+/gi, '')
        if (!isHttps) {
          dup = dup.replace(/;\s*Secure/gi, '')
          dup = dup.replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
        }
        to.append('set-cookie', dup)
      } catch {}
    }
  }
}

function buildUpstreamHeaders(req: NextRequest, sessionPrefix: string): Headers {
  const upstream = new Headers()
  // Pass through all headers so auth headers like access_token/authorization survive
  req.headers.forEach((value, key) => {
    upstream.set(key, value)
  })
  // Normalize a few for upstream context
  upstream.set('accept-encoding', 'identity')
  upstream.set('accept', 'application/json, text/plain, */*')
  // Normalize origin/referrer to upstream host to satisfy CSRF checks
  upstream.set('origin', UPSTREAM)
  upstream.set('referer', UPSTREAM + '/')
  // Hint XHR
  if (!upstream.get('x-requested-with')) upstream.set('x-requested-with', 'XMLHttpRequest')
  // Add common headers that APIs expect
  upstream.set('sec-fetch-dest', 'empty')
  upstream.set('sec-fetch-mode', 'cors')
  upstream.set('sec-fetch-site', 'same-origin')
  upstream.delete('host')
  upstream.delete('content-length')
  
  // CRITICAL: Ensure device_id header is present (Pipiads requires this for ALL API calls)
  if (!upstream.get('device_id') && !upstream.get('device-id')) {
    // Use a consistent device_id (can be extracted from login or use a fixed value)
    upstream.set('device_id', '213036279')
  }
  
  // Add other required Pipiads headers if missing
  if (!upstream.get('language_code')) {
    upstream.set('language_code', 'en')
  }
  if (!upstream.get('time_zone_id')) {
    upstream.set('time_zone_id', 'Europe/Paris')
  }
  if (!upstream.get('timezone_offset')) {
    upstream.set('timezone_offset', '-120')
  }
  // Forward all Pipiads cookies (both prefixed and essential ones like uid)
  try {
    const raw = req.headers.get('cookie') || ''
    const pairs = raw.split(';').map(s=>s.trim()).filter(Boolean)
    const kept: string[] = []
    const essentialCookies = ['uid', 'PP-userInfo'] // Always forward these
    for (const kv of pairs) {
      const eq = kv.indexOf('=')
      if (eq <= 0) continue
      const name = kv.slice(0, eq)
      const val = kv.slice(eq + 1)
      // Forward cookies with session prefix (remove prefix) OR essential cookies
      if (name.startsWith(sessionPrefix)) {
        kept.push(name.slice(sessionPrefix.length) + '=' + val)
      } else if (essentialCookies.some(essential => name === essential || name === `${sessionPrefix}${essential}`)) {
        kept.push(kv)
      }
    }
    if (kept.length > 0) upstream.set('cookie', kept.join('; '))
    else upstream.delete('cookie')
  } catch {}
  // Ensure access_token header is present; derive from cookie if missing
  let accessToken = upstream.get('access_token') || upstream.get('Access-Token') || upstream.get('x-access-token')
  // Try to extract access_token from PP-userInfo cookie if not present
  if (!accessToken) {
    try {
      const rawCookie = req.headers.get('cookie') || ''
      // Check both prefixed and non-prefixed versions
      const cookies = rawCookie.split(';').map(s=>s.trim())
      
      // Try PP-userInfo (with or without prefix)
      let userInfoCookie = cookies.find(kv=>kv.startsWith('PP-userInfo=') || kv.startsWith(`${sessionPrefix}PP-userInfo=`))
      if (userInfoCookie) {
        const key = userInfoCookie.includes('PP-userInfo=') ? 'PP-userInfo=' : `${sessionPrefix}PP-userInfo=`
        const valEnc = userInfoCookie.substring(key.length).split(';')[0]  // Remove any trailing attributes
        const val = decodeURIComponent(valEnc)
        const json = JSON.parse(val)
        if (json && typeof json==='object' && json.access_token) {
          accessToken = String(json.access_token)
          console.log('[Pipiads Proxy] Found access_token in PP-userInfo cookie, length:', accessToken.length, 'preview:', accessToken.substring(0, 20) + '...' + accessToken.substring(accessToken.length - 5))
        }
      }
      
      // Also try uid cookie (Pipiads uses this too)
      if (!accessToken) {
        let uidCookie = cookies.find(kv=>kv.startsWith('uid=') || kv.startsWith(`${sessionPrefix}uid=`))
        if (uidCookie) {
          const key = uidCookie.includes('uid=') ? 'uid=' : `${sessionPrefix}uid=`
          accessToken = uidCookie.substring(key.length).split(';')[0]
          console.log('[Pipiads Proxy] Using uid cookie as access_token')
        }
      }
    } catch (e) {
      console.error('[Pipiads Proxy] Failed to extract access_token:', e)
    }
  }
  if (accessToken) {
    console.log('[Pipiads Proxy] Setting access_token in headers, full token length:', accessToken.length, 'token:', accessToken)
    if (!upstream.get('access_token')) upstream.set('access_token', accessToken)
    if (!upstream.get('Access-Token')) upstream.set('Access-Token', accessToken)
    if (!upstream.get('x-access-token')) upstream.set('x-access-token', accessToken)
    if (!upstream.get('authorization')) upstream.set('authorization', 'Bearer ' + accessToken)
    if (!upstream.get('Authorization')) upstream.set('Authorization', 'Bearer ' + accessToken)
    // Some backends accept this variant
    if (!upstream.get('x-authorization')) upstream.set('x-authorization', 'access_token ' + accessToken)
  } else {
    // For login requests without token, remove empty access_token headers that cause 500 errors
    if (upstream.get('access_token') === '') upstream.delete('access_token')
    if (upstream.get('Access-Token') === '') upstream.delete('Access-Token')
    if (upstream.get('x-access-token') === '') upstream.delete('x-access-token')
  }
  // Avoid Cloudflare IP binding headers and problematic custom headers
  upstream.delete('cf-connecting-ip'); upstream.delete('cf-visitor')
  // Remove proxy-related headers
  upstream.delete('x-forwarded-host')
  upstream.delete('x-forwarded-port')
  upstream.delete('x-forwarded-proto')
  const fwd = req.headers.get('x-forwarded-for') || ''
  const clientIp = (fwd.split(',')[0] || '').trim() || req.headers.get('x-real-ip') || ''
  if (clientIp) {
    upstream.set('x-forwarded-for', clientIp)
    upstream.set('x-real-ip', clientIp)
  }
  return upstream
}

async function fetchUpstreamWithRedirects(
  startUrl: URL,
  init: { method: string; headers: Headers; body?: ArrayBuffer },
  sessionPrefix: string,
  maxRedirects: number = 5
) {
  let currentUrl = new URL(startUrl.toString())
  let method = init.method
  const headers = new Headers(init.headers)
  const accumulatedSetCookies: string[] = []

  // Build a simple cookie jar from existing header
  const cookieJar: Record<string, string> = {}
  try {
    const raw = headers.get('cookie') || ''
    raw.split(';').map(s => s.trim()).filter(Boolean).forEach(kv => {
      const eq = kv.indexOf('='); if (eq > 0) cookieJar[kv.slice(0, eq)] = kv.slice(eq + 1)
    })
  } catch {}

  for (let i = 0; i < maxRedirects; i++) {
    // Refresh cookie header each hop
    try {
      const cookieStr = Object.entries(cookieJar).map(([k,v]) => `${k}=${v}`).join('; ')
      if (cookieStr) headers.set('cookie', cookieStr); else headers.delete('cookie')
    } catch {}
    headers.set('referer', currentUrl.origin + '/')

    const res = await fetch(currentUrl.toString(), { method, headers, body: init.body, redirect: 'manual' })

    // Collect Set-Cookie for client and update cookie jar for next hops
    try {
      for (const [k, v] of res.headers.entries()) {
        if (k.toLowerCase() === 'set-cookie') {
          accumulatedSetCookies.push(v)
          const firstPair = (v.split(';')[0] || '')
          const eq = firstPair.indexOf('=')
          if (eq > 0) {
            const name = firstPair.slice(0, eq).trim()
            const value = firstPair.slice(eq + 1).trim()
            cookieJar[name] = value
          }
        }
      }
    } catch {}

    const status = res.status
    if (status >= 300 && status < 400) {
      const loc = res.headers.get('location') || ''
      if (!loc) {
        // No location provided, stop here
        const merged = new Headers(res.headers)
        for (const sc of accumulatedSetCookies) merged.append('set-cookie', sc)
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged })
      }
      // Compute next URL relative to upstream
      currentUrl = new URL(loc, UPSTREAM)
      // Preserve method for login endpoints; many servers expect POST/PUT again
      continue
    }

    // Terminal response
    const merged = new Headers(res.headers)
    for (const sc of accumulatedSetCookies) merged.append('set-cookie', sc)
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged })
  }

  // Max redirects reached, return 599
  return new Response(null, { status: 599, statusText: 'Too many redirects' })
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const sp = new URLSearchParams(url.search)
  sp.delete('acc')
  const qs = sp.toString()
  const upstream = new URL(p + (qs ? ('?' + qs) : ''), UPSTREAM)
  const acc = parseInt(url.searchParams.get('acc') || '1', 10) || 1
  const sessionPrefix = `PP_s${acc}_`
  const headers = buildUpstreamHeaders(req, sessionPrefix)
  
  // Log API calls for debugging
  const isApi = /^\/(v\d+|api)\//.test(p)
  if (isApi) {
    console.log('[Pipiads Proxy] GET API call:', {
      path: p,
      hasAccessToken: !!headers.get('access_token'),
      accessTokenValue: headers.get('access_token')?.substring(0, 20) + '...',
      hasCookie: !!headers.get('cookie'),
      deviceId: headers.get('device_id'),
      languageCode: headers.get('language_code'),
      allAuthHeaders: {
        'access_token': headers.get('access_token')?.substring(0, 30),
        'Access-Token': headers.get('Access-Token')?.substring(0, 30),
        'authorization': headers.get('authorization')?.substring(0, 40),
        'device_id': headers.get('device_id'),
        'language_code': headers.get('language_code'),
        'time_zone_id': headers.get('time_zone_id'),
        'timezone_offset': headers.get('timezone_offset')
      }
    })
  }
  
  let res = await fetch(upstream.toString(), { method:'GET', headers, redirect:'follow' })
  
  // Log errors for debugging but pass them through - let Pipiads handle them
  if (isApi && (res.status === 401 || res.status === 500)) {
    const cloned = res.clone()
    const body = await cloned.text().catch(() => '')
    console.log(`[Pipiads Proxy] ${res.status} error on ${p}:`, body.substring(0, 200))
  }
  
  // Fallback for hash-SPA: if non-API path returns HTML error (e.g., /login or any unknown path), fetch root /
  try {
    const ct0 = res.headers.get('content-type') || ''
    const isApi = /^\/(v\d+|api)\//.test(p)
    if (res.status >= 400 && ct0.includes('text/html') && !isApi) {
      const upstreamRoot = new URL('/' + (qs ? ('?' + qs) : ''), UPSTREAM)
      res = await fetch(upstreamRoot.toString(), { method:'GET', headers: buildUpstreamHeaders(req, sessionPrefix), redirect:'follow' })
    }
  } catch {}
  const h = new Headers(res.headers); normalizeHeaders(h, `acc=${acc}`); copyAndRewriteSetCookies(res.headers, h, new URL(req.url).protocol === 'https:', sessionPrefix)
  // Drop report-only CSP to reduce console noise and avoid blocking injected script in some browsers
  h.delete('content-security-policy-report-only')
  h.set('cache-control','no-store')
  const ct = h.get('content-type') || ''
  if (ct.includes('text/html')) {
    const html = await res.text()
    // Rewrite assets and links to stay under our proxy (attribute-only, preserve paths)
    let rewritten = html
      // Drop CSP meta tags to avoid blocking injected shims
      .replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
      .replace(/(href|src)="https?:\/\/(?:www\.)?pipiads\.com([^"]*)"/g, '$1="/pipiads$2"')
      .replace(/(href|src)="\/(?!pipiads)([^"]*)"/g, '$1="/pipiads/$2"')

    // Early shim to force webpack public path before vendor/runtime
    const early = `\n<script>(function(){try{\n  window.__webpack_public_path__='/pipiads/';\n  var w=window; var wp='__webpack_require__'; if(w[wp] && w[wp].p){ w[wp].p='/pipiads/'; }\n  // Safe storage shim: if localStorage/sessionStorage are blocked, provide in-memory fallback\n  try{\n    function makeStorage(){ var data={}; return { get length(){ try{return Object.keys(data).length}catch{return 0} }, key:function(i){ try{ return Object.keys(data)[i]|0 ? Object.keys(data)[i] : null }catch{return null} }, getItem:function(k){ try{ k=String(k); return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null }catch{return null} }, setItem:function(k,v){ try{ data[String(k)] = String(v) }catch{} }, removeItem:function(k){ try{ delete data[String(k)] }catch{} }, clear:function(){ try{ data = {} }catch{} } }; }\n    function ensureStorage(name){ try{ var s=w[name]; var t='__pp_test__'; s.setItem(t,'1'); s.removeItem(t); } catch(e) { var mem=makeStorage(); try{ Object.defineProperty(w, name, { get:function(){ return mem }, configurable:true }) }catch(e2){ try{ w[name]=mem }catch{} } } }\n    ensureStorage('localStorage'); ensureStorage('sessionStorage');\n  }catch{}\n  function toProxy(u){ try{ if(typeof u==='string'){ if(u.startsWith('https://www.pipiads.com')||u.startsWith('https://pipiads.com')){ var x=new URL(u); return '/pipiads'+x.pathname+x.search+x.hash; } if(u.startsWith('/') && !u.startsWith('/pipiads')) return '/pipiads'+u; } }catch{} return u; }\n  try{ var loc=window.location; var _assign=loc.assign.bind(loc); var _replace=loc.replace.bind(loc); loc.assign=function(u){ return _assign(toProxy(u)); }; loc.replace=function(u){ return _replace(toProxy(u)); }; }catch{}\n  try{ var _open=window.open; window.open=function(u,n,f){ return _open.call(window, toProxy(u), n, f); }; }catch{}\n  // Disable service worker registration under proxy to avoid storage/CSP issues\n  try{ if (navigator && navigator.serviceWorker && navigator.serviceWorker.register){ var _reg = navigator.serviceWorker.register; navigator.serviceWorker.register = function(){ return Promise.reject(new Error('sw disabled in proxy')); }; } }catch{}\n  // Rewrite fetch/XHR to our proxy for absolute and root-relative URLs\n  try{ var origFetch = window.fetch; window.fetch = function(input, init){ try{ var u = (typeof input==='string' ? input : (input && input.url)); if(u){ if(u.startsWith('https://www.pipiads.com')||u.startsWith('https://pipiads.com')){ var x=new URL(u); return origFetch('/pipiads'+x.pathname+x.search+x.hash, init); } if(u.startsWith('/') && !u.startsWith('/pipiads')){ return origFetch('/pipiads'+u, init); } } }catch{} return origFetch(input, init); }; }catch{}\n  try{ var XO = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function(m,u){ try{ if(u && typeof u==='string'){ if(u.startsWith('https://www.pipiads.com')||u.startsWith('https://pipiads.com')){ var x=new URL(u); u='/pipiads'+x.pathname+x.search+x.hash; } else if(u.startsWith('/') && !u.startsWith('/pipiads')){ u='/pipiads'+u; } } }catch{} return XO.apply(this, arguments); }; }catch{}\n}catch(e){}})();</script>`
    rewritten = rewritten.replace('<head>', '<head>'+early)
    // Runtime normalization for navigation and dynamic resource injection
    const shim = `
<script>(function(){try{
  var base=document.createElement('base'); base.href='/pipiads/'; document.head.appendChild(base);
  var push=history.pushState, replace=history.replaceState;
  var qs=new URLSearchParams(location.search||''); var currentAcc=qs.get('acc')||'';
  function isApiPath(p){ try{ return (typeof p==='string') && (p.indexOf('/proxy/pipiads/v')===0 || p.indexOf('/proxy/pipiads/api/')===0) }catch(e){ return false } }
  function addAcc(u){ try{ var x=new URL(u, location.origin); if(currentAcc && !x.searchParams.has('acc') && !isApiPath(x.pathname)){ x.searchParams.set('acc', currentAcc); } return x.pathname + x.search + x.hash; }catch{return u} }
  function norm(u){ try{ if(typeof u==='string' && u.startsWith('/')) { var p=u; if(!p.startsWith('/pipiads')) p='/pipiads'+p; p=addAcc(p); return p; } }catch{} return u; }
  history.pushState=function(a,b,u){ return push.call(history,a,b,norm(u)); };
  history.replaceState=function(a,b,u){ return replace.call(history,a,b,norm(u)); };
  var setAttr=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(n,v){ try{ if((n==='src'||n==='href') && typeof v==='string' && v.startsWith('/')) { var p=v; if(!p.startsWith('/pipiads')) p='/pipiads'+p; v=addAcc(p); } }catch{} return setAttr.call(this,n,v); };
  document.addEventListener('click', function(ev){ try{ var a=ev.target && ev.target.closest && ev.target.closest('a'); if(!a) return; var href=a.getAttribute('href'); if(!href) return; if(href.startsWith('/')){ var p=href; if(!p.startsWith('/pipiads')) p='/pipiads'+p; a.setAttribute('href', addAcc(p)); } }catch{} }, true);
  try{ var p=location.pathname; if((p==='/pipiads'||p==='/pipiads/'||p==='/pipiads/login') && location.href.indexOf('#/login')===-1){ var hasRedirect=new URLSearchParams(location.search||'').has('redirect'); if(!hasRedirect){ var base=location.href.split('#')[0]; history.replaceState(history.state,'', base + '#/login'); } } }catch{}
  try{
    function getCookie(n){ try{ var s=document.cookie.split(';'); for(var i=0;i<s.length;i++){ var kv=s[i].trim(); if(kv.indexOf(n+'=')===0) return kv; } return ''; }catch{return ''} }
    var ckIv=setInterval(function(){ try{ if(getCookie('PP-userInfo')){ var baseUrl=(location.origin + '/pipiads/'); history.replaceState(history.state,'', baseUrl + '#/dashboard'); clearInterval(ckIv); } }catch{} }, 400);
  }catch{}
}catch(e){}})();</script>`
    // Loader overlay: show while on /login, hide on /dashboard
    const loader = `\n<script>(function(){try{\n  function ensureLoader(){\n    try{ if(document.getElementById('pp-loader')) return;\n      var style=document.createElement('style'); style.id='pp-loader-style'; style.textContent='#pp-loader{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#000000;z-index:2147483647}#pp-loader .bars{display:flex;align-items:center}#pp-loader .bar{display:inline-block;width:3px;height:20px;background:#9e4cfc;border-radius:10px;animation:pp-scale 1s linear infinite}#pp-loader .bar:nth-child(2){height:35px;margin:0 5px;animation-delay:.25s}#pp-loader .bar:nth-child(3){animation-delay:.5s}@keyframes pp-scale{20%{transform:scaleY(1.5)}40%{transform:scaleY(1)}}';\n      document.head.appendChild(style);\n      var d=document.createElement('div'); d.id='pp-loader'; d.innerHTML='<div class="bars"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>';\n      document.body.appendChild(d);\n    }catch{}\n  }\n  window.ppShowLoader=function(){ try{ ensureLoader(); var el=document.getElementById('pp-loader'); if(el) el.style.display='flex'; }catch{} };\n  window.ppHideLoader=function(){ try{ var el=document.getElementById('pp-loader'); if(el) el.style.display='none'; }catch{} };\n  try{ var p=location.pathname; if(p.includes('/proxy/pipiads/') && p.includes('/login')) { window.ppShowLoader(); } }catch{}\n  try{ var p2=location.pathname; if(p2.includes('/proxy/pipiads/') && (p2.includes('/dashboard')||p2.includes('/analysis')||p2.includes('/home'))) { window.ppHideLoader(); } }catch{}\n  var iv=setInterval(function(){ try{ var p=location.pathname; if(p.includes('/proxy/pipiads/') && (p.includes('/dashboard')||p.includes('/analysis')||p.includes('/home'))) { window.ppHideLoader(); } }catch{} }, 500);\n}catch(e){}})();</script>`
    
    rewritten = rewritten.replace('</head>', shim + loader + '\n</head>')
    // Auto-login if on /login and env vars set
    const defaultEmail = process.env.PIPIADS_EMAIL
    const defaultPassword = process.env.PIPIADS_PASSWORD
    // Render-time acc selection; choose env per account if provided
    const email1 = process.env.PIPIADS_EMAIL_1 || process.env.PIPIADS_EMAIL1 || defaultEmail
    const pass1 = process.env.PIPIADS_PASSWORD_1 || process.env.PIPIADS_PASSWORD1 || defaultPassword
    const email2 = process.env.PIPIADS_EMAIL_2 || process.env.PIPIADS_EMAIL2 || defaultEmail
    const pass2 = process.env.PIPIADS_PASSWORD_2 || process.env.PIPIADS_PASSWORD2 || defaultPassword
    if ((p.includes('/login') || p.startsWith('/dashboard')) && (email1 || email2) && (pass1 || pass2)) {
      const inject = `
 <script>(function(){try{
   function q(s){try{return document.querySelector(s)}catch{return null}}
   function setVal(el,v){try{var d=Object.getOwnPropertyDescriptor(el.__proto__,'value')?.set||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; d&&d.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}catch{}}
   function btn(){var b=q('button[type=\"submit\"]'); if(b) return b; var primary=document.querySelector('button.el-button--primary'); if(primary) return primary; var els=Array.from(document.querySelectorAll('button,[role=\"button\"],input[type=\"submit\"]')); return els.find(function(n){ var t=(n.textContent||n.value||'').toLowerCase().replace(/\\s+/g,''); return t.includes('login')||t.includes('seconnecter')||t.includes('connexion')||t.includes('se connecter'); });}
   function emailInput(){
     var el = q('input[autocomplete=\"email\"],input[type=\"email\"],input[name=\"email\"]');
     if (!el) el = q('input.el-input__inner[placeholder*=\"mail\" i]');
     if (!el) el = q('input.el-input__inner[placeholder*=\"e-mail\" i]');
     if (!el) el = q('input.el-input__inner[placeholder*=\"adresse\" i]');
     if (!el) el = q('input.el-input__inner[placeholder*=\"Veuillez\" i]');
     if (!el) {
       var list = Array.from(document.querySelectorAll('input.el-input__inner[type=\"text\"]'));
       el = list.find(function(n){ var p=(n.getAttribute('placeholder')||'').toLowerCase(); return p.includes('mail')||p.includes('adresse')||p.includes('veuillez'); });
       if (!el && list.length===1) el = list[0];
     }
     return el;
   }
   function passInput(){ var el=q('input[type=\\"password\\"],input[name=\\"password\\"],input[autocomplete=\\"current-password\\"],input.el-input__inner[type=\\"password\\"]'); if(!el) el = Array.from(document.querySelectorAll('input.el-input__inner')).find(function(n){ var p=(n.getAttribute('placeholder')||'').toLowerCase(); return p.includes('mot de passe')||p.includes('password'); }); return el; }
   var params=new URLSearchParams(location.search||'');
   var acc=parseInt(params.get('acc')||'1',10)||1;
   var email = acc===2 ? ${JSON.stringify(email2||'')} : ${JSON.stringify(email1||'')};
   var password = acc===2 ? ${JSON.stringify(pass2||'')} : ${JSON.stringify(pass1||'')};
   console.log('[EE][Pipiads] autologin activated acc=%s', acc);
   var tries=0,max=120; var t=setInterval(function(){
     tries++;
     var e=emailInput(), p=passInput(), s=btn();
     if(e&&e.value!==email) setVal(e,email);
     if(p&&p.value!==password) setVal(p,password);
     if(s){ s.removeAttribute('disabled'); s.disabled=false; }
     if(s&&e&&p&&e.value&&p.value){
       try{ var f=s.closest('form'); if(f){ console.log('[EE][Pipiads] submitting via form.requestSubmit'); f.requestSubmit?f.requestSubmit():f.submit(); }
       else { console.log('[EE][Pipiads] submitting via button.click'); s.click(); } }catch(err){ console.log('[EE][Pipiads] submit fallback click', err); s.click(); }
       clearInterval(t);
     }
     if(tries===15){ try{ if(location.pathname === '/proxy/pipiads/login' && location.href.indexOf('#/login')===-1){ var q=location.search||''; location.replace('/proxy/pipiads/'+q+'#/login'); } }catch{} }
     if(tries>max) { console.warn('[EE][Pipiads] autologin timeout'); clearInterval(t); }
   },200);
 }catch(e){ console.warn('[EE][Pipiads] autologin error', e); }})();</script>`
      rewritten = rewritten.replace('</body>', inject + '\n</body>')
    }
    h.set('content-type','text/html; charset=utf-8')
    return new Response(rewritten, { status: res.status, statusText: res.statusText, headers: h })
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const sp = new URLSearchParams(url.search); sp.delete('acc'); const qs = sp.toString();
  const upstream = new URL(p + (qs ? ('?' + qs) : ''), UPSTREAM)
  const body = await req.arrayBuffer()
  const acc = parseInt(url.searchParams.get('acc') || '1', 10) || 1
  const sessionPrefix = `PP_s${acc}_`
  const headers = buildUpstreamHeaders(req, sessionPrefix)
  // Many endpoints expect urlencoded
  if (!headers.get('content-type')) headers.set('content-type', 'application/x-www-form-urlencoded; charset=UTF-8')
  
  // Log API calls
  const isApi = /^\/(v\d+|api)\//.test(p)
  if (isApi) {
    console.log('[Pipiads Proxy] POST API call:', {
      path: p,
      hasAccessToken: !!headers.get('access_token'),
      accessToken: headers.get('access_token')?.substring(0, 30),
      deviceId: headers.get('device_id'),
      allRequiredHeaders: {
        'device_id': headers.get('device_id'),
        'language_code': headers.get('language_code'),
        'time_zone_id': headers.get('time_zone_id'),
        'timezone_offset': headers.get('timezone_offset')
      }
    })
  }
  
  const res = await fetchUpstreamWithRedirects(upstream, { method: 'POST', headers, body }, sessionPrefix)
  
  // Log errors for debugging but pass them through
  if (isApi && (res.status === 401 || res.status === 500)) {
    const cloned = res.clone()
    const responseBody = await cloned.text().catch(() => '')
    console.log(`[Pipiads Proxy] POST ${res.status} on ${p}:`, responseBody.substring(0, 200))
  }
  const h = new Headers(res.headers); normalizeHeaders(h, `acc=${acc}`); copyAndRewriteSetCookies(res.headers, h, new URL(req.url).protocol === 'https:', sessionPrefix)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const sp = new URLSearchParams(url.search); sp.delete('acc'); const qs = sp.toString();
  const upstream = new URL(p + (qs ? ('?' + qs) : ''), UPSTREAM)
  const body = await req.arrayBuffer()
  const acc = parseInt(url.searchParams.get('acc') || '1', 10) || 1
  const sessionPrefix = `PP_s${acc}_`
  
  // For login endpoints, use minimal headers to match working direct API call
  const isLogin = /\/api\/member\/login$/.test(p)
  const headers = isLogin ? new Headers() : buildUpstreamHeaders(req, sessionPrefix)
  
  if (isLogin) {
    // Only essential headers for login (matching the working curl test)
    headers.set('content-type', 'application/json')
    headers.set('origin', UPSTREAM)
    headers.set('referer', UPSTREAM + '/')
    headers.set('accept', 'application/json, text/plain, */*')
    headers.set('user-agent', req.headers.get('user-agent') || 'Mozilla/5.0')
    // Pass through Pipiads-specific headers from client
    const deviceId = req.headers.get('device_id') || req.headers.get('device-id')
    if (deviceId) headers.set('device_id', deviceId)
    const langCode = req.headers.get('language_code')
    if (langCode) headers.set('language_code', langCode)
    const tzId = req.headers.get('time_zone_id')
    if (tzId) headers.set('time_zone_id', tzId)
    const tzOffset = req.headers.get('timezone_offset')
    if (tzOffset) headers.set('timezone_offset', tzOffset)
  } else {
    // For non-login requests, keep the full headers
    // (code continues below)
  }
  
  // Log login attempts for debugging
  if (p.includes('/login')) {
    try {
      const bodyText = new TextDecoder().decode(body)
      console.log('[Pipiads Proxy] Login attempt:', {
        path: p,
        method: 'PUT',
        contentType: headers.get('content-type'),
        bodySize: body.byteLength,
        bodyContent: bodyText,
        upstream: upstream.toString(),
        allHeaders: Object.fromEntries(headers.entries())
      })
    } catch (e) {
      console.log('[Pipiads Proxy] Login attempt (body decode failed):', {
        path: p,
        method: 'PUT',
        upstream: upstream.toString()
      })
    }
  }
  
  // For non-login: Force urlencoded if not already set
  if (!isLogin) {
    if (!headers.get('content-type') || /json/i.test(String(headers.get('content-type'))||'')) headers.set('content-type', 'application/x-www-form-urlencoded; charset=UTF-8')
  }
  // For login: content-type already set to application/json above
  
  let res = await fetchUpstreamWithRedirects(upstream, { method: 'PUT', headers, body }, sessionPrefix)
  
  // Log response for debugging
  if (p.includes('/login')) {
    const clonedRes = res.clone()
    const responseText = await clonedRes.text().catch(() => '')
    console.log('[Pipiads Proxy] Login response:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      bodyFull: responseText,
      bodyLength: responseText.length
    })
    
    // Try to parse JSON error
    try {
      const jsonBody = JSON.parse(responseText)
      console.log('[Pipiads Proxy] Login JSON response:', jsonBody)
    } catch {}
  }
  
  // If error, try POST as fallback (login typically works with both PUT and POST)
  try {
    if ((res.status >= 300 || res.status === 500) && isLogin) {
      console.log('[Pipiads Proxy] PUT failed, trying POST with minimal headers')
      // Use same minimal headers for POST
      const postHeaders = new Headers()
      postHeaders.set('content-type', 'application/json')
      postHeaders.set('origin', UPSTREAM)
      postHeaders.set('referer', UPSTREAM + '/')
      postHeaders.set('accept', 'application/json, text/plain, */*')
      postHeaders.set('user-agent', req.headers.get('user-agent') || 'Mozilla/5.0')
      
      const altPost = await fetchUpstreamWithRedirects(upstream, { method: 'POST', headers: postHeaders, body }, sessionPrefix)
      if (altPost.status >= 200 && altPost.status < 300) {
        console.log('[Pipiads Proxy] POST fallback succeeded ✅')
        res = altPost
      } else {
        console.log('[Pipiads Proxy] POST also failed:', altPost.status)
      }
    }
  } catch (e) {
    console.error('[Pipiads Proxy] Fallback error:', e)
  }
  
  // Log errors for debugging but pass them through
  const isApi = /^\/(v\d+|api)\//.test(p)
  if (isApi && !isLogin && (res.status === 401 || res.status === 500)) {
    const cloned = res.clone()
    const responseBody = await cloned.text().catch(() => '')
    console.log(`[Pipiads Proxy] PUT ${res.status} on ${p}:`, responseBody.substring(0, 200))
  }
  
  const h = new Headers(res.headers); normalizeHeaders(h, `acc=${acc}`); copyAndRewriteSetCookies(res.headers, h, new URL(req.url).protocol === 'https:', sessionPrefix)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}


