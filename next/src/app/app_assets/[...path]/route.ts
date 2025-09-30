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
  const p = '/app_assets/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstreamUrl = new URL(p + (url.search || ''), UPSTREAM)
  const res = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: buildUpstreamHeaders(req),
    redirect: 'manual',
  })
  const respHeaders = new Headers(res.headers)
  normalizeHeaders(respHeaders)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: respHeaders })
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/app_assets/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstreamUrl = new URL(p + (url.search || ''), UPSTREAM)
  const res = await fetch(upstreamUrl.toString(), {
    method: 'HEAD',
    headers: buildUpstreamHeaders(req),
    redirect: 'manual',
  })
  const respHeaders = new Headers(res.headers)
  normalizeHeaders(respHeaders)
  return new Response(null, { status: res.status, statusText: res.statusText, headers: respHeaders })
}


