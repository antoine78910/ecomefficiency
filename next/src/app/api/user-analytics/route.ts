import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days') || 30)))
    const start = searchParams.get('start') || ''
    const end = searchParams.get('end') || ''
    const mode = searchParams.get('mode') || ''

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Calculer les dates de début et fin
    let startDate: string
    let endDate: string

    if (start && end) {
      startDate = start
      endDate = end
    } else {
      const today = new Date()
      const daysAgo = new Date(today)
      daysAgo.setDate(today.getDate() - days)
      
      startDate = daysAgo.toISOString().slice(0, 10)
      endDate = today.toISOString().slice(0, 10)
    }

    console.log(`[USER_ANALYTICS] Fetching data from ${startDate} to ${endDate}`)

    // Récupérer les données des utilisateurs dans la période
    const { data: users, error } = await supabaseAdmin
      .from('user_analytics')
      .select('*')
      .gte('joined_at', `${startDate}T00:00:00.000Z`)
      .lte('joined_at', `${endDate}T23:59:59.999Z`)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('[USER_ANALYTICS] Database error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Si mode=totals, retourner les totaux agrégés
    if (mode === 'totals') {
      const totals: Record<string, { members: number; subscribers: number }> = {}
      
      for (const user of users || []) {
        const source = user.source || 'other'
        if (!totals[source]) {
          totals[source] = { members: 0, subscribers: 0 }
        }
        totals[source].members += 1
        if (user.is_subscriber) {
          totals[source].subscribers += 1
        }
      }

      return NextResponse.json({ 
        ok: true, 
        start: startDate, 
        end: endDate, 
        totals 
      })
    }

    // Si mode=alltime, retourner tous les totaux
    if (mode === 'alltime') {
      const { data: allUsers, error: allError } = await supabaseAdmin
        .from('user_analytics')
        .select('source, is_subscriber')

      if (allError) {
        return NextResponse.json({ ok: false, error: allError.message }, { status: 500 })
      }

      const totals: Record<string, { members: number; subscribers: number }> = {}
      
      for (const user of allUsers || []) {
        const source = user.source || 'other'
        if (!totals[source]) {
          totals[source] = { members: 0, subscribers: 0 }
        }
        totals[source].members += 1
        if (user.is_subscriber) {
          totals[source].subscribers += 1
        }
      }

      return NextResponse.json({ ok: true, totals })
    }

    // Grouper par date et source
    const dailyData: Record<string, Record<string, { members: number; subscribers: number }>> = {}
    
    for (const user of users || []) {
      const date = user.joined_at.slice(0, 10) // YYYY-MM-DD
      const source = user.source || 'other'
      
      if (!dailyData[date]) {
        dailyData[date] = {}
      }
      if (!dailyData[date][source]) {
        dailyData[date][source] = { members: 0, subscribers: 0 }
      }
      
      dailyData[date][source].members += 1
      if (user.is_subscriber) {
        dailyData[date][source].subscribers += 1
      }
    }

    // Convertir en format attendu par le frontend
    const rows = []
    for (const [date, sources] of Object.entries(dailyData)) {
      for (const [source, data] of Object.entries(sources)) {
        rows.push({
          date,
          source,
          members_count: data.members,
          subscribers_count: data.subscribers
        })
      }
    }

    return NextResponse.json({ 
      ok: true, 
      start: startDate, 
      end: endDate, 
      rows: rows.sort((a, b) => a.date.localeCompare(b.date))
    })

  } catch (e: any) {
    console.error('[USER_ANALYTICS] Error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

// API pour ajouter un utilisateur (appelée lors de l'inscription)
export async function DELETE() {
  try {
    const supabase = supabaseAdmin

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    // Supprimer toutes les données de la table
    const { error } = await supabase
      .from('user_analytics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tout

    if (error) {
      console.error('[USER_ANALYTICS] Delete error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'All data deleted' })

  } catch (e: any) {
    console.error('[USER_ANALYTICS] Delete exception:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, email, source, joinedAt, subscribedAt, isSubscriber } = body

    if (!userId || !source) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from('user_analytics')
      .upsert({
        user_id: userId,
        email: email || null,
        source: source.toLowerCase(),
        joined_at: joinedAt || new Date().toISOString(),
        subscribed_at: subscribedAt || null,
        is_subscriber: isSubscriber || false
      }, { 
        onConflict: 'id' 
      })

    if (error) {
      console.error('[USER_ANALYTICS] Insert error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (e: any) {
    console.error('[USER_ANALYTICS] POST error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
