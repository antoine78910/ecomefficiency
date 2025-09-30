import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM_API = 'https://api.brain.fm'

function buildHeaders(req: NextRequest): Headers {
  const h = new Headers()
  req.headers.forEach((v,k) => h.set(k,v))
  h.set('origin', 'https://my.brain.fm')
  h.set('referer', 'https://my.brain.fm/')
  h.delete('host'); h.delete('content-length')
  return h
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstream = new URL(p + (url.search||''), UPSTREAM_API)
  const res = await fetch(upstream.toString(), { method:'GET', headers: buildHeaders(req) })
  const h = new Headers(res.headers)
  h.set('access-control-allow-origin', '*')
  h.set('access-control-allow-headers', '*')
  h.set('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
  h.delete('content-encoding'); h.delete('content-length')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstream = new URL(p + (url.search||''), UPSTREAM_API)
  const body = await req.arrayBuffer()
  const res = await fetch(upstream.toString(), { method:'POST', headers: buildHeaders(req), body })
  const h = new Headers(res.headers)
  h.set('access-control-allow-origin', '*')
  h.set('access-control-allow-headers', '*')
  h.set('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
  h.delete('content-encoding'); h.delete('content-length')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: new Headers({
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  })})
}


