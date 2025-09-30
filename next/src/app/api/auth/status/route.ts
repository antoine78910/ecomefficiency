import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function cors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin') || '*'
  res.headers.set('access-control-allow-origin', origin)
  res.headers.set('vary', 'origin')
  res.headers.set('access-control-allow-credentials', 'true')
  res.headers.set('access-control-allow-headers', 'content-type, authorization')
  res.headers.set('access-control-allow-methods', 'GET,OPTIONS')
}

export function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 })
  cors(req, res)
  return res
}

export function GET(req: NextRequest) {
  const has = Boolean(
    req.cookies.get('sb-access-token') ||
    req.cookies.get('sb:token') ||
    req.cookies.get('sb-refresh-token') ||
    (req.cookies.get('ee-auth')?.value === '1')
  )
  const res = NextResponse.json({ loggedIn: has }, { status: 200 })
  cors(req, res)
  return res
}


