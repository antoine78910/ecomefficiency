import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getClientIp(req: NextRequest): string | null {
  try {
    const xf = req.headers.get('x-forwarded-for') || ''
    if (xf) {
      const ip = xf.split(',')[0]?.trim()
      if (ip) return ip
    }
    const cf = req.headers.get('cf-connecting-ip') || ''
    if (cf) return cf
    const xr = req.headers.get('x-real-ip') || ''
    if (xr) return xr
  } catch {}
  return null
}

export function GET(req: NextRequest) {
  return (async () => {
    let ip = getClientIp(req)
    const country = (req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || '').toUpperCase() || null
    const isLoopback = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')
    if (isLoopback) {
      try {
        const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (j?.ip) ip = j.ip
      } catch {}
    }
    return NextResponse.json({ ip, country }, { status: 200 })
  })()
}


