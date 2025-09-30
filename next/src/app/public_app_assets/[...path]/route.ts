import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://elevenlabs.io/public_app_assets'

type Ctx = { params: Promise<{ path?: string[] }> }

function buildHeaders(req: NextRequest): HeadersInit {
  const h: HeadersInit = {
    'user-agent': req.headers.get('user-agent') || '',
    'accept': req.headers.get('accept') || '*/*',
    'accept-language': req.headers.get('accept-language') || 'en-US,en;q=0.9',
    'accept-encoding': 'identity',
    'referer': 'https://elevenlabs.io/',
    'origin': 'https://elevenlabs.io',
  }
  const cookie = req.headers.get('cookie')
  if (cookie) (h as any)['cookie'] = cookie
  return h
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  const p = '/' + ((path && path.join('/')) || '')
  const url = new URL(req.url)
  const upstream = new URL(p + (url.search || ''), BASE)
  const res = await fetch(upstream.toString(), { method: 'GET', headers: buildHeaders(req), redirect: 'manual' })
  const headers = new Headers(res.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}


