import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

// GET - Récupérer la liste des plages IP bloquées
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_ip_ranges')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajouter une nouvelle plage IP bloquée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip_range, reason, expires_at, notes } = body

    if (!ip_range) {
      return NextResponse.json({ error: 'Plage IP requise' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_ip_ranges')
      .insert({
        ip_range,
        reason: reason || 'Blocage manuel',
        expires_at: expires_at || null,
        notes: notes || null,
        created_by: 'admin'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Plage IP bloquée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une plage IP bloquée
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { error } = await supabaseAdmin
      .from('blocked_ip_ranges')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Plage IP supprimée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Modifier une plage IP bloquée
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ip_range, reason, expires_at, notes, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const updateData: any = {}
    if (ip_range) updateData.ip_range = ip_range
    if (reason !== undefined) updateData.reason = reason
    if (expires_at !== undefined) updateData.expires_at = expires_at
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('blocked_ip_ranges')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Plage IP modifiée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
