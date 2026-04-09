import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export const dynamic = 'force-dynamic'

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) {
    const ip = xf.split(',')[0]?.trim()
    if (ip) return ip
  }
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown'
}

const VALID_ACTIONS = ['copy_password', 'copy_email', 'copy_username', 'page_visit', 'tool_access'] as const

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, email, action, tool_name, meta } = body

    if (!user_id || !action) {
      return NextResponse.json({ error: 'Missing user_id or action' }, { status: 400 })
    }
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const ip_address = getClientIp(req)
    const country = (req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || '').toUpperCase() || null
    const user_agent = req.headers.get('user-agent') || null

    const { error } = await supabaseAdmin.from('ip_events').insert({
      user_id,
      email: email || null,
      action,
      tool_name: tool_name || null,
      ip_address,
      country,
      user_agent,
      meta: meta || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[track-event] Insert error:', error)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[track-event] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
