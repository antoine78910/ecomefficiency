import AdminNavigation from '@/components/AdminNavigation'
import { Zap, AlertTriangle } from 'lucide-react'
import { supabaseAdmin } from '@/integrations/supabase/server'
import { HiggsfieldEmailTable, HiggsfieldEventsTable, HiggsfieldCreditHistory, HiggsfieldAnomalyTable } from '@/components/HiggsfieldTables'
import {
  summarizeHiggsfieldUsageRows,
  buildUnifiedGenerationHistory,
  getLatestWalletBalances,
  type HiggsfieldUsageEvent,
} from '@/components/higgsfieldUsageUtils'
import { HiggsfieldWalletCard } from '@/components/HiggsfieldWalletCard'

export const dynamic = 'force-dynamic'

async function fetchHiggsfieldUsage() {
  if (!supabaseAdmin)
    return {
      events: [],
      totalCredits: 0,
      byEmail: [],
      unlimitedClicks: 0,
      unlimitedCredits: 0,
      standardClicks: 0,
      standardCredits: 0,
      unifiedCount: 0,
      networkGenCount: 0,
      walletBalances: [],
    }

  // Try to fetch with extended network-tracking columns first, fall back gracefully
  const FULL_COLS = 'id, email, delta, used_today, at, created_at, user_agent, source, hf_user_id, model, hf_cost_raw, use_unlim, abuse_flags, comparison_source, comparison_delta'
  const BASE_COLS = 'id, email, delta, used_today, at, created_at, user_agent, source'
  const COMPAT_COLS = 'id, email, delta, used_today, at, created_at, user_agent'

  let events: HiggsfieldUsageEvent[] | null = null
  let error: { message?: string } | null = null

  // First try: full columns (after migration)
  const full = await supabaseAdmin
    .from('higgsfield_usage_events')
    .select(FULL_COLS)
    .order('at', { ascending: false })
    .limit(5000)

  if (!full.error) {
    events = full.data as HiggsfieldUsageEvent[]
  } else {
    // Fall back to base columns
    const base = await supabaseAdmin
      .from('higgsfield_usage_events')
      .select(BASE_COLS)
      .order('at', { ascending: false })
      .limit(5000)
    if (!base.error) {
      events = base.data as HiggsfieldUsageEvent[]
    } else {
      // Last resort: no source column either
      const compat = await supabaseAdmin
        .from('higgsfield_usage_events')
        .select(COMPAT_COLS)
        .order('at', { ascending: false })
        .limit(5000)
      events = compat.data as HiggsfieldUsageEvent[]
      error = compat.error
    }
  }

  if (error) {
    console.error('[admin/higgsfield]', error.message)
    return {
      events: [],
      totalCredits: 0,
      byEmail: [],
      unlimitedClicks: 0,
      unlimitedCredits: 0,
      standardClicks: 0,
      standardCredits: 0,
      unifiedCount: 0,
      networkGenCount: 0,
      walletBalances: [],
    }
  }
  const rows = (events || []) as HiggsfieldUsageEvent[]
  const summary = summarizeHiggsfieldUsageRows(rows)
  const unified = buildUnifiedGenerationHistory(rows)
  const networkGenCount = rows.filter((r) => r.source === 'network_jobs_api').length
  const walletBalances = getLatestWalletBalances(rows)
  return {
    events: rows,
    totalCredits: summary.totalCredits,
    byEmail: summary.byEmail,
    unlimitedClicks: summary.unlimitedClicks,
    unlimitedCredits: summary.unlimitedCredits,
    standardClicks: summary.standardClicks,
    standardCredits: summary.standardCredits,
    unifiedCount: unified.length,
    networkGenCount,
    walletBalances,
  }
}

async function fetchWalletSnapshotsForAdmin() {
  if (!supabaseAdmin) return []
  const COLS =
    'id, email, delta, used_today, at, created_at, source, hf_cost_raw, comparison_source, comparison_delta'
  const { data, error } = await supabaseAdmin
    .from('higgsfield_usage_events')
    .select(COLS)
    .eq('source', 'wallet_snapshot')
    .order('at', { ascending: false })
    .limit(40)
  if (error) {
    const fallback = await supabaseAdmin
      .from('higgsfield_usage_events')
      .select('id, email, delta, used_today, at, created_at, source')
      .eq('source', 'wallet_snapshot')
      .order('at', { ascending: false })
      .limit(40)
    return (fallback.data || []) as HiggsfieldUsageEvent[]
  }
  return (data || []) as HiggsfieldUsageEvent[]
}

export default async function AdminHiggsfieldPage() {
  const [usage, walletSnapshots] = await Promise.all([
    fetchHiggsfieldUsage(),
    fetchWalletSnapshotsForAdmin(),
  ])
  const {
    events,
    totalCredits,
    byEmail,
    unlimitedClicks,
    unlimitedCredits,
    standardClicks,
    standardCredits,
    unifiedCount,
    networkGenCount,
    walletBalances,
  } = usage

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-amber-500" />
            Crédits Higgsfield consommés
          </h1>
          <p className="text-gray-400">
            Générations enregistrées via l&apos;extension (extension → POST /api/usage/higgsfield)
          </p>
        </div>

        {/* Live Wallet Balance — client component, auto-refreshes every 30s */}
        <div className="mb-8">
          <HiggsfieldWalletCard
            initialSnapshots={walletSnapshots}
            walletBalances={walletBalances}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200 text-sm">Total crédits consommés</p>
                <p className="text-2xl font-bold">{totalCredits.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-amber-200" />
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Générations (historique unifié)</p>
              <p className="text-2xl font-bold">{unifiedCount}</p>
              <p className="text-gray-500 text-xs">{networkGenCount} via réseau /jobs</p>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Snapshots wallet reçus</p>
              <p className="text-2xl font-bold">{walletSnapshots.length}</p>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Emails distincts</p>
              <p className="text-2xl font-bold">{byEmail.length}</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Clics bouton Unlimited validés</p>
                <p className="text-2xl font-bold">{unlimitedClicks}</p>
                <p className="text-purple-200 text-xs">{unlimitedCredits} crédits</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-white/10 rounded-xl p-4">
            <div>
              <p className="text-gray-400 text-sm">Clics bouton Generate (standard) validés</p>
              <p className="text-2xl font-bold">{standardClicks}</p>
              <p className="text-gray-400 text-xs">{standardCredits} crédits</p>
            </div>
          </div>
        </div>

        {/* Anomaly module — shown prominently if network tracking has data */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-bold">Signaux</h2>
            <span className="text-sm text-gray-500">(réseau /jobs, wallet, overlay, écarts)</span>
          </div>
          <HiggsfieldAnomalyTable data={events} />
        </div>

        <div className="mb-8">
          <HiggsfieldCreditHistory data={events} />
        </div>

        {byEmail.length > 0 && (
          <div className="mb-8">
            <HiggsfieldEmailTable data={byEmail} />
          </div>
        )}

        <div>
          <HiggsfieldEventsTable data={events} />
        </div>
      </div>
    </div>
  )
}
