import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Route handler for tracking requests to /tr endpoint
 * This endpoint is commonly used by PostHog and other analytics services
 * Returns a proper response to prevent 422/400 errors
 */
function respond(status: number) {
  return new NextResponse(null, {
    status,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'false',
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  })
}

export function OPTIONS(_req: NextRequest) { return respond(204) }
export function GET(_req: NextRequest) { return respond(200) }
export function POST(_req: NextRequest) { 
  // Accept POST requests and return 200 OK to prevent 422 errors
  // The request body is ignored as this is just a tracking endpoint
  return respond(200) 
}
export function PUT(_req: NextRequest) { return respond(200) }
export function PATCH(_req: NextRequest) { return respond(200) }
export function DELETE(_req: NextRequest) { return respond(200) }

