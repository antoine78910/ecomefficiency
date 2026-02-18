"use client"

import React from "react"
import AdminNavigation from "@/components/AdminNavigation"
import { ClipboardList, RefreshCw, Users } from "lucide-react"

type Row = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  auth_provider?: string | null
  acquisition_source: string | null
  acquisition_source_other?: string | null
  acquisition_work_type: string | null
  acquisition_work_type_other?: string | null
  acquisition_source_context: string | null
  acquisition_onboarding_completed_at: string | null
  acquisition_paid_at_answer: boolean | null
  acquisition_plan_at_answer: string | null
  stripe_customer_id: string | null
  paid_current?: boolean | null
  paid_effective?: boolean | null
  plan_effective?: string | null
  sub_status?: string | null
  paid_source?: "stripe" | "snapshot" | string
}

export default function AdminOnboardingPage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()
  const [users, setUsers] = React.useState<Row[]>([])
  const [totals, setTotals] = React.useState<any>(null)
  const [limit, setLimit] = React.useState(500)

  const load = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const r = await fetch(`/api/admin/onboarding?limit=${encodeURIComponent(String(limit))}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({} as any))
      if (!j?.ok) throw new Error(j?.error || "Failed to load")
      setUsers(j.users || [])
      setTotals(j.totals || null)
    } catch (e: any) {
      setError(String(e?.message || "Error"))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <ClipboardList className="h-8 w-8 text-purple-500" />
            Onboarding
          </h1>
          <p className="text-gray-400">Emails + réponses à la page getting-started (source, work type, snapshot paid)</p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Limit</label>
              <input
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value || 0))}
                type="number"
                min={1}
                max={2000}
                className="bg-black border border-white/10 rounded px-3 py-2 text-white w-28"
              />
            </div>
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
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Onboarded</p>
                  <p className="text-2xl font-bold">{Number(totals.onboarded || 0).toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
              <p className="text-green-200 text-sm">Paid (current)</p>
              <p className="text-2xl font-bold">
                {Number((totals.paid_current_true ?? totals.paid_snapshot_true) || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4">
              <p className="text-red-200 text-sm">Unpaid (current)</p>
              <p className="text-2xl font-bold">
                {Number((totals.paid_current_false ?? totals.paid_snapshot_false) || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-4">
              <p className="text-gray-200 text-sm">Unknown (current)</p>
              <p className="text-2xl font-bold">
                {Number((totals.paid_current_unknown ?? totals.paid_snapshot_unknown) || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
              <p className="text-blue-200 text-sm">Paid (snapshot)</p>
              <p className="text-2xl font-bold">{Number(totals.paid_snapshot_true || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-4">
              <p className="text-orange-200 text-sm">Unpaid (snapshot)</p>
              <p className="text-2xl font-bold">{Number(totals.paid_snapshot_false || 0).toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl p-4">
              <p className="text-gray-200 text-sm">Stripe enabled</p>
              <p className="text-2xl font-bold">{totals.stripe_enabled ? "yes" : "no"}</p>
            </div>
          </div>
        )}

        <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="p-4 text-left">Answered</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Auth</th>
                <th className="p-4 text-left">Source</th>
                <th className="p-4 text-left">Work</th>
                <th className="p-4 text-left">Paid?</th>
                <th className="p-4 text-left">Plan</th>
                <th className="p-4 text-left">Stripe</th>
                <th className="p-4 text-left">Context</th>
                <th className="p-4 text-left">User id</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="odd:bg-gray-900/20 hover:bg-gray-800/30">
                  <td className="p-4 whitespace-nowrap text-gray-200">
                    {u.acquisition_onboarding_completed_at ? new Date(u.acquisition_onboarding_completed_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-4 whitespace-nowrap">{u.email || "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-200">
                    {u.auth_provider ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[12px]">
                        {String(u.auth_provider).toLowerCase() === "google" ? "google" : String(u.auth_provider).toLowerCase() === "email" ? "email" : u.auth_provider}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-200">
                    {u.acquisition_source || "—"}
                    {String(u.acquisition_source || "").toLowerCase() === "other" && u.acquisition_source_other ? (
                      <div className="text-[11px] text-gray-400 mt-1 max-w-[260px] truncate" title={u.acquisition_source_other}>
                        {u.acquisition_source_other}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-200">
                    {u.acquisition_work_type || "—"}
                    {String(u.acquisition_work_type || "").toLowerCase() === "other" && u.acquisition_work_type_other ? (
                      <div className="text-[11px] text-gray-400 mt-1 max-w-[260px] truncate" title={u.acquisition_work_type_other}>
                        {u.acquisition_work_type_other}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {u.paid_effective === true ? (
                      <span className="text-green-400 font-semibold">paid</span>
                    ) : u.paid_effective === false ? (
                      <span className="text-red-400 font-semibold">unpaid</span>
                    ) : (
                      <span className="text-gray-400">unknown</span>
                    )}{" "}
                    <span className="text-[11px] text-gray-500">
                      ({u.paid_source === "stripe" ? "stripe" : "snapshot"})
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-200">{u.plan_effective || u.acquisition_plan_at_answer || "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">
                    {u.sub_status ? <span className="font-mono">{u.sub_status}</span> : "—"}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{u.acquisition_source_context || "—"}</td>
                  <td className="p-4 whitespace-nowrap text-gray-500 font-mono">{u.id}</td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-gray-400">
                    No onboarding data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

