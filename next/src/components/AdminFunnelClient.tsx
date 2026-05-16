"use client";

import React from "react";
import AdminNavigation from "@/components/AdminNavigation";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import {
  BarChart3,
  RefreshCw,
  MousePointerClick,
  UserPlus,
  CreditCard,
  Globe,
  MapPin,
  Clock,
} from "lucide-react";

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

type FunnelSession = {
  id: string;
  channel: string;
  stage: string;
  email: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  ip_address: string | null;
  landing_ip: string | null;
  signup_ip: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  clicked_at: string;
  landed_at: string | null;
  signed_up_at: string | null;
  converted_at: string | null;
  click_hour_paris: number;
  client_timezone: string | null;
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram (/try)",
  tiktok: "TikTok (/start)",
};

const STAGE_STYLES: Record<string, string> = {
  click: "bg-gray-600/40 text-gray-200",
  landing: "bg-blue-600/30 text-blue-200",
  signup: "bg-purple-600/30 text-purple-200",
  paid: "bg-green-600/30 text-green-200",
};

function fmtDate(iso: string | null) {
  if (!iso) return "n/a";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function geoLabel(s: FunnelSession) {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "n/a";
}

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
  const [sessions, setSessions] = React.useState<FunnelSession[]>([]);
  const [topCountries, setTopCountries] = React.useState<{ country: string; clicks: number }[]>([]);
  const [byHour, setByHour] = React.useState<number[]>(Array(24).fill(0));
  const [filterChannel, setFilterChannel] = React.useState<string>("all");
  const [filterStage, setFilterStage] = React.useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/funnel", window.location.origin);
      url.searchParams.set("days", String(days));
      url.searchParams.set("limit", "300");
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
      setSessions(Array.isArray(j.sessions) ? j.sessions : []);
      setTopCountries(Array.isArray(j.topCountries) ? j.topCountries : []);
      setByHour(Array.isArray(j.byHour) && j.byHour.length === 24 ? j.byHour : Array(24).fill(0));
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
    totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(1) : "0.0";

  const maxHour = Math.max(1, ...byHour);

  const filteredSessions = sessions.filter((s) => {
    if (filterChannel !== "all" && s.channel !== filterChannel) return false;
    if (filterStage !== "all" && s.stage !== filterStage) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-[90rem] mx-auto">
          <AdminNavigation />

          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-cyan-500" />
              Bio link funnel
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Clicks, geo (country / city / IP), device, and timestamps (Europe/Paris) for{" "}
              <code className="text-gray-300">/try</code> and <code className="text-gray-300">/start</code>.
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
              <div>
                <label className="block text-xs text-gray-400 mb-1">Channel</label>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="bg-black border border-white/10 rounded px-3 py-2 text-white"
                >
                  <option value="all">All</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stage</label>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="bg-black border border-white/10 rounded px-3 py-2 text-white"
                  >
                    <option value="all">All</option>
                    <option value="click">Click only</option>
                    <option value="landing">Landed</option>
                    <option value="signup">Signed up</option>
                    <option value="paid">Paid</option>
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
            <StatCard
              label="Bio clicks"
              value={totals.clicks}
              icon={<MousePointerClick className="h-8 w-8 text-cyan-200" />}
              gradient="from-cyan-600 to-cyan-700"
            />
            <StatCard
              label="Landings"
              value={totals.landings}
              icon={<Globe className="h-8 w-8 text-blue-200" />}
              gradient="from-blue-600 to-blue-700"
            />
            <StatCard
              label="Signups"
              value={totals.signups}
              icon={<UserPlus className="h-8 w-8 text-purple-200" />}
              gradient="from-purple-600 to-purple-700"
            />
            <StatCard
              label="Paid conversions"
              value={totals.conversions}
              sub={`${overallConversion}% of clicks`}
              icon={<CreditCard className="h-8 w-8 text-green-200" />}
              gradient="from-green-600 to-green-700"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />
                Clicks by hour (Paris)
              </h2>
              <div className="flex items-end gap-1 h-32">
                {byHour.map((count, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    
                      <div
                        className="w-full bg-cyan-600/80 rounded-t min-h-[4px]"
                        style={{ height: `${Math.max(4, (count / maxHour) * 100)}%` }}
                        title={`${hour}h: ${count} clicks`}
                      />
                    
                    <span className="text-[9px] text-gray-500">{hour}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-400" />
                Top countries
              </h2>
              <ul className="space-y-2 text-sm">
                {topCountries.map(({ country, clicks }) => (
                  <li key={country} className="flex justify-between gap-2">
                    <span className="text-gray-300 truncate">{country}</span>
                    <span className="text-white font-medium shrink-0">{clicks}</span>
                  </li>
                ))}
                {!topCountries.length ? (
                  <li className="text-gray-500">No data yet</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
          </div>

          <div className="overflow-auto border border-white/10 rounded-xl bg-gray-900/30">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Clicked (Paris)</th>
                  <th className="p-3 text-left">Channel</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Geo</th>
                  <th className="p-3 text-left">Click IP</th>
                  <th className="p-3 text-left">TZ</th>
                  <th className="p-3 text-left">Device</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Landed</th>
                  <th className="p-3 text-left">Signup</th>
                  <th className="p-3 text-left">Paid</th>
                  <th className="p-3 text-left">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="odd:bg-gray-900/20 hover:bg-gray-800/30 border-t border-white/5">
                    <td className="p-3 whitespace-nowrap text-gray-300">
                      {fmtDate(s.clicked_at)}
                      <span className="text-gray-500 text-xs ml-1">({s.click_hour_paris}h)</span>
                    </td>
                    <td className="p-3 capitalize">{s.channel}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs capitalize ${STAGE_STYLES[s.stage] || STAGE_STYLES.click}`}
                      >
                        {s.stage}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300 max-w-[140px] truncate" title={geoLabel(s)}>
                      {geoLabel(s)}
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-400">{s.ip_address || "n/a"}</td>
                    <td className="p-3 text-xs text-gray-500">{s.client_timezone || "n/a"}</td>
                    <td className="p-3 text-gray-400 text-xs">
                      {[s.device_type, s.browser, s.os].filter(Boolean).join(" ? ") || "n/a"}
                    </td>
                    <td className="p-3 text-gray-300 max-w-[160px] truncate">{s.email || "n/a"}</td>
                    <td className="p-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(s.landed_at)}</td>
                    <td className="p-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(s.signed_up_at)}</td>
                    <td className="p-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(s.converted_at)}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[180px] truncate" title={s.referrer || ""}>
                      {s.referrer
                        ? (() => {
                            try {
                              return new URL(s.referrer!).hostname;
                            } catch {
                              return s.referrer!.slice(0, 40);
                            }
                          })()
                        : "n/a"}
                    </td>
                  </tr>
                ))}
                {!filteredSessions.length && !loading ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-gray-500">
                      No sessions match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Showing up to 300 most recent sessions. Apply migration 015 on Supabase for city / device columns.
          </p>
        </div>
      </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  gradient,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          {sub ? <p className="text-white/70 text-xs mt-1">{sub}</p> : null}
        </div>
        {icon}
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
