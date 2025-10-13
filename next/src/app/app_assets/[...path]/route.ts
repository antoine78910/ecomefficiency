import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://elevenlabs.io'

function normalizeHeaders(resHeaders: Headers) {
  resHeaders.delete('content-encoding')
  resHeaders.delete('content-length')
}

function buildUpstreamHeaders(req: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    'user-agent': req.headers.get('user-agent') || '',
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'accept-encoding': 'identity',
    'referer': UPSTREAM + '/',
    'origin': UPSTREAM,
  }
  const range = req.headers.get('range')
  if (range) (headers as any)['range'] = range
  const cookie = req.headers.get('cookie')
  if (cookie) (headers as any)['cookie'] = cookie
  return headers
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  // Remove /app_assets prefix; upstream expects /_next/static/... directly
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstreamUrl = new URL(p + (url.search || ''), UPSTREAM)
  let res = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: buildUpstreamHeaders(req),
    redirect: 'manual',
  })
  // Fallback: some builds serve assets under /app/_next/...
  if (res.status === 404 && p.startsWith('/_next/')) {
    const alt = new URL('/app' + p + (url.search || ''), UPSTREAM)
    try { res = await fetch(alt.toString(), { method:'GET', headers: buildUpstreamHeaders(req), redirect:'manual' }) } catch {}
  }
  const respHeaders = new Headers(res.headers)
  normalizeHeaders(respHeaders)
  // Set cache headers for static assets
  if (p.startsWith('/_next/') || p.includes('/static/')) {
    respHeaders.set('cache-control', 'public, max-age=31536000, immutable')
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: respHeaders })
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  // Remove /app_assets prefix; upstream expects /_next/static/... directly
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstreamUrl = new URL(p + (url.search || ''), UPSTREAM)
  let res = await fetch(upstreamUrl.toString(), {
    method: 'HEAD',
    headers: buildUpstreamHeaders(req),
    redirect: 'manual',
  })
  if (res.status === 404 && p.startsWith('/_next/')) {
    const alt = new URL('/app' + p + (url.search || ''), UPSTREAM)
    try { res = await fetch(alt.toString(), { method:'HEAD', headers: buildUpstreamHeaders(req), redirect:'manual' }) } catch {}
  }
  const respHeaders = new Headers(res.headers)
  normalizeHeaders(respHeaders)
  if (p.startsWith('/_next/') || p.includes('/static/')) {
    respHeaders.set('cache-control', 'public, max-age=31536000, immutable')
  }
  return new Response(null, { status: res.status, statusText: res.statusText, headers: respHeaders })
}


