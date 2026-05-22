'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Search, History, Info, AlertTriangle, ShieldAlert, Zap } from 'lucide-react'
import {
  filterHiggsfieldEvents,
  summarizeHiggsfieldUsageRows,
  detectHiggsfieldAnomalies,
  buildUnifiedGenerationHistory,
  type HiggsfieldEventFilterMode,
  type HiggsfieldUsageEvent as UsageRow,
  type HiggsfieldAnomaly,
  type UnifiedGenerationRow,
} from './higgsfieldUsageUtils'

type EmailRow = { email: string; credits: number }

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
    case 'unlimited_generate': return 'Unlimited Generate'
    case 'standard_generate': return 'Standard Generate'
    case 'network_jobs_api': return 'Réseau /jobs API'
    case 'wallet_snapshot': return 'Wallet snapshot'
    case 'wallet_inferred': return 'Wallet HF (débit)'
    case 'abuse_detected': return '⚠ Abus détecté'
    case 'intercepted_generate': return 'Intercepté'
    case 'document_capture': return '⚠ Bruit (capture)'
    case 'network_leak': return '⚠ Bruit (network leak)'
    case 'form_submit': return '⚠ Bruit (form)'
    default: return s || '—'
  }
}

function severityBadge(severity: HiggsfieldAnomaly['severity']) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold'
  switch (severity) {
    case 'high': return <span className={`${base} bg-red-500/20 text-red-400 border border-red-500/30`}>🔴 Critique</span>
    case 'medium': return <span className={`${base} bg-amber-500/20 text-amber-400 border border-amber-500/30`}>🟡 Moyen</span>
    case 'low': return <span className={`${base} bg-blue-500/20 text-blue-400 border border-blue-500/30`}>🔵 Faible</span>
  }
}

function anomalyTypeLabel(type: HiggsfieldAnomaly['type']) {
  switch (type) {
    case 'not_tracked_by_overlay': return 'Non tracké par overlay'
    case 'cost_mismatch': return 'Écart de coût'
    case 'unlim_but_charged': return 'Unlimited → crédits débités'
    case 'abuse_detected': return 'Comportement suspect'
    case 'rapid_fire': return 'Rapid-fire'
    case 'wallet_drop_untracked': return 'Wallet ↓ sans tracking'
    case 'noise_overlay_spam': return 'Bruit overlay'
  }
}

