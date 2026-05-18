'use client'

import { useEffect, useState, useCallback } from 'react'
import { Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react'

// Wallet snapshots are stored in the existing higgsfield_usage_events table
// with source = 'wallet_snapshot' to avoid requiring a migration.
// Fields mapping:
//   email         → EE email
//   used_today    → credits balance display (e.g. 100.57)
//   hf_cost_raw   → credits balance raw units (e.g. 10057)
//   comparison_source → workspace_id
//   comparison_delta  → total_credits raw
//   at / created_at   → snapshot timestamp
type WalletSnapshot = {
  id?: number
  email: string | null
  used_today: number | null        // display credits (e.g. 100.57)
  hf_cost_raw?: number | null      // raw units (e.g. 10057)
  comparison_source?: string | null // workspace_id
  comparison_delta?: number | null  // total_credits
  at: string
  created_at?: string
  source: string
}

function timeSince(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime()
  if (ms < 60000) return 'à l\'instant'
  if (ms < 3600000) return `il y a ${Math.floor(ms / 60000)} min`
  if (ms < 86400000) return `il y a ${Math.floor(ms / 3600000)}h`
  return `il y a ${Math.floor(ms / 86400000)}j`
}

function CreditBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function HiggsfieldWalletCard() {
  const [snapshots, setSnapshots] = useState<WalletSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)

  const fetchSnapshots = useCallback(async () => {
    try {
      setError(null)
      // wallet_snapshots are stored in the existing usage events table
      const res = await fetch('/api/higgsfield/wallet?limit=10')
      const data = await res.json()
      if (data.ok) {
        setSnapshots(data.snapshots || [])
        setLastRefresh(new Date())
      } else {
        setError(data.error || 'Erreur API')
      }
    } catch {
      setError('Impossible de joindre l\'API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSnapshots()
    const iv = setInterval(fetchSnapshots, 30000) // auto-refresh every 30s
    return () => clearInterval(iv)
  }, [fetchSnapshots])

  // Tick every 30s to update relative timestamps
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  const latest = snapshots[0] ?? null
  const display = latest?.used_today ?? null                  // credits balance display (e.g. 100.57)
  const raw = latest?.hf_cost_raw ?? null                    // raw units (e.g. 10057)
  const total = latest?.comparison_delta ?? null             // total_credits raw
  const workspaceId = latest?.comparison_source ?? null      // workspace_id

  const pct = (raw != null && total != null && total > 0) ? ((raw / total) * 100) : null

  return (
    <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <span className="font-bold text-white">Balance Higgsfield (live)</span>
          {!loading && !error && <Wifi className="h-4 w-4 text-green-400" />}
          {error && <WifiOff className="h-4 w-4 text-red-400" />}
        </div>
        <button
          onClick={fetchSnapshots}
          disabled={loading}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          title="Rafraîchir"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-300">
          {error}
          {error.includes('Migration') && (
            <div className="mt-2 text-xs text-gray-400 font-mono bg-black/30 p-2 rounded">
              {`CREATE TABLE IF NOT EXISTS higgsfield_wallet_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT,
  credits_balance_raw NUMERIC,
  credits_balance_display NUMERIC,
  subscription_balance NUMERIC,
  total_credits NUMERIC,
  ee_email TEXT,
  at TIMESTAMPTZ DEFAULT NOW(),
  after_gen BOOLEAN DEFAULT FALSE
);`}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="h-20 flex items-center justify-center text-gray-500 text-sm">Chargement…</div>
      ) : latest === null ? (
        <div className="rounded-lg bg-gray-800/50 p-4 text-sm text-gray-400 text-center">
          Aucun snapshot reçu.<br />
          <span className="text-xs">L&apos;extension enverra la balance après chaque génération.</span>
        </div>
      ) : (
        <>
          {/* Main balance */}
          <div className="text-center py-2">
            <div className="text-4xl font-bold text-white">
              {display !== null ? display.toFixed(2) : '—'}
              <span className="text-lg text-gray-400 font-normal ml-1">cr</span>
            </div>
            {raw !== null && (
              <div className="text-xs text-gray-500 mt-0.5">{raw.toLocaleString()} unités brutes</div>
            )}
            {pct !== null && (
              <CreditBar value={raw!} max={total!} />
            )}
            {pct !== null && (
              <div className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% du total ({total?.toLocaleString()} unités)</div>
            )}
          </div>

          {/* Detail row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {raw !== null && (
              <div className="bg-gray-800/50 rounded-lg p-2.5">
                <div className="text-gray-500 mb-0.5">Unités brutes HF</div>
                <div className="text-white font-semibold">{raw.toLocaleString()}</div>
              </div>
            )}
            {workspaceId && (
              <div className="bg-gray-800/50 rounded-lg p-2.5 col-span-1">
                <div className="text-gray-500 mb-0.5">Workspace</div>
                <div className="text-white font-mono text-[10px] truncate">{workspaceId}</div>
              </div>
            )}
            {latest.email && (
              <div className="bg-gray-800/50 rounded-lg p-2.5 col-span-2">
                <div className="text-gray-500 mb-0.5">Email EE associé</div>
                <div className="text-white">{latest.email}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-3">
            <span>
              Dernier snapshot : <span className="text-gray-400">{timeSince(latest.created_at || latest.at)}</span>
            </span>
            {lastRefresh && (
              <span>Rafraîchi {timeSince(lastRefresh.toISOString())}</span>
            )}
          </div>

          {/* History mini-table */}
          {snapshots.length > 1 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors">
                Historique ({snapshots.length - 1} snapshots précédents)
              </summary>
              <div className="mt-2 space-y-1">
                {snapshots.slice(1).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-gray-500 py-0.5 border-b border-white/5">
                    <span>{timeSince(s.created_at || s.at)}</span>
                    <span className="text-gray-400">{s.used_today !== null && s.used_today !== undefined ? Number(s.used_today).toFixed(2) + ' cr' : '—'}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
