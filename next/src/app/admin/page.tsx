"use client";
import React from "react";
import AdminNavigation from '@/components/AdminNavigation';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';

type Row = { date: string; source: string; members_count: number; subscribers_count: number }

const SOURCES = ['tiktok','insta','google','telegram','discord','twitter','friend','other'] as const

// Couleurs pour chaque canal
const CHANNEL_COLORS = {
  insta: '#E4405F', // Rose Instagram
  google: '#FFD700', // Jaune Google
  tiktok: '#000000', // Noir TikTok
  telegram: '#0088CC', // Bleu Telegram
  twitter: '#00FF00', // Vert fluo Twitter
  friend: '#FF0000', // Rouge Friend
  other: '#FFFFFF', // Blanc Other
  discord: '#5865F2' // Bleu Discord
} as const

const CHANNEL_NAMES = {
  insta: 'Instagram',
  google: 'Google',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  discord: 'Discord',
  twitter: 'Twitter',
  friend: 'Friend',
  other: 'Other'
} as const

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

  // Calculer les totaux et pourcentages
  const totalMembers = Object.values(rangeTotals).reduce((sum, item) => sum + (item?.members || 0), 0)
  const totalSubscribers = Object.values(rangeTotals).reduce((sum, item) => sum + (item?.subscribers || 0), 0)
  const totalAllTimeMembers = Object.values(totals).reduce((sum, item) => sum + (item?.members || 0), 0)
  const totalAllTimeSubscribers = Object.values(totals).reduce((sum, item) => sum + (item?.subscribers || 0), 0)

  // Grouper les données par date pour un affichage plus clair
  const dailyData = rows.reduce((acc, row) => {
    if (!acc[row.date]) {
      acc[row.date] = { date: row.date, channels: {}, totalMembers: 0, totalSubscribers: 0 }
    }
    acc[row.date].channels[row.source] = {
      members: row.members_count,
      subscribers: row.subscribers_count
    }
    acc[row.date].totalMembers += row.members_count
    acc[row.date].totalSubscribers += row.subscribers_count
    return acc
  }, {} as Record<string, any>)

  const sortedDailyData = Object.values(dailyData).sort((a: any, b: any) => 
    sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  )

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400">Suivi des membres Discord et abonnés payants par canal</p>
        </div>

        {/* Contrôles */}
        <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-end gap-2">
              <button onClick={()=>{ const d=new Date(date||new Date()); d.setDate(d.getDate()-1); const s=d.toISOString().slice(0,10); setDate(s); setStart(s); setEnd(s); setRangeMode('custom'); load(); }} className="px-3 py-2 rounded border border-white/10 hover:bg-white/10">◀</button>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date spécifique</label>
                <input type="text" value={date} onChange={(e)=>setDate(e.target.value)} placeholder="2025-01-15" className="bg-white/5 border border-white/10 rounded px-3 py-2 w-40" />
              </div>
              <button onClick={()=>{ const d=new Date(date||new Date()); d.setDate(d.getDate()+1); const s=d.toISOString().slice(0,10); setDate(s); setStart(s); setEnd(s); setRangeMode('custom'); load(); }} className="px-3 py-2 rounded border border-white/10 hover:bg-white/10">▶</button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Période</label>
              <select value={rangeMode} onChange={(e)=>setRangeMode(e.target.value as any)} className="bg-black border border-white/10 rounded px-3 py-2 text-white">
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="last7">7 derniers jours</option>
                <option value="last30">30 derniers jours</option>
                <option value="last365">12 derniers mois</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="ytd">Cette année</option>
                <option value="all">Tout le temps</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>
            {rangeMode === 'custom' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Début</label>
                  <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="bg-black border border-white/10 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fin</label>
                  <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="bg-black border border-white/10 rounded px-3 py-2 text-white" />
                </div>
              </>
            )}
            <button onClick={onRefresh} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Actualiser
            </button>
            {loading && <span className="text-gray-400 flex items-center gap-2"><Calendar className="h-4 w-4" />Chargement…</span>}
            {error && <span className="text-red-400">{error}</span>}
          </div>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Membres Discord</p>
                <p className="text-2xl font-bold">{totalMembers.toLocaleString()}</p>
                <p className="text-purple-200 text-xs">Période sélectionnée</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Ecom Agents</p>
                <p className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</p>
                <p className="text-green-200 text-xs">Abonnés payants</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Membres</p>
                <p className="text-2xl font-bold">{totalAllTimeMembers.toLocaleString()}</p>
                <p className="text-blue-200 text-xs">Tout le temps</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Total Agents</p>
                <p className="text-2xl font-bold">{totalAllTimeSubscribers.toLocaleString()}</p>
                <p className="text-orange-200 text-xs">Tout le temps</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Répartition par canal - Période sélectionnée */}
        {Object.keys(rangeTotals).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Répartition par canal ({rangeMode === 'custom' ? 'Période personnalisée' : rangeMode})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SOURCES.map(source => {
                const data = rangeTotals[source]
                const members = data?.members || 0
                const subscribers = data?.subscribers || 0
                const memberPercentage = totalMembers > 0 ? ((members / totalMembers) * 100).toFixed(1) : '0'
                const subscriberPercentage = totalSubscribers > 0 ? ((subscribers / totalSubscribers) * 100).toFixed(1) : '0'
                
                return (
                  <div key={source} className="rounded-xl border border-white/10 bg-gray-900/50 p-4 hover:bg-gray-900/70 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-4 h-4 rounded-full border-2"
                        style={{ 
                          backgroundColor: CHANNEL_COLORS[source],
                          borderColor: CHANNEL_COLORS[source] === '#FFFFFF' ? '#666' : CHANNEL_COLORS[source]
                        }}
                      />
                      <h3 className="font-semibold">{CHANNEL_NAMES[source]}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Membres Discord</span>
                        <span className="font-semibold">{members.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">{memberPercentage}% du total</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Ecom Agents</span>
                        <span className="font-semibold text-green-400">{subscribers.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">{subscriberPercentage}% du total</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Répartition par canal - Tout le temps */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Répartition par canal (Tout le temps)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SOURCES.map(source => {
              const data = totals[source]
              const members = data?.members || 0
              const subscribers = data?.subscribers || 0
              const memberPercentage = totalAllTimeMembers > 0 ? ((members / totalAllTimeMembers) * 100).toFixed(1) : '0'
              const subscriberPercentage = totalAllTimeSubscribers > 0 ? ((subscribers / totalAllTimeSubscribers) * 100).toFixed(1) : '0'
              
              return (
                <div key={source} className="rounded-xl border border-white/10 bg-gray-900/50 p-4 hover:bg-gray-900/70 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2"
                      style={{ 
                        backgroundColor: CHANNEL_COLORS[source],
                        borderColor: CHANNEL_COLORS[source] === '#FFFFFF' ? '#666' : CHANNEL_COLORS[source]
                      }}
                    />
                    <h3 className="font-semibold">{CHANNEL_NAMES[source]}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Membres Discord</span>
                      <span className="font-semibold">{members.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">{memberPercentage}% du total</div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Ecom Agents</span>
                      <span className="font-semibold text-green-400">{subscribers.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">{subscriberPercentage}% du total</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Détail quotidien */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Détail quotidien
          </h2>
          <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="p-4 text-left cursor-pointer hover:bg-gray-700/50" onClick={()=>{ setSortKey('date'); setSortDir(sortKey==='date' && sortDir==='desc' ? 'asc' : 'desc') }}>
                    Date {sortKey === 'date' && (sortDir === 'desc' ? '↓' : '↑')}
                  </th>
                  {SOURCES.map(source => (
                    <th key={source} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHANNEL_COLORS[source] }}
                        />
                        <span className="text-xs">{CHANNEL_NAMES[source]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-center font-semibold">Total Membres</th>
                  <th className="p-4 text-center font-semibold text-green-400">Total Agents</th>
                </tr>
              </thead>
              <tbody>
                {sortedDailyData.map((day: any, i) => (
                  <tr key={day.date} className="odd:bg-gray-900/20 hover:bg-gray-800/30">
                    <td className="p-4 font-medium">{day.date}</td>
                    {SOURCES.map(source => {
                      const channelData = day.channels[source] || { members: 0, subscribers: 0 }
                      return (
                        <td key={source} className="p-4 text-center">
                          <div className="space-y-1">
                            <div className="text-sm">{channelData.members}</div>
                            <div className="text-xs text-green-400">{channelData.subscribers}</div>
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-4 text-center font-semibold">{day.totalMembers}</td>
                    <td className="p-4 text-center font-semibold text-green-400">{day.totalSubscribers}</td>
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


