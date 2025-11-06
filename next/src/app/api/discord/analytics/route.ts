import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Row = {
  date: string
  source: string
  members_count: number
  subscribers_count: number
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  if (!url || !key) throw new Error('Supabase admin env missing')
  return createClient(url, key)
}

export async function POST(req: Request) {
  try {
    const auth = (req.headers.get('authorization') || '').trim()
    const secret = process.env.CREDENTIALS_SECRET || process.env.DISCORD_ANALYTICS_SECRET || ''
    if (!secret || !auth || !auth.toLowerCase().startsWith('bearer ') || auth.slice(7) !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
    const json = await req.json().catch(() => ({})) as { date?: string; rows?: Row[] }
    const date = (json.date || new Date().toISOString().slice(0, 10))
    const rows = Array.isArray(json.rows) ? json.rows : []
    if (!rows.length) return NextResponse.json({ ok: false, error: 'no_rows' }, { status: 400 })
    const supabase = getSupabaseAdmin()
    const payload = rows.map(r => ({ ...r, date }))
    // Debug log: rows count and target date
    console.log('[API] discord_analytics upsert', { rows: payload.length, date })
    const { error } = await supabase.from('discord_analytics').upsert(payload, { onConflict: 'date,source' })
    if (error) console.warn('[API] discord_analytics upsert error', error.message)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.warn('[API] discord_analytics POST exception', e?.message)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || ''
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days') || 30)))
    const date = searchParams.get('date') || ''
    const start = searchParams.get('start') || ''
    const end = searchParams.get('end') || ''
    const supabase = getSupabaseAdmin()

    // Range mode: return rows between start/end; if mode=totals, return aggregation
    if (start && end) {
      const { data, error } = await supabase
        .from('discord_analytics')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      if (mode === 'totals') {
        const totals: Record<string, { members: number; subscribers: number }> = {}
        for (const r of (data || []) as Row[]) {
          const t = totals[r.source] || { members: 0, subscribers: 0 }
          t.members += r.members_count
          t.subscribers += r.subscribers_count
          totals[r.source] = t
        }
        return NextResponse.json({ ok: true, start, end, totals })
      }
      return NextResponse.json({ ok: true, start, end, rows: data || [] })
    }

    if (mode === 'alltime') {
      const { data, error } = await supabase
        .from('discord_analytics')
        .select('source,members_count,subscribers_count')
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      const totals: Record<string, { members: number; subscribers: number }> = {}
      for (const r of (data || []) as Row[]) {
        const t = totals[r.source] || { members: 0, subscribers: 0 }
        t.members += r.members_count
        t.subscribers += r.subscribers_count
        totals[r.source] = t
      }
      return NextResponse.json({ ok: true, totals })
    }

    if (date) {
      // Try exact date first
      let { data, error } = await supabase
        .from('discord_analytics')
        .select('*')
        .eq('date', date)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      if ((data || []).length > 0) return NextResponse.json({ ok: true, date, rows: data || [] })
      // Fallback: get the most recent date <= requested date
      const { data: d2, error: e2 } = await supabase
        .from('discord_analytics')
        .select('date')
        .lte('date', date)
        .order('date', { ascending: false })
        .limit(1)
      if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 })
      const fallbackDate = (d2 && d2[0]?.date) as string | undefined
      if (!fallbackDate) return NextResponse.json({ ok: true, date, rows: [] })
      const { data: d3, error: e3 } = await supabase
        .from('discord_analytics')
        .select('*')
        .eq('date', fallbackDate)
      if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 500 })
      return NextResponse.json({ ok: true, date, fallbackDate, rows: d3 || [] })
    }

    // default: last N days, but if no specific range, get all data since July 2025
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    const july2025 = '2025-07-01'
    const actualSince = since > july2025 ? since : july2025
    
    const { data, error } = await supabase
      .from('discord_analytics')
      .select('*')
      .gte('date', actualSince)
      .order('date', { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, since: actualSince, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}