function trackingBadge(tracking: UnifiedGenerationRow['tracking']) {
  const base = 'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border'
  if (tracking === 'network') return <span className={`${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/30`}>réseau</span>
  if (tracking === 'wallet_inferred') return <span className={`${base} bg-sky-500/15 text-sky-300 border-sky-500/30`}>wallet</span>
  return <span className={`${base} bg-purple-500/15 text-purple-300 border-purple-500/30`}>overlay</span>
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
  const [mode, setMode] = useState<HiggsfieldEventFilterMode>('chargeable')

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'email' || field === 'source' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    const rows = filterHiggsfieldEvents(data, { mode, emailQuery: filter })
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
  }, [data, sortField, sortDir, filter, mode])

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
        <div className="flex items-center gap-2">
          {([
            { id: 'chargeable', label: 'Avec coût' },
            { id: 'all', label: 'Tous' },
            { id: 'unlimited', label: 'Unlimited' },
          ] as const).map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                mode === option.id
                  ? 'bg-purple-500/20 border-purple-500/40 text-white'
                  : 'bg-gray-900/60 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
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
                  <td className="p-3 text-gray-400">{formatDateFR(e.created_at || e.at)}</td>
                  <td className="p-3 font-medium">{e.email || '—'}</td>
                  <td className="p-3 text-right text-amber-400">+{e.delta}</td>
                  <td className="p-3 text-right text-gray-400">{e.used_today ?? '—'}</td>
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

/* ------------------------------------------------------------------ */
/*  Credit History — mirrors the Higgsfield credit history UI style   */
/* ------------------------------------------------------------------ */

export function HiggsfieldCreditHistory({ data }: { data: UsageRow[] }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    let rows = buildUnifiedGenerationHistory(data)
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      rows = rows.filter(r =>
        (r.email || '').toLowerCase().includes(q) ||
        r.feature.toLowerCase().includes(q) ||
        (r.tracking || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [data, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safeP = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <History className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-semibold">Credit History</h2>
        <span className="text-xs text-gray-500">(réseau /jobs + overlay, dédupliqué)</span>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0) }}
            placeholder="Filtrer par email ou source…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl bg-white/5 p-8 text-center text-gray-400">
          Aucun historique de crédits pour le moment.
        </div>
      ) : (
        <>
          <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="p-4 text-left text-gray-400 font-medium">Credits</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Feature</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Source</th>
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
                        {e.delta} credit{e.delta !== 1 ? 's' : ''}
                        <Info className="h-3.5 w-3.5 text-gray-500" title={e.source || ''} />
                      </span>
                    </td>
                    <td className="p-4 text-white">{e.feature}</td>
                    <td className="p-4">{trackingBadge(e.tracking)}</td>
                    <td className="p-4">
                      <span className="text-amber-400 font-medium">{e.action}</span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{e.email || '—'}</td>
                    <td className="p-4 text-gray-400">{formatDateFR(e.at)}</td>
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
                ← Précédent
              </button>
              <span className="text-sm text-gray-500">
                Page {safeP + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safeP >= totalPages - 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-white/10 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Anomaly / Discrepancy Module                                        */
/* ------------------------------------------------------------------ */

export function HiggsfieldAnomalyTable({ data }: { data: UsageRow[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<HiggsfieldAnomaly['type'] | 'all'>('all')

  const anomalies = useMemo(() => detectHiggsfieldAnomalies(data), [data])

  const filtered = useMemo(() => {
    let rows = anomalies
    if (typeFilter !== 'all') rows = rows.filter(a => a.type === typeFilter)
    if (filter.trim()) {
      const q = filter.trim().toLowerCase()
      rows = rows.filter(a =>
        (a.email || '').toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q) ||
        (a.hfUserId || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [anomalies, typeFilter, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: anomalies.length }
    for (const a of anomalies) {
      c[a.type] = (c[a.type] || 0) + 1
    }
    return c
  }, [anomalies])

  const networkRows = data.filter(r => r.source === 'network_jobs_api' || r.source === 'abuse_detected')
  const ecomRows = data.filter(r => r.source && ['standard_generate', 'unlimited_generate', 'intercepted_generate'].includes(r.source))

  if (anomalies.length === 0 && networkRows.length === 0) {
    return (
      <div className="border border-white/10 rounded-xl bg-white/5 p-8 text-center text-gray-400">
        <ShieldAlert className="h-8 w-8 text-gray-600 mx-auto mb-3" />
        <p className="font-medium">Aucune anomalie détectée</p>
        <p className="text-sm mt-1 text-gray-500">
          Le module réseau n&apos;a pas encore reçu d&apos;événements <code className="text-xs bg-gray-800 px-1 rounded">network_jobs_api</code>. Mettez à jour l&apos;extension pour activer le tracking réseau.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coverage summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Événements réseau (/jobs API)</div>
          <div className="text-2xl font-bold text-white">{networkRows.length}</div>
          <div className="text-xs text-gray-500 mt-1">Générations capturées au niveau réseau</div>
        </div>
        <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Événements overlay (ancien système)</div>
          <div className="text-2xl font-bold text-white">{ecomRows.length}</div>
          <div className="text-xs text-gray-500 mt-1">Clics bouton trackés par l&apos;overlay</div>
        </div>
        <div className={`border rounded-xl p-4 ${anomalies.filter(a => a.severity === 'high').length > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-900/60 border-white/10'}`}>
          <div className="text-xs text-gray-400 mb-1">Anomalies détectées</div>
          <div className={`text-2xl font-bold ${anomalies.filter(a => a.severity === 'high').length > 0 ? 'text-red-400' : 'text-white'}`}>{anomalies.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {anomalies.filter(a => a.severity === 'high').length} critiques · {anomalies.filter(a => a.severity === 'medium').length} moyennes
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold">Signaux</h2>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Email, modèle, user_id…"
            className="w-full pl-9 pr-3 py-1.5 bg-gray-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: 'all', label: `Tous (${counts.all || 0})` },
            { id: 'not_tracked_by_overlay', label: `Non tracké (${counts.not_tracked_by_overlay || 0})` },
            { id: 'cost_mismatch', label: `Écart coût (${counts.cost_mismatch || 0})` },
            { id: 'unlim_but_charged', label: `Unlimited+coût (${counts.unlim_but_charged || 0})` },
            { id: 'abuse_detected', label: `Abus (${counts.abuse_detected || 0})` },
            { id: 'rapid_fire', label: `Rapid-fire (${counts.rapid_fire || 0})` },
            { id: 'wallet_drop_untracked', label: `Wallet ↓ (${counts.wallet_drop_untracked || 0})` },
            { id: 'noise_overlay_spam', label: `Bruit (${counts.noise_overlay_spam || 0})` },
          ] as const).map(opt => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                typeFilter === opt.id
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                  : 'bg-gray-900/60 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl bg-white/5 p-6 text-center text-gray-400">
          Aucune anomalie pour ce filtre.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((anomaly, idx) => (
            <div
              key={idx}
              className={`border rounded-xl overflow-hidden transition-colors ${
                anomaly.severity === 'high'
                  ? 'border-red-500/30 bg-red-900/10'
                  : anomaly.severity === 'medium'
                  ? 'border-amber-500/30 bg-amber-900/10'
                  : 'border-white/10 bg-gray-900/30'
              }`}
            >
              {/* Header row */}
              <button
                className="w-full text-left p-4 flex flex-wrap items-start gap-3"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {severityBadge(anomaly.severity)}
                    <span className="text-sm font-semibold text-white">{anomalyTypeLabel(anomaly.type)}</span>
                    {anomaly.model && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs">
                        <Zap className="h-3 w-3" />
                        {anomaly.model}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-snug">{anomaly.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500">{formatDateFR(anomaly.at)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{anomaly.email || anomaly.hfUserId || '—'}</div>
                  <div className="text-xs text-amber-400 mt-0.5">
                    {expandedIdx === idx ? '▲ Réduire' : '▼ Voir fix'}
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedIdx === idx && (
                <div className="border-t border-white/5 p-4 space-y-3 bg-black/20">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-gray-500 mb-0.5">Email EE</div>
                      <div className="text-white font-mono break-all">{anomaly.email || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">HF User ID</div>
                      <div className="text-white font-mono break-all text-[11px]">{anomaly.hfUserId || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">Coût réseau</div>
                      <div className="text-amber-400 font-semibold">{anomaly.networkDelta != null ? `${anomaly.networkDelta} cr` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">Coût overlay</div>
                      <div className={`font-semibold ${anomaly.ecomDelta != null && anomaly.networkDelta != null && anomaly.ecomDelta < anomaly.networkDelta ? 'text-red-400' : 'text-white'}`}>
                        {anomaly.ecomDelta != null ? `${anomaly.ecomDelta} cr` : '—'}
                      </div>
                    </div>
                    {anomaly.diff != null && (
                      <div>
                        <div className="text-gray-500 mb-0.5">Écart</div>
                        <div className={`font-semibold ${anomaly.diff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {anomaly.diff > 0 ? '+' : ''}{anomaly.diff} cr
                          {anomaly.diff < 0 && <span className="text-gray-400 font-normal ml-1">(sous-décompté)</span>}
                        </div>
                      </div>
                    )}
                    {anomaly.abuseFlags.length > 0 && (
                      <div className="col-span-2 sm:col-span-3">
                        <div className="text-gray-500 mb-0.5">Flags abus</div>
                        <div className="flex flex-wrap gap-1">
                          {anomaly.abuseFlags.map(f => (
                            <span key={f} className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 text-[11px] font-mono border border-red-500/20">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <div className="text-xs font-semibold text-amber-300 mb-1">Correctif suggéré</div>
                    <p className="text-xs text-amber-100/80 leading-relaxed">{anomaly.suggestedFix}</p>
                  </div>
                  {anomaly.comparisonSource && (
                    <div className="text-xs text-gray-500">
                      Source comparaison : <code className="bg-gray-800 px-1 rounded text-gray-300">{anomaly.comparisonSource}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
