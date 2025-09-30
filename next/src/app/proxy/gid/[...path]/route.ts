import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASES = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://recaptchaenterprise.googleapis.com',
  'https://www.googleapis.com'
]

function pickBase(): string { return BASES[0] }

function buildHeaders(req: NextRequest): HeadersInit {
  const h: HeadersInit = {
    'user-agent': req.headers.get('user-agent') || '',
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'accept-encoding': 'identity',
    'referer': 'https://elevenlabs.io/',
    'origin': 'https://elevenlabs.io',
  }
  const ct = req.headers.get('content-type'); if (ct) (h as any)['content-type'] = ct
  const auth = req.headers.get('authorization'); if (auth) (h as any)['authorization'] = auth
  // Allow identitytoolkit to set cookies if needed (still public CORS open)
  h['access-control-allow-origin'] = '*'
  h['access-control-allow-credentials'] = 'true'
  const cookie = req.headers.get('cookie'); if (cookie) (h as any)['cookie'] = cookie
  return h
}

type Ctx = { params: Promise<{ path?: string[] }> }

async function forward(method: string, req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstream = new URL(p + (url.search || ''), pickBase())
  const body = (method === 'GET' || method === 'HEAD') ? undefined : await req.arrayBuffer()
  const res = await fetch(upstream.toString(), { method, headers: buildHeaders(req), body, redirect: 'manual' })
  const headers = new Headers(res.headers)
  headers.delete('content-encoding'); headers.delete('content-length')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-credentials', 'false')
  return new Response(method === 'HEAD' ? null : res.body, { status: res.status, statusText: res.statusText, headers })
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204, headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
  }})
}

export async function GET(req: NextRequest, ctx: Ctx) { return forward('GET', req, ctx) }
export async function HEAD(req: NextRequest, ctx: Ctx) { return forward('HEAD', req, ctx) }
export async function POST(req: NextRequest, ctx: Ctx) { return forward('POST', req, ctx) }
export async function PUT(req: NextRequest, ctx: Ctx) { return forward('PUT', req, ctx) }
export async function PATCH(req: NextRequest, ctx: Ctx) { return forward('PATCH', req, ctx) }
export async function DELETE(req: NextRequest, ctx: Ctx) { return forward('DELETE', req, ctx) }


