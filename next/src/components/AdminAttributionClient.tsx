"use client";

import React from "react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { BarChart3, RefreshCw, Users, DollarSign, HelpCircle } from "lucide-react";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  source: string;
  stripe_customer_id: string | null;
  paid: boolean | null;
  plan: string | null;
  sub_status: string | null;
};

export default function AdminAttributionClient({ token }: { token?: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [totals, setTotals] = React.useState<{ total: number; paid: number; unpaid: number; unknown: number }>({ total: 0, paid: 0, unpaid: 0, unknown: 0 });
  const [bySource, setBySource] = React.useState<Record<string, { total: number; paid: number; unknownPaid: number }>>({});
  const [stripeEnabled, setStripeEnabled] = React.useState(false);
  const [filterPaid, setFilterPaid] = React.useState<"all" | "paid" | "unpaid" | "unknown">("all");
  const [filterSource, setFilterSource] = React.useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/attribution", window.location.origin);
      url.searchParams.set("limit", "200");
      if (token) url.searchParams.set("token", token);
      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) {
        if (r.status === 401) {
          if (!token) window.location.href = "/admin/login";
          return;
        }
        throw new Error(String(j?.error || "Failed to load"));
      }
      setUsers(Array.isArray(j.users) ? j.users : []);
      setTotals(j.totals || { total: 0, paid: 0, unpaid: 0, unknown: 0 });
      setBySource(j.bySource || {});
      setStripeEnabled(Boolean(j.stripeEnabled));
    } catch (e: any) {
      setError(String(e?.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const sources = React.useMemo(() => {
    const keys = Object.keys(bySource || {});
    keys.sort((a, b) => (bySource[b]?.total || 0) - (bySource[a]?.total || 0));
    return keys;
  }, [bySource]);

  const filtered = React.useMemo(() => {
    return (users || []).filter((u) => {
      if (filterSource !== "all" && String(u.source || "unknown") !== filterSource) return false;
      if (filterPaid === "paid" && u.paid !== true) return false;
      if (filterPaid === "unpaid" && u.paid !== false) return false;
      if (filterPaid === "unknown" && u.paid !== null) return false;
      return true;
    });
  }, [users, filterPaid, filterSource]);

  const conversion = totals.total ? ((totals.paid / totals.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {!token ? <AdminNavigation /> : null}

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            Signup Attribution
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Source choisie sur <code className="text-gray-300">/getting-started</code> + statut payé (Stripe).
          </p>
          {token ? (
            <p className="text-gray-500 text-xs mt-2">
              Page protégée par <code className="text-gray-300">ADMIN_PANEL_TOKEN</code>. Ouvre{" "}
              <code className="text-gray-300">/admin/attribution?token=…</code>.
            </p>
          ) : null}
          {!stripeEnabled ? (
            <p className="text-yellow-300/80 text-xs mt-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Stripe n’est pas configuré (statut payé = unknown).
            </p>
          ) : null}
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 mb-6 border border-white/10">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Paid filter</label>
              <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value as any)} className="bg-black border border-white/10 rounded px-3 py-2 text-white">
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source</label>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-black border border-white/10 rounded px-3 py-2 text-white">
                <option value="all">All</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s} ({bySource[s]?.total || 0})
                  </option>
                ))}
              </select>
            </div>
            <button onClick={load} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {loading ? <span className="text-gray-400 text-sm">Loading…</span> : null}
            {error ? <span className="text-red-400 text-sm">{error}</span> : null}
            <div className="ml-auto">
              {!token ? <AdminLogoutButton /> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Total users</p>
                <p className="text-2xl font-bold">{totals.total.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Paid users</p>
                <p className="text-2xl font-bold">{totals.paid.toLocaleString()}</p>
                <p className="text-green-200 text-xs">{conversion}% conversion</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-200 text-sm">Unknown paid status</p>
                <p className="text-2xl font-bold">{totals.unknown.toLocaleString()}</p>
              </div>
              <HelpCircle className="h-8 w-8 text-gray-200" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">By source</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sources.map((s) => {
              const d = bySource[s];
              const conv = d?.total ? ((d.paid / d.total) * 100).toFixed(1) : "0.0";
              return (
                <button
                  key={s}
                  onClick={() => setFilterSource(s)}
                  className="text-left rounded-xl border border-white/10 bg-gray-900/40 hover:bg-gray-900/60 transition-colors p-4"
                >
                  <div className="text-white font-semibold capitalize">{s}</div>
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Total</span>
                      <span className="text-gray-200">{d?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paid</span>
                      <span className="text-green-400">{d?.paid || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Conversion</span>
                      <span className="text-yellow-300">{conv}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {!sources.length ? <div className="text-gray-500 text-sm">No data yet.</div> : null}
          </div>
        </div>

        <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Created</th>
                <th className="p-4 text-left">Source</th>
                <th className="p-4 text-left">Paid</th>
                <th className="p-4 text-left">Plan / Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="odd:bg-gray-900/20 hover:bg-gray-800/30">
                  <td className="p-4">
                    <div className="text-white font-medium">{u.email || "—"}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{u.id.slice(0, 8)}…</div>
                  </td>
                  <td className="p-4 text-gray-300">
                    {u.created_at ? new Date(u.created_at).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-white/5 border border-white/10 capitalize">
                      {u.source || "unknown"}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.paid === true ? (
                      <span className="text-green-400 font-semibold">Paid</span>
                    ) : u.paid === false ? (
                      <span className="text-gray-300">Unpaid</span>
                    ) : (
                      <span className="text-yellow-300/80">Unknown</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-300">
                    <div className="capitalize">{u.plan || "—"}</div>
                    <div className="text-[11px] text-gray-500">{u.sub_status || "—"}</div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={5}>
                    No rows match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

