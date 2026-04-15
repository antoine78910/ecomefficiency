'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Search, History, Info } from 'lucide-react'

type UsageRow = {
  id?: number
  email: string | null
  delta: number
  used_this_period: number | null
  at: string
  created_at?: string
  user_agent?: string | null
  source?: string | null
}

type EmailRow = { email: string; characters: number }

type SortDir = 'asc' | 'desc'

const TZ = 'Europe/Paris'

function formatDateFR(raw: string | undefined): string {
  if (!raw) return '—'
  try {
    return new Date(raw).toLocaleString('fr-FR', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return new Date(raw).toLocaleString('fr-FR')
  }
}

function sourceLabel(source: string | null | undefined): string {
  const s = (source || '').trim()
  switch (s) {
    case 'tts_generate': return 'Text-to-Speech'
    case 'tts_refund': return 'TTS Refund'
    default: return s || '—'
  }
}

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

export function ElevenlabsEmailTable({ data }: { data: EmailRow[] }) {
  const [sortField, setSortField] = useState<'email' | 'characters'>('characters')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  function toggleSort(field: 'email' | 'characters') {
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
      const cmp = a.characters - b.characters
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortField, sortDir, filter])

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-semibold">By email</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by email…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
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
                  Characters used
                  <SortButton active={sortField === 'characters'} dir={sortDir} onClick={() => toggleSort('characters')} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-center text-gray-500">No results</td>
              </tr>
            ) : (
              filtered.map(({ email, characters }) => (
                <tr key={email} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium">{email}</td>
                  <td className="p-4 text-right text-amber-400 font-semibold">{characters.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ElevenlabsEventsTable({ data }: { data: UsageRow[] }) {
  const [sortField, setSortField] = useState<'date' | 'email' | 'delta' | 'source'>('date')
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
        <h2 className="text-xl font-semibold">Recent events</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by email…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl bg-white/5 p-8 text-center text-gray-400">
          {data.length === 0
            ? 'No events yet. Characters will appear here once the extension sends usage events.'
            : 'No events for this email.'}
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
                    Characters
                    <SortButton active={sortField === 'delta'} dir={sortDir} onClick={() => toggleSort('delta')} />
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
                  <td className="p-3 text-gray-400">{formatDateFR(e.created_at || e.at)}</td>
                  <td className="p-3 font-medium">{e.email || '—'}</td>
                  <td className={`p-3 text-right font-semibold ${e.delta < 0 ? 'text-green-400' : 'text-amber-400'}`}>
                    {e.delta < 0 ? '' : '+'}{e.delta}
                  </td>
                  <td className="p-3 text-gray-400">{sourceLabel(e.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ElevenlabsCreditHistory({ data }: { data: UsageRow[] }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    let rows = data
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      rows = rows.filter(r =>
        (r.email || '').toLowerCase().includes(q) ||
        sourceLabel(r.source).toLowerCase().includes(q)
      )
    }
    return [...rows].sort((a, b) => {
      const da = new Date(a.created_at || a.at || 0).getTime()
      const db = new Date(b.created_at || b.at || 0).getTime()
      return db - da
    })
  }, [data, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeP = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <History className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-semibold">Credit History</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0) }}
            placeholder="Filter by email or source…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl bg-white/5 p-8 text-center text-gray-400">
          No credit history yet.
        </div>
      ) : (
        <>
          <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="p-4 text-left text-gray-400 font-medium">Characters</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Feature</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Action</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Email</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e, i) => (
                  <tr key={e.id ?? (safeP * PAGE_SIZE + i)} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        {Math.abs(e.delta).toLocaleString()} char{Math.abs(e.delta) !== 1 ? 's' : ''}
                        <Info className="h-3.5 w-3.5 text-gray-500" />
                      </span>
                    </td>
                    <td className="p-4 text-white">{sourceLabel(e.source)}</td>
                    <td className="p-4">
                      <span className={e.delta < 0 ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>
                        {e.delta < 0 ? 'Refund' : 'Spent'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{e.email || '—'}</td>
                    <td className="p-4 text-gray-400">{formatDateFR(e.created_at || e.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safeP === 0}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-white/10 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {safeP + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safeP >= totalPages - 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-white/10 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
