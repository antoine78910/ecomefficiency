"use client";

import React from "react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { BarChart3, RefreshCw, MousePointerClick, UserPlus, CreditCard, Globe } from "lucide-react";

type ChannelStats = {
  clicks: number;
  landings: number;
  signups: number;
  conversions: number;
};

type Rates = {
  landingRate: number;
  signupRate: number;
  conversionRate: number;
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram (/try)",
  tiktok: "TikTok (/start)",
};

export default function AdminFunnelClient() {
  const [days, setDays] = React.useState(30);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totals, setTotals] = React.useState<ChannelStats>({
    clicks: 0,
    landings: 0,
    signups: 0,
    conversions: 0,
  });
  const [byChannel, setByChannel] = React.useState<Record<string, ChannelStats>>({});
  const [rates, setRates] = React.useState<Record<string, Rates>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/funnel", window.location.origin);
      url.searchParams.set("days", String(days));
      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        if (r.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        throw new Error(String(j?.error || "Failed to load"));
      }
      setTotals(j.totals || { clicks: 0, landings: 0, signups: 0, conversions: 0 });
      setByChannel(j.byChannel || {});
      setRates(j.rates || {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [days]);

  const channels = Object.keys(byChannel).sort(
    (a, b) => (byChannel[b]?.clicks || 0) - (byChannel[a]?.clicks || 0),
  );

  const overallConversion =
    totals.clicks > 0
      ? ((totals.conversions / totals.clicks) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <AdminNavigation />

          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-cyan-500" />
              Bio link funnel
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Internal tracking for <code className="text-gray-300">/try</code> (Instagram) and{" "}
              <code className="text-gray-300">/start</code> (TikTok): clicks ? landing ? signup ? paid.
            </p>
          </div>

          
            <div className="bg-gray-900/50 rounded-xl p-4 mb-6 border border-white/10">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Period (days)</label>
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="bg-black border border-white/10 rounded px-3 py-2 text-white"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
                <button
                  onClick={load}
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                {loading ? <span className="text-gray-400 text-sm">Loading?</span> : null}
                {error ? <span className="text-red-400 text-sm">{error}</span> : null}
                <div className="ml-auto">
                  <AdminLogoutButton />
                </div>
              </div>
            </div>
          

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                
                  <div>
                    <p className="text-cyan-200 text-sm">Bio clicks</p>
                    <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
                  </div>
                
                <MousePointerClick className="h-8 w-8 text-cyan-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Landings</p>
                  <p className="text-2xl font-bold">{totals.landings.toLocaleString()}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Signups</p>
                  <p className="text-2xl font-bold">{totals.signups.toLocaleString()}</p>
                </div>
                <UserPlus className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm">Paid conversions</p>
                  <p className="text-2xl font-bold">{totals.conversions.toLocaleString()}</p>
                  <p className="text-green-200 text-xs">{overallConversion}% of clicks</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-200" />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-3">By channel</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {channels.map((ch) => {
                const s = byChannel[ch] || { clicks: 0, landings: 0, signups: 0, conversions: 0 };
                const r = rates[ch] || { landingRate: 0, signupRate: 0, conversionRate: 0 };
                return (
                  <div key={ch} className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
                    <h3 className="text-lg font-semibold mb-4">{CHANNEL_LABELS[ch] || ch}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Metric label="Clicks" value={s.clicks} />
                      <Metric label="Landings" value={s.landings} pct={r.landingRate} />
                      <Metric label="Signups" value={s.signups} pct={r.signupRate} />
                      <Metric label="Paid" value={s.conversions} pct={r.conversionRate} />
                    </div>
                  </div>
                );
              })}
              {!channels.length && !loading ? (
                <p className="text-gray-500 text-sm col-span-2">
                  No funnel data yet. Clicks are recorded when someone opens /try or /start.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    
  );
}

function Metric({ label, value, pct }: { label: string; value: number; pct?: number }) {
  return (
    <div className="bg-black/40 rounded-lg p-3">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-xl font-semibold">{value.toLocaleString()}</p>
      {pct != null ? <p className="text-gray-500 text-xs">{pct}% of clicks</p> : null}
    </div>
  );
}
