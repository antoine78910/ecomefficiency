'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'

type UsageRow = {
  id?: number
  email: string | null
  delta: number
  used_today: number | null
  at: string
  created_at?: string
  user_agent?: string | null
  source?: string | null
}

type EmailRow = { email: string; credits: number }

type SortDir = 'asc' | 'desc'

function SortButton({ active, dir, onClick }: { active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-purple-400' : 'text-gray-400'}`}
    >
      <ArrowUpDown className="h-3.5 w-3.5" />
      {active && <span className="text-[10px] uppercase">{dir}</span>}
    </button>
  )
}

export function HiggsfieldEmailTable({ data }: { data: EmailRow[] }) {
  const [sortField, setSortField] = useState<'email' | 'credits'>('credits')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  function toggleSort(field: 'email' | 'credits') {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'email' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    let rows = data
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      rows = rows.filter(r => r.email.toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      if (sortField === 'email') {
        const cmp = a.email.localeCompare(b.email)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const cmp = a.credits - b.credits
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortField, sortDir, filter])

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-semibold">Par email</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrer par email…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="p-4 text-left">
                <span className="flex items-center gap-2">
                  Email
                  <SortButton active={sortField === 'email'} dir={sortDir} onClick={() => toggleSort('email')} />
                </span>
              </th>
              <th className="p-4 text-right">
                <span className="flex items-center justify-end gap-2">
                  Crédits consommés
                  <SortButton active={sortField === 'credits'} dir={sortDir} onClick={() => toggleSort('credits')} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-center text-gray-500">Aucun résultat</td>
              </tr>
            ) : (
              filtered.map(({ email, credits }) => (
                <tr key={email} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium">{email}</td>
                  <td className="p-4 text-right text-amber-400 font-semibold">{credits.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function HiggsfieldEventsTable({ data }: { data: UsageRow[] }) {
  const [sortField, setSortField] = useState<'date' | 'email' | 'delta' | 'used_today' | 'source'>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'email' || field === 'source' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    let rows = data
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      rows = rows.filter(r => (r.email || '').toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date': {
          const da = new Date(a.created_at || a.at || 0).getTime()
          const db = new Date(b.created_at || b.at || 0).getTime()
          cmp = da - db
          break
        }
        case 'email':
          cmp = (a.email || '').localeCompare(b.email || '')
          break
        case 'delta':
          cmp = (a.delta || 0) - (b.delta || 0)
          break
        case 'used_today':
          cmp = (a.used_today || 0) - (b.used_today || 0)
          break
        case 'source':
          cmp = (a.source || '').localeCompare(b.source || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortField, sortDir, filter])

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-semibold">Derniers événements</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrer par email…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} événement{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl bg-white/5 p-8 text-center text-gray-400">
          {data.length === 0
            ? "Aucun enregistrement pour le moment. Les crédits apparaîtront ici une fois que l'extension aura envoyé des événements."
            : 'Aucun événement pour cet email.'}
        </div>
      ) : (
        <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30 max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="p-3 text-left">
                  <span className="flex items-center gap-1">
                    Date
                    <SortButton active={sortField === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
                  </span>
                </th>
                <th className="p-3 text-left">
                  <span className="flex items-center gap-1">
                    Email
                    <SortButton active={sortField === 'email'} dir={sortDir} onClick={() => toggleSort('email')} />
                  </span>
                </th>
                <th className="p-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    Delta
                    <SortButton active={sortField === 'delta'} dir={sortDir} onClick={() => toggleSort('delta')} />
                  </span>
                </th>
                <th className="p-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    Used today
                    <SortButton active={sortField === 'used_today'} dir={sortDir} onClick={() => toggleSort('used_today')} />
                  </span>
                </th>
                <th className="p-3 text-left">
                  <span className="flex items-center gap-1">
                    Source
                    <SortButton active={sortField === 'source'} dir={sortDir} onClick={() => toggleSort('source')} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id ?? i} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-gray-400">
                    {e.created_at
                      ? new Date(e.created_at).toLocaleString('fr-FR')
                      : e.at
                        ? new Date(e.at).toLocaleString('fr-FR')
                        : '—'}
                  </td>
                  <td className="p-3 font-medium">{e.email || '—'}</td>
                  <td className="p-3 text-right text-amber-400">+{e.delta}</td>
                  <td className="p-3 text-right text-gray-400">{e.used_today ?? '—'}</td>
                  <td className="p-3 text-gray-400">{e.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
