import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

// GET - Récupérer la liste des pays bloqués
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_countries')
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

// POST - Ajouter un nouveau pays bloqué
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { country_code, country_name, reason, notes } = body

    if (!country_code || !country_name) {
      return NextResponse.json({ error: 'Code pays et nom requis' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const { data, error } = await supabaseAdmin
      .from('blocked_countries')
      .insert({
        country_code: country_code.toUpperCase(),
        country_name,
        reason: reason || 'Blocage manuel',
        notes: notes || null,
        created_by: 'admin'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Pays bloqué avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer un pays bloqué
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
      .from('blocked_countries')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Pays supprimé avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Modifier un pays bloqué
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, country_code, country_name, reason, notes, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 500 })
    }
    
    const updateData: any = {}
    if (country_code) updateData.country_code = country_code.toUpperCase()
    if (country_name) updateData.country_name = country_name
    if (reason !== undefined) updateData.reason = reason
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('blocked_countries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Pays modifié avec succès' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
