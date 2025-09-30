import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noContent() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'false',
    },
  })
}

export function OPTIONS() { return noContent() }
export function GET() { return noContent() }
export function POST() { return noContent() }
export function PUT() { return noContent() }
export function PATCH() { return noContent() }
export function DELETE() { return noContent() }


