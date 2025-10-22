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
    
    const now = new Date().toISOString()
    
    // Mettre à jour le last_activity de la session courante
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        last_activity: now,
        is_active: true
      })
      .eq('id', session_id)
    
    if (error) {
      console.error('[heartbeat] Error updating session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }
    
    // Désactiver automatiquement les sessions qui n'ont pas de heartbeat depuis plus de 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    
    try {
      await supabaseAdmin
        .from('user_sessions')
        .update({ 
          is_active: false,
          ended_at: now
        })
        .eq('is_active', true)
        .lt('last_activity', twoMinutesAgo)
      
      console.log('[heartbeat] Auto-disabled expired sessions')
    } catch (cleanupError) {
      console.error('[heartbeat] Error cleaning up expired sessions:', cleanupError)
      // Non-fatal, continuer
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[heartbeat] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

