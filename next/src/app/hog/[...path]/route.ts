import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ path?: string[] }> }

function respond(status: number) {
  return new NextResponse(null, {
    status,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'false',
      'cache-control': 'no-store',
    },
  })
}

export function OPTIONS(_req: NextRequest, _ctx: Ctx) { return respond(204) }
export function GET(_req: NextRequest, _ctx: Ctx) { return respond(204) }
export function POST(_req: NextRequest, _ctx: Ctx) { return respond(204) }
export function PUT(_req: NextRequest, _ctx: Ctx) { return respond(204) }
export function PATCH(_req: NextRequest, _ctx: Ctx) { return respond(204) }
export function DELETE(_req: NextRequest, _ctx: Ctx) { return respond(204) }


