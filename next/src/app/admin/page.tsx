"use client";
import React from "react";
import AdminNavigation from '@/components/AdminNavigation';
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';

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

type Row = {
  date: string
  source: string
  members_count: number
  subscribers_count: number
}

export default function AdminAnalytics() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|undefined>()
  const [rows, setRows] = React.useState<Row[]>([])
  const [totals, setTotals] = React.useState<Record<string, { members: number; subscribers: number }>>({})
  const [rangeMode, setRangeMode] = React.useState<'last7'|'last30'|'all'>('last30')

  const load = async () => {
    setLoading(true)
    setError(undefined)
    try {
      let url = '/api/discord/analytics'
      
      if (rangeMode === 'last7') {
        url += '?days=7'
      } else if (rangeMode === 'last30') {
        url += '?days=30'
      } else if (rangeMode === 'all') {
        url += '?mode=alltime'
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load')
      }
      
      if (rangeMode === 'all') {
        setTotals(data.totals || {})
        setRows([])
      } else {
        setRows(data.rows || [])
        
        // Calculer les totaux à partir des rows
        const calculatedTotals: Record<string, { members: number; subscribers: number }> = {}
        data.rows.forEach((row: Row) => {
          if (!calculatedTotals[row.source]) {
            calculatedTotals[row.source] = { members: 0, subscribers: 0 }
          }
          calculatedTotals[row.source].members += row.members_count
          calculatedTotals[row.source].subscribers += row.subscribers_count
        })
        setTotals(calculatedTotals)
      }
      
    } catch (e: any) {
      setError(e?.message || 'Error')
    } finally { 
      setLoading(false) 
    }
  }

  React.useEffect(() => { 
    load()
  }, [rangeMode])

  const onRefresh = () => {
    load()
  }

  // Calculer les totaux globaux
  const totalMembers = Object.values(totals).reduce((sum, item) => sum + (item?.members || 0), 0)
  const totalSubscribers = Object.values(totals).reduce((sum, item) => sum + (item?.subscribers || 0), 0)

  // Calculer le taux de conversion par canal
  const getConversionRate = (members: number, subscribers: number) => {
    if (members === 0) return '0'
    return ((subscribers / members) * 100).toFixed(1)
  }

  // Grouper les données par date pour l'historique
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
    b.date.localeCompare(a.date)
  )

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400">Suivi des membres Discord et abonnés payants par canal</p>
        </div>

        {/* Contrôles */}
        <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Période</label>
              <select value={rangeMode} onChange={(e)=>setRangeMode(e.target.value as any)} className="bg-black border border-white/10 rounded px-3 py-2 text-white">
                <option value="last7">7 derniers jours</option>
                <option value="last30">30 derniers jours</option>
                <option value="all">Tout le temps</option>
              </select>
            </div>
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
                <p className="text-purple-200 text-sm">Total Membres</p>
                <p className="text-2xl font-bold">{totalMembers.toLocaleString()}</p>
                <p className="text-purple-200 text-xs">{rangeMode === 'all' ? 'Tout le temps' : 'Période sélectionnée'}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Total Abonnés</p>
                <p className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</p>
                <p className="text-green-200 text-xs">{rangeMode === 'all' ? 'Tout le temps' : 'Période sélectionnée'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Taux Conversion</p>
                <p className="text-2xl font-bold">{getConversionRate(totalMembers, totalSubscribers)}%</p>
                <p className="text-blue-200 text-xs">Global</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Canaux Actifs</p>
                <p className="text-2xl font-bold">{Object.keys(totals).length}</p>
                <p className="text-orange-200 text-xs">Sources</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Répartition par canal */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Répartition par canal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SOURCES.map(source => {
              const data = totals[source]
              const total = data?.members || 0
              const payants = data?.subscribers || 0
              
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
                      <span className="text-sm text-gray-400">Total</span>
                      <span className="font-semibold">{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Payants</span>
                      <span className="font-semibold text-green-400">{payants.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Conversion</span>
                      <span className="font-semibold text-yellow-400">{getConversionRate(total, payants)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Historique quotidien */}
        {sortedDailyData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historique quotidien
            </h2>
            <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="p-4 text-left">Date</th>
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
                    <th className="p-4 text-center font-semibold text-green-400">Total Abonnés</th>
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
        )}
      </div>
    </div>
  )
}