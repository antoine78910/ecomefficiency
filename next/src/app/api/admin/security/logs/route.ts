import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

// GET - Récupérer les logs de sécurité
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const ip = searchParams.get('ip')

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    let query = supabaseAdmin
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('blocked_type', type)
    }

    if (ip) {
      query = query.eq('ip_address', ip)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Compter le total pour la pagination
    let countQuery = supabaseAdmin
      .from('security_logs')
      .select('*', { count: 'exact', head: true })

    if (type) {
      countQuery = countQuery.eq('blocked_type', type)
    }

    if (ip) {
      countQuery = countQuery.eq('ip_address', ip)
    }

    const { count } = await countQuery

    return NextResponse.json({ 
      data, 
      total: count || 0,
      limit,
      offset 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer des logs anciens
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    if (days < 1) {
      return NextResponse.json({ error: 'Nombre de jours invalide' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { error, count } = await supabaseAdmin
      .from('security_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${count || 0} logs supprimés (plus anciens que ${days} jours)` 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
