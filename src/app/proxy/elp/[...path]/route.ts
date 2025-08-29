import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://payload.elevenlabs.io'

function buildHeaders(req: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    'user-agent': req.headers.get('user-agent') || '',
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'accept-encoding': 'identity',
    'referer': 'https://elevenlabs.io/',
    'origin': 'https://elevenlabs.io',
  }
  const auth = req.headers.get('authorization')
  if (auth) (headers as any)['authorization'] = auth
  const contentType = req.headers.get('content-type')
  if (contentType) (headers as any)['content-type'] = contentType
  const cookie = req.headers.get('cookie')
  if (cookie) (headers as any)['cookie'] = cookie
  return headers
}

type Ctx = { params: Promise<{ path?: string[] }> }

async function forward(method: string, req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstreamUrl = new URL(p + (url.search || ''), BASE)
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer()
  const res = await fetch(upstreamUrl.toString(), {
    method,
    headers: buildHeaders(req),
    body,
    redirect: 'manual',
  })
  const headers = new Headers(res.headers)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-credentials', 'false')
  headers.delete('content-encoding')
  headers.delete('content-length')
  return new Response(method === 'HEAD' ? null : res.body, { status: res.status, statusText: res.statusText, headers })
}

export function OPTIONS() {
  return NextResponse.json({}, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400',
    }
  })
}

export async function GET(req: NextRequest, ctx: Ctx) { return forward('GET', req, ctx) }
export async function HEAD(req: NextRequest, ctx: Ctx) { return forward('HEAD', req, ctx) }
export async function POST(req: NextRequest, ctx: Ctx) { return forward('POST', req, ctx) }
export async function PUT(req: NextRequest, ctx: Ctx) { return forward('PUT', req, ctx) }
export async function PATCH(req: NextRequest, ctx: Ctx) { return forward('PATCH', req, ctx) }
export async function DELETE(req: NextRequest, ctx: Ctx) { return forward('DELETE', req, ctx) }


