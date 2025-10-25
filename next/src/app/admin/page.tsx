"use client";
import React from "react";
import AdminNavigation from '@/components/AdminNavigation';

type Row = { date: string; source: string; members_count: number; subscribers_count: number }

const SOURCES = ['tiktok','insta','google','telegram','discord','twitter','friend','other'] as const

export default function AdminAnalytics() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|undefined>()
  const [rows, setRows] = React.useState<Row[]>([])
  const [totals, setTotals] = React.useState<Record<string, { members: number; subscribers: number }>>({})
  const [rangeTotals, setRangeTotals] = React.useState<Record<string, { members: number; subscribers: number }>>({})
  const [date, setDate] = React.useState<string>('')
  const [rangeMode, setRangeMode] = React.useState<'today'|'yesterday'|'last7'|'last30'|'last365'|'week'|'month'|'ytd'|'all'|'custom'>('last30')
  const [start, setStart] = React.useState<string>('')
  const [end, setEnd] = React.useState<string>('')
  const [fallbackDate, setFallbackDate] = React.useState<string | undefined>(undefined)
  const [sortKey, setSortKey] = React.useState<'date'|'source'|'members'|'subscribers'>('date')
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc')
  const [info, setInfo] = React.useState<string>('')

  const computeRange = (): { qs: string } => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2,'0')
    const fmt = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`
    let s = start, e = end
    if (rangeMode !== 'custom') {
      const today = new Date(d)
      const yesterday = new Date(d); yesterday.setDate(yesterday.getDate()-1)
      if (rangeMode === 'today') { s = fmt(today); e = fmt(today) }
      else if (rangeMode === 'yesterday') { s = fmt(yesterday); e = fmt(yesterday) }
      else if (rangeMode === 'last7') { const s7 = new Date(d); s7.setDate(s7.getDate()-6); s = fmt(s7); e = fmt(today) }
      else if (rangeMode === 'last30') { const s30 = new Date(d); s30.setDate(s30.getDate()-29); s = fmt(s30); e = fmt(today) }
      else if (rangeMode === 'last365') { const s365 = new Date(d); s365.setDate(s365.getDate()-364); s = fmt(s365); e = fmt(today) }
      else if (rangeMode === 'week') {
        const day = d.getDay() || 7; const sW = new Date(d); sW.setDate(d.getDate() - (day-1)); s = fmt(sW); e = fmt(today)
      } else if (rangeMode === 'month') {
        const sM = new Date(d.getFullYear(), d.getMonth(), 1); s = fmt(sM); e = fmt(today)
      } else if (rangeMode === 'ytd') {
        const sY = new Date(d.getFullYear(), 0, 1); s = fmt(sY); e = fmt(today)
      } else if (rangeMode === 'all') { s = ''; e = '' }
    }
    if (s && e) return { qs: `start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}` }
    // default fallback to last 30
    const s30 = new Date(d); s30.setDate(s30.getDate()-29); s = fmt(s30); e = fmt(d)
    return { qs: `start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}` }
  }

  const load = async () => {
    setLoading(true); setError(undefined)
    try {
      const { qs } = computeRange()
      let url = `/api/discord/analytics?${qs}`
      if (date) url = `/api/discord/analytics?date=${encodeURIComponent(date)}`
      const res = await fetch(url)
      const j = await res.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed to load')
      setRows((j.rows || []) as Row[])
      setFallbackDate(j.fallbackDate)
      setInfo(`Loaded ${j.rows?.length || 0} rows${j.fallbackDate ? ` (fallback ${j.fallbackDate})` : ''}`)
      const at = await fetch(`/api/discord/analytics?mode=alltime`)
      const jt = await at.json()
      if (jt?.ok) setTotals(jt.totals || {})
      // Range totals for selected window
      if (qs.includes('start=')) {
        const rt = await fetch(`/api/discord/analytics?mode=totals&${qs}`)
        const jr = await rt.json()
        if (jr?.ok) setRangeTotals(jr.totals || {})
        else setRangeTotals({})
      } else setRangeTotals({})
    } catch (e: any) {
      setError(e?.message || 'Error')
    } finally { setLoading(false) }
  }

  React.useEffect(() => { load() }, [])
  // Auto-refresh when controls change
  React.useEffect(() => { load() }, [rangeMode, start, end])

  const onRefresh = () => load()

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        <h1 className="text-2xl font-bold mb-4">Discord Traffic Analytics</h1>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex items-end gap-2">
          <button onClick={()=>{ const d=new Date(date||new Date()); d.setDate(d.getDate()-1); const s=d.toISOString().slice(0,10); setDate(s); setStart(s); setEnd(s); setRangeMode('custom'); load(); }} className="px-3 py-2 rounded border border-white/10 hover:bg-white/10">◀</button>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date (YYYY-MM-DD)</label>
            <input type="text" value={date} onChange={(e)=>setDate(e.target.value)} placeholder="2025-09-27" className="bg-white/5 border border-white/10 rounded px-2 py-1 w-40" />
          </div>
          <button onClick={()=>{ const d=new Date(date||new Date()); d.setDate(d.getDate()+1); const s=d.toISOString().slice(0,10); setDate(s); setStart(s); setEnd(s); setRangeMode('custom'); load(); }} className="px-3 py-2 rounded border border-white/10 hover:bg-white/10">▶</button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Range</label>
          <select value={rangeMode} onChange={(e)=>setRangeMode(e.target.value as any)} className="bg-black border border-white/10 rounded px-2 py-1 text-white">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last365">Last 12 months</option>
            <option value="week">Week to date</option>
            <option value="month">Month to date</option>
            <option value="ytd">Year to date</option>
            <option value="all">All time</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {rangeMode === 'custom' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Start</label>
              <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="bg-black border border-white/10 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">End</label>
              <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="bg-black border border-white/10 rounded px-2 py-1 text-white" />
            </div>
          </>
        )}
        <button onClick={onRefresh} className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500">Refresh</button>
        {loading ? <span className="text-gray-400">Loading…</span> : null}
        {error ? <span className="text-red-400">{error}</span> : null}
      </div>

      <div className="text-xs text-gray-400 mb-3">{info}</div>
      {fallbackDate && date && (
        <div className="text-xs text-gray-400 mb-3">No rows for {date}. Showing most recent day with data: <span className="text-white">{fallbackDate}</span>.</div>
      )}

      {Object.keys(rangeTotals).length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Selected range totals</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {SOURCES.map(s => (
              <div key={s} className="rounded-xl border border-white/10 bg-gray-900 p-3">
                <div className="text-xs text-gray-400 uppercase">{s}</div>
                <div className="text-sm">Members: {rangeTotals[s]?.members || 0}</div>
                <div className="text-sm">Subscribers: {rangeTotals[s]?.subscribers || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">All‑time totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {SOURCES.map(s => (
            <div key={s} className="rounded-xl border border-white/10 bg-gray-900 p-3">
              <div className="text-xs text-gray-400 uppercase">{s}</div>
              <div className="text-sm">Members: {totals[s]?.members || 0}</div>
              <div className="text-sm">Subscribers: {totals[s]?.subscribers || 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Daily breakdown</h2>
        <div className="overflow-auto border border-white/10 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="p-2 text-left cursor-pointer" onClick={()=>{ setSortKey('date'); setSortDir(sortKey==='date' && sortDir==='desc' ? 'asc' : 'desc') }}>Date</th>
                <th className="p-2 text-left cursor-pointer" onClick={()=>{ setSortKey('source'); setSortDir(sortKey==='source' && sortDir==='desc' ? 'asc' : 'desc') }}>Source</th>
                <th className="p-2 text-left cursor-pointer" onClick={()=>{ setSortKey('members'); setSortDir(sortKey==='members' && sortDir==='desc' ? 'asc' : 'desc') }}>Members</th>
                <th className="p-2 text-left cursor-pointer" onClick={()=>{ setSortKey('subscribers'); setSortDir(sortKey==='subscribers' && sortDir==='desc' ? 'asc' : 'desc') }}>Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice().sort((a,b)=>{
                const dir = sortDir === 'asc' ? 1 : -1
                if (sortKey==='date') return (a.date > b.date ? 1 : a.date < b.date ? -1 : 0) * dir
                if (sortKey==='source') return (a.source > b.source ? 1 : a.source < b.source ? -1 : 0) * dir
                if (sortKey==='members') return (a.members_count - b.members_count) * dir
                return (a.subscribers_count - b.subscribers_count) * dir
              }).map((r, i) => (
                <tr key={`${r.date}-${r.source}-${i}`} className="odd:bg-gray-900/40">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2">{r.members_count}</td>
                  <td className="p-2">{r.subscribers_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}


