import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ rest?: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { rest } = await ctx.params
  const restPath = (rest && rest.join('/')) || ''
  const url = new URL(req.url)
  // Try to preserve the current elevenlabs session key from the Referer, e.g. /proxy/elevenlabs/s/12345/
  const ref = req.headers.get('referer') || ''
  let session = ''
  try {
    const m = new URL(ref).pathname.match(/\/proxy\/elevenlabs\/s\/(\d{5})\//)
    if (m) session = m[1] || ''
  } catch {}
  const base = session ? `/elevenlabs/s/${session}` : `/elevenlabs`
  const target = `${base}/app/${restPath}${url.search || ''}`
  return Response.redirect(new URL(target, url.origin), 302)
}


