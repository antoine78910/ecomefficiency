import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noContentWithCookie() {
  const res = new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
    }
  })
  try {
    // Set a lightweight auth hint cookie for this host
    res.cookies.set('ee-auth', '1', {
      path: '/',
      sameSite: 'lax',
    })
  } catch {}
  return res
}

export function GET() { return noContentWithCookie() }
export function HEAD() { return noContentWithCookie() }
export function POST() { return noContentWithCookie() }

