"use client"

import React from "react"
import AdminNavigation from "@/components/AdminNavigation"
import { RefreshCw, Star } from "lucide-react"

type Row = {
  id: string
  email: string | null
  review_prompt_shown_at: string | null
  review_prompt_dismissed_at: string | null
  review_prompt_dismissed_reason?: string | null
  review_prompt_submitted_at: string | null
  review_prompt_shown_count?: number | null
  review_prompt_last_action?: string | null
  review_prompt_last_action_at?: string | null
  review_prompt_close_count?: number | null
  review_prompt_later_count?: number | null
  review_prompt_submitted_attempt?: number | null
  review_rating: number | null
  review_feedback: string | null
  review_trustpilot_clicked_at: string | null
  review_promo_step_reached_at: string | null
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()
  const [rows, setRows] = React.useState<Row[]>([])
  const [totals, setTotals] = React.useState<any>(null)
  const [filter, setFilter] = React.useState<"all" | "responded" | "not_responded">("all")
  const [sort, setSort] = React.useState<"shown" | "submitted" | "attempts">("shown")

  const load = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const r = await fetch("/api/admin/reviews", { cache: "no-store" })
      const j = await r.json().catch(() => ({} as any))
      if (!j?.ok) throw new Error(j?.error || "Failed to load")
      setRows(j.rows || [])
      setTotals(j.totals || null)
    } catch (e: any) {
      setError(String(e?.message || "Error"))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const viewRows = React.useMemo(() => {
    const filtered = rows.filter((r) => {
      const responded = Boolean(r.review_prompt_submitted_at)
      if (filter === "responded") return responded
      if (filter === "not_responded") return !responded
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "attempts") {
        const aa = Number(a.review_prompt_shown_count || 0)
        const bb = Number(b.review_prompt_shown_count || 0)
        return bb - aa
      }
      if (sort === "submitted") {
        return String(b.review_prompt_submitted_at || "").localeCompare(String(a.review_prompt_submitted_at || ""))
      }
      // shown
      return String(b.review_prompt_shown_at || "").localeCompare(String(a.review_prompt_shown_at || ""))
    })
    return sorted
  }, [rows, filter, sort])

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Star className="h-8 w-8 text-purple-500" />
            Reviews & Feedback
          </h1>
          <p className="text-gray-400">Popup rating + feedback + Trustpilot flow</p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={load}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            {loading && <span className="text-gray-400">Chargement…</span>}
            {error && <span className="text-red-400">{error}</span>}
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <label className="text-xs text-gray-400">
                Filter{" "}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="ml-2 bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                >
                  <option value="all">All</option>
                  <option value="responded">Responded</option>
                  <option value="not_responded">No response</option>
                </select>
              </label>
              <label className="text-xs text-gray-400">
                Sort{" "}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="ml-2 bg-black/40 border border-white/10 rounded px-2 py-1 text-white"
                >
                  <option value="shown">Last shown</option>
                  <option value="submitted">Submitted</option>
                  <option value="attempts">Attempts</option>
                </select>
              </label>
              <div className="text-xs text-gray-400">
                Showing <span className="text-white font-semibold">{viewRows.length}</span>
              </div>
            </div>
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
              <div className="text-purple-200 text-sm">Shown</div>
              <div className="text-2xl font-bold">{Number(totals.shown || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
              <div className="text-green-200 text-sm">Submitted</div>
              <div className="text-2xl font-bold">{Number(totals.submitted || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4">
              <div className="text-red-200 text-sm">Dismissed</div>
              <div className="text-2xl font-bold">{Number(totals.dismissed || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-4">
              <div className="text-gray-200 text-sm">No response</div>
              <div className="text-2xl font-bold">{Number(totals.no_response || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
              <div className="text-blue-200 text-sm">Trustpilot click</div>
              <div className="text-2xl font-bold">{Number(totals.trustpilot_clicked || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-xl p-4">
              <div className="text-cyan-200 text-sm">Trustpilot redirect</div>
              <div className="text-2xl font-bold">{Number(totals.trustpilot_redirected || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 rounded-xl p-4">
              <div className="text-fuchsia-200 text-sm">Promo step</div>
              <div className="text-2xl font-bold">{Number(totals.promo_step || 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        {totals?.ratings ? (
          <div className="mb-6 border border-white/10 rounded-xl bg-gray-900/30 p-4">
            <div className="text-sm font-semibold mb-3">Ratings distribution</div>
            <div className="grid grid-cols-5 gap-3">
              {(["1", "2", "3", "4", "5"] as const).map((k) => (
                <div key={k} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="text-xs text-gray-400">{k} star</div>
                  <div className="text-xl font-bold">{Number(totals.ratings[k] || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Attempts</th>
                <th className="p-4 text-left">Last action</th>
                <th className="p-4 text-left">Rating</th>
                <th className="p-4 text-left">Feedback</th>
                <th className="p-4 text-left">Shown</th>
                <th className="p-4 text-left">Submitted</th>
                <th className="p-4 text-left">Dismissed</th>
                <th className="p-4 text-left">Trustpilot</th>
              </tr>
            </thead>
            <tbody>
              {viewRows.map((r) => {
                const responded = Boolean(r.review_prompt_submitted_at)
                const reason = String(r.review_prompt_dismissed_reason || "")
                const lastAction =
                  responded ? "submitted" : (r.review_prompt_last_action || reason || (r.review_prompt_dismissed_at ? "dismissed" : (r.review_prompt_shown_at ? "shown" : "—")))
                const pill = (label: string, cls: string) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${cls}`}>{label}</span>
                )
                const actionPill =
                  lastAction === "submitted"
                    ? pill("submitted", "border-green-500/30 text-green-200 bg-green-500/10")
                    : lastAction === "later"
                      ? pill("another time", "border-yellow-500/30 text-yellow-200 bg-yellow-500/10")
                      : lastAction === "close"
                        ? pill("closed", "border-red-500/30 text-red-200 bg-red-500/10")
                        : pill(String(lastAction), "border-white/10 text-gray-200 bg-white/5")
                return (
                <tr key={r.id} className="odd:bg-gray-900/20 hover:bg-gray-800/30 align-top">
                  <td className="p-4 whitespace-nowrap">{r.email || "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-200">
                    <span className="font-semibold">{Number(r.review_prompt_shown_count || (r.review_prompt_shown_at ? 1 : 0))}</span>
                    {r.review_prompt_later_count ? <span className="ml-2 text-xs text-yellow-300">later×{Number(r.review_prompt_later_count)}</span> : null}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {actionPill}
                    <div className="text-xs text-gray-500 mt-1">
                      {r.review_prompt_last_action_at ? new Date(r.review_prompt_last_action_at).toLocaleString() : "—"}
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {r.review_rating ? <span className="font-semibold text-yellow-300">{r.review_rating}★</span> : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="p-4 min-w-[360px] text-gray-200">
                    {r.review_feedback ? <div className="whitespace-pre-wrap break-words">{r.review_feedback}</div> : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{r.review_prompt_shown_at ? new Date(r.review_prompt_shown_at).toLocaleString() : "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{r.review_prompt_submitted_at ? new Date(r.review_prompt_submitted_at).toLocaleString() : "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{r.review_prompt_dismissed_at ? new Date(r.review_prompt_dismissed_at).toLocaleString() : "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{r.review_trustpilot_clicked_at ? "clicked" : "—"}</td>
                </tr>
              )})}
              {!rows.length ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400">
                    No review popup data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

