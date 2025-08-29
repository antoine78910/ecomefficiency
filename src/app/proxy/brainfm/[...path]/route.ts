import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://my.brain.fm'

function normalizeHeaders(h: Headers) {
  h.delete('content-encoding'); h.delete('content-length'); h.delete('content-security-policy')
  const loc = h.get('location')
  if (loc) {
    try {
      const u = new URL(loc, UPSTREAM)
      if (u.origin === UPSTREAM) {
        h.set('location', '/proxy/brainfm' + u.pathname + (u.search || ''))
      }
    } catch {}
  }
}

function buildUpstreamHeaders(req: NextRequest): Headers {
  const upstream = new Headers()
  req.headers.forEach((v, k) => upstream.set(k, v))
  upstream.set('accept-encoding', 'identity')
  upstream.set('origin', UPSTREAM)
  upstream.set('referer', UPSTREAM + '/')
  upstream.delete('host')
  upstream.delete('content-length')
  return upstream
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstream = new URL(p + (url.search || ''), UPSTREAM)

  const res = await fetch(upstream.toString(), { method: 'GET', headers: buildUpstreamHeaders(req), redirect: 'follow' })
  const h = new Headers(res.headers); normalizeHeaders(h)
  const ct = h.get('content-type') || ''
  if (ct.includes('text/html')) {
    const html = await res.text()
    let rewritten = html
      .replaceAll('href="/','href="/proxy/brainfm/')
      .replaceAll('src="/','src="/proxy/brainfm/')
      .replaceAll('href="https://my.brain.fm/','href="/proxy/brainfm/')
      .replaceAll('src="https://my.brain.fm/','src="/proxy/brainfm/')

    // Early shim: base tag + history + attribute normalization + SW disable + API reroute
    const early = `\n<script>(function(){try{\n  var base=document.createElement('base'); base.href='/proxy/brainfm/'; document.head.appendChild(base);\n  var push=history.pushState, replace=history.replaceState;\n  function norm(u){ try{ if(typeof u==='string' && u.startsWith('/') && !u.startsWith('/proxy/brainfm')) return '/proxy/brainfm'+u; }catch{} return u; }\n  history.pushState=function(a,b,u){ return push.call(history,a,b,norm(u)); }; history.replaceState=function(a,b,u){ return replace.call(history,a,b,norm(u)); };\n  var setAttr=Element.prototype.setAttribute; Element.prototype.setAttribute=function(n,v){ try{ if((n==='src'||n==='href') && typeof v==='string' && v.startsWith('/') && !v.startsWith('/proxy/brainfm')) v='/proxy/brainfm'+v; }catch{} return setAttr.call(this,n,v); };\n  if (navigator && navigator.serviceWorker) { try { var reg=navigator.serviceWorker.register; navigator.serviceWorker.register=function(){ return Promise.reject(new Error('sw disabled in proxy')); }; } catch {} }\n  var origFetch=window.fetch; window.fetch=function(input, init){try{ var u= (typeof input==='string'? input : (input && input.url) ); if(u && u.startsWith('https://api.brain.fm')){ var p=u.replace('https://api.brain.fm','/proxy/brainapi'); return origFetch(p, init); } }catch{} return origFetch(input, init); };\n  var XO=XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open=function(m,u){ try{ if(u && typeof u==='string' && u.startsWith('https://api.brain.fm')){ u=u.replace('https://api.brain.fm','/proxy/brainapi'); } }catch{} return XO.apply(this, arguments); };\n}catch(e){}})();</script>`
    rewritten = rewritten.replace('<head>', '<head>'+early)

    // Inject autologin on /signin using env credentials
    if (upstream.pathname.startsWith('/signin')) {
      const email = process.env.BRAINFM_EMAIL || ''
      const password = process.env.BRAINFM_PASSWORD || ''
      const inject = `\n<script>(function(){try{\n  var E='${email.replace(/'/g, "\\'")}', P='${password.replace(/'/g, "\\'")}';\n  function q(s){try{return document.querySelector(s)}catch{return null}}\n  function setVal(el,v){try{var d=Object.getOwnPropertyDescriptor(el.__proto__,'value')?.set||Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; d&&d.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}catch{}}\n  function emailInput(){ return q('input#email[name=email][type=email].sc-5398e54-2') || q('input#email[name=email][type=email]') || q('input[type=email]'); }\n  function passInput(){ return q('input#password[name=password][type=password].sc-5398e54-2') || q('input#password[name=password][type=password]') || q('input[type=password]'); }\n  function submitBtn(){ return q('button[data-testid=handle-submit-form][type=submit]') || q('button[type=submit]') || q('button'); }\n  var tries=0,max=120; var t=setInterval(function(){ tries++; var e=emailInput(), p=passInput(), s=submitBtn(); if(e&&E&&e.value!==E) setVal(e,E); if(p&&P&&p.value!==P) setVal(p,P); if(s&&e&&p&&e.value&&p.value){ try{ var f=s.closest('form'); if(f){ f.requestSubmit?f.requestSubmit():f.submit(); } else { s.click(); } }catch{ s.click(); } clearInterval(t); } if(tries>max) clearInterval(t); },200);\n}catch(e){}})();</script>`
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
  const upstream = new URL(p + (url.search || ''), UPSTREAM)
  const body = await req.arrayBuffer()
  const res = await fetch(upstream.toString(), { method: 'POST', headers: buildUpstreamHeaders(req), body, redirect: 'manual' })
  const h = new Headers(res.headers); normalizeHeaders(h)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

