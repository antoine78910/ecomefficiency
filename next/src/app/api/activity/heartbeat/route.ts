import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export const dynamic = 'force-dynamic'

// API pour tracker l'activité en temps réel (heartbeat toutes les 30 secondes)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, user_id } = body
    
    if (!session_id || !user_id) {
      return NextResponse.json({ error: 'Missing session_id or user_id' }, { status: 400 })
    }
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    // Mettre à jour le last_activity de la session
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        is_active: true
      })
      .eq('id', session_id)
    
    if (error) {
      console.error('[heartbeat] Error updating session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[heartbeat] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

