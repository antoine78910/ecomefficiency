import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export const dynamic = 'force-dynamic'

// API pour marquer la fin d'une session (logout ou fermeture)
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
    
    // Mettre à jour la session avec l'heure de fin
    const now = new Date().toISOString()
    
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('user_sessions')
      .select('created_at')
      .eq('id', session_id)
      .single()
    
    if (fetchError) {
      console.error('[end-session] Error fetching session:', fetchError)
    }
    
    // Calculer la durée de la session en secondes
    let duration_seconds = 0
    if (session?.created_at) {
      const start = new Date(session.created_at).getTime()
      const end = new Date(now).getTime()
      duration_seconds = Math.floor((end - start) / 1000)
    }
    
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        ended_at: now,
        is_active: false,
        duration_seconds
      })
      .eq('id', session_id)
    
    if (error) {
      console.error('[end-session] Error updating session:', error)
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, duration_seconds })
    
  } catch (error) {
    console.error('[end-session] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

