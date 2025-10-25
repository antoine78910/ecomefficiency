import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

// GET - Récupérer la liste des IPs bloquées
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_ips')
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

// POST - Ajouter une nouvelle IP bloquée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip_address, reason, expires_at, notes } = body

    if (!ip_address) {
      return NextResponse.json({ error: 'Adresse IP requise' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_ips')
      .insert({
        ip_address,
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

    return NextResponse.json({ data, message: 'IP bloquée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une IP bloquée
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
      .from('blocked_ips')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'IP supprimée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Modifier une IP bloquée
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ip_address, reason, expires_at, notes, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const updateData: any = {}
    if (ip_address) updateData.ip_address = ip_address
    if (reason !== undefined) updateData.reason = reason
    if (expires_at !== undefined) updateData.expires_at = expires_at
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('blocked_ips')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'IP modifiée avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
