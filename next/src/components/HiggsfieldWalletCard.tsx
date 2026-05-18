'use client'

import { useEffect, useState, useCallback } from 'react'
import { Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react'

type WalletSnapshot = {
  id?: number
  workspace_id: string | null
  credits_balance_raw: number | null
  credits_balance_display: number | null
  subscription_balance: number | null
  total_credits: number | null
  ee_email: string | null
  at: string
  after_gen: boolean
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
      const res = await fetch('/api/higgsfield/wallet?limit=5')
      const data = await res.json()
      if (data.ok) {
        setSnapshots(data.snapshots || [])
        setLastRefresh(new Date())
      } else {
        setError(data.note === 'table_not_ready' ? 'Migration SQL requise (voir ci-dessous)' : data.error || 'Erreur API')
      }
    } catch (e) {
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
  const display = latest?.credits_balance_display ?? null
  const raw = latest?.credits_balance_raw ?? null
  const total = latest?.total_credits ?? null
  const sub = latest?.subscription_balance ?? null

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
            {sub !== null && (
              <div className="bg-gray-800/50 rounded-lg p-2.5">
                <div className="text-gray-500 mb-0.5">Subscription balance</div>
                <div className="text-white font-semibold">{(sub / 100).toFixed(2)} cr</div>
              </div>
            )}
            {latest.workspace_id && (
              <div className="bg-gray-800/50 rounded-lg p-2.5 col-span-1">
                <div className="text-gray-500 mb-0.5">Workspace</div>
                <div className="text-white font-mono text-[10px] truncate">{latest.workspace_id}</div>
              </div>
            )}
            {latest.ee_email && (
              <div className="bg-gray-800/50 rounded-lg p-2.5 col-span-2">
                <div className="text-gray-500 mb-0.5">Email EE associé</div>
                <div className="text-white">{latest.ee_email}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-3">
            <span>
              Dernier snapshot : <span className="text-gray-400">{timeSince(latest.at)}</span>
              {latest.after_gen && <span className="ml-1 text-purple-400">(post-génération)</span>}
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
                    <span>{timeSince(s.at)}{s.after_gen ? ' ↗' : ''}</span>
                    <span className="text-gray-400">{s.credits_balance_display !== null ? s.credits_balance_display.toFixed(2) + ' cr' : '—'}</span>
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
