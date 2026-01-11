"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Check, ExternalLink, Loader2, RefreshCcw, Save } from "lucide-react";

type PartnerConfig = {
  saasName?: string;
  slug?: string;
  adminEmail?: string;
  supportEmail?: string;
  whatsappNumber?: string;
  customDomain?: string;
  domainProvider?: string;
  stripeAccountEmail?: string;
  connectedAccountId?: string;
  feeModel?: "percent_50" | "";
  notes?: string;
};

type PartnerStats = {
  signups: number;
  payments: number;
  revenue: number;
  lastUpdated?: string;
  recentSignups?: Array<{ firstName?: string; email?: string; createdAt?: string }>;
  recentPayments?: Array<{ email?: string; amount?: number; currency?: string; createdAt?: string }>;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-5">
      <div className="text-sm font-semibold text-white mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const qsSlug = searchParams?.get("slug") || "";

  const [slug, setSlug] = React.useState<string>(qsSlug);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<PartnerConfig>({});
  const [stats, setStats] = React.useState<PartnerStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [connectLoading, setConnectLoading] = React.useState(false);
  const didAutoSetFee = React.useRef(false);

  React.useEffect(() => {
    if (slug) return;
    try {
      const s = localStorage.getItem("partners_current_slug") || "";
      if (s) setSlug(s);
    } catch {}
  }, [slug]);

  const portalUrl = React.useMemo(() => {
    if (!slug) return "";
    const host = typeof window !== "undefined" ? window.location.hostname.replace(/^www\./, "") : "partners.ecomefficiency.com";
    const partnersHost = host.startsWith("partners.") ? host : `partners.${host}`;
    return `https://${partnersHost}/${slug}`;
  }, [slug]);

  const loadAll = async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`/api/partners/config?slug=${encodeURIComponent(s)}`, { cache: "no-store" }),
        fetch(`/api/partners/stats?slug=${encodeURIComponent(s)}`, { cache: "no-store" }),
      ]);

      const cfgJson = await cfgRes.json().catch(() => ({}));
      const statsJson = await statsRes.json().catch(() => ({}));

      if (cfgRes.ok && cfgJson?.ok) setConfig(cfgJson.config || {});
      if (statsRes.ok && statsJson?.ok) setStats(statsJson.stats || null);

      if ((!cfgRes.ok || !cfgJson?.ok) && (!statsRes.ok || !statsJson?.ok)) {
        setError(cfgJson?.error || statsJson?.error || "Failed to load dashboard data.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!slug) return;
    loadAll(slug);
    try {
      localStorage.setItem("partners_current_slug", slug);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Force fee model to 50% (no other options)
  React.useEffect(() => {
    if (!slug) return;
    if (didAutoSetFee.current) return;
    // Only auto-set if config has been loaded at least once
    // (we treat presence of any key as "loaded", or connectedAccountId, etc.)
    const loaded = Object.keys(config || {}).length > 0;
    if (!loaded) return;
    if (config.feeModel === "percent_50") { didAutoSetFee.current = true; return; }
    didAutoSetFee.current = true;
    setConfig((s) => ({ ...s, feeModel: "percent_50" }));
    // Best-effort persist (ignore errors, don't block UI)
    saveConfig({ feeModel: "percent_50" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, config]);

  const saveConfig = async (patch: Partial<PartnerConfig>) => {
    if (!slug) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partners/config?slug=${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to save");
      setConfig((s) => ({ ...s, ...(json.config || patch) }));
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startStripeConnect = async () => {
    if (!slug) return;
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.detail || json?.error || "Stripe connect failed");
      if (json.connectedAccountId) setConfig((s) => ({ ...s, connectedAccountId: json.connectedAccountId }));
      window.location.href = String(json.url);
    } catch (e: any) {
      setError(e?.message || "Stripe connect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={160} height={52} priority className="h-10 w-auto object-contain" />
            <div>
              <div className="text-sm font-semibold">Partners Dashboard</div>
              <div className="text-xs text-gray-400">Manage your white-label setup</div>
            </div>
          </div>
          <Link href="/configuration" className="text-sm text-gray-400 hover:text-white">
            Edit onboarding
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card title="Your slug">
            <div className="flex items-center gap-2">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="your-slug"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => slug && loadAll(slug)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                disabled={!slug || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Refresh
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">This identifies your partner workspace and stats.</div>
          </Card>

          <Card title="Default URL">
            <div className="text-sm text-gray-200 break-all">{portalUrl || "—"}</div>
            <div className="mt-2">
              {portalUrl ? (
                <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200">
                  Open site <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="text-xs text-gray-500">Set a slug to generate the link.</div>
              )}
            </div>
          </Card>

          <Card title="Status">
            <div className="text-sm text-gray-300">
              {searchParams?.get("submitted") === "1" ? (
                <span className="inline-flex items-center gap-2 text-green-300">
                  <Check className="w-4 h-4" /> Onboarding submitted
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            {error ? <div className="mt-2 text-xs text-red-300 break-words">{error}</div> : null}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Stripe payments (Connect)">
            <div className="text-sm text-gray-300">
              Connect your Stripe so your SaaS can receive payments.
              <div className="mt-2 text-xs text-gray-500">
                Fees: we take <b>50%</b> on each payment — this typically requires Stripe Connect (application fees).
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-sm text-gray-200">
                  Fee model: <span className="font-semibold text-purple-200">50% per payment</span>
                </div>
                <div className="text-xs text-gray-500">{saving ? "Saving…" : "Fixed"}</div>
              </div>
              <button
                type="button"
                onClick={startStripeConnect}
                disabled={!slug || connectLoading}
                className="w-full h-11 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {connectLoading ? "Redirecting to Stripe…" : "Connect Stripe"}
              </button>
              <div className="text-xs text-gray-500">
                Connected account: <span className="text-gray-300">{config.connectedAccountId || "not connected"}</span>
              </div>
            </div>
          </Card>

          <Card title="Domain & branding">
            <div className="text-sm text-gray-300">Connect your own domain for your SaaS website.</div>
            <div className="mt-4 space-y-3">
              <div className="text-xs text-gray-400">Custom domain</div>
              <input
                value={config.customDomain || ""}
                onChange={(e) => setConfig((s) => ({ ...s, customDomain: e.target.value }))}
                placeholder="ecomwolf.com"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
              <div className="text-xs text-gray-400">Domain provider</div>
              <input
                value={config.domainProvider || ""}
                onChange={(e) => setConfig((s) => ({ ...s, domainProvider: e.target.value }))}
                placeholder="Namecheap"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => saveConfig({ customDomain: config.customDomain || "", domainProvider: config.domainProvider || "" })}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save domain
              </button>
              <div className="text-xs text-gray-500">DNS will be provided after Stripe is connected and your workspace is provisioned.</div>
            </div>
          </Card>

          <Card title="Contact & support">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">Admin email</div>
                <input
                  value={config.adminEmail || ""}
                  onChange={(e) => setConfig((s) => ({ ...s, adminEmail: e.target.value }))}
                  placeholder="admin@yourdomain.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400">Support email</div>
                <input
                  value={config.supportEmail || ""}
                  onChange={(e) => setConfig((s) => ({ ...s, supportEmail: e.target.value }))}
                  placeholder="support@yourdomain.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-400">WhatsApp number</div>
                <input
                  value={config.whatsappNumber || ""}
                  onChange={(e) => setConfig((s) => ({ ...s, whatsappNumber: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => saveConfig({ adminEmail: config.adminEmail || "", supportEmail: config.supportEmail || "", whatsappNumber: config.whatsappNumber || "" })}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save contact
              </button>
            </div>
          </Card>

          <Card title="Site stats">
            <div className="text-xs text-gray-500 mb-3">
              You&apos;ll see signups and payments here (tracked by slug). Your users don&apos;t need DB access.
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-gray-400">Signups</div>
                <div className="text-lg font-semibold">{stats?.signups ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-gray-400">Payments</div>
                <div className="text-lg font-semibold">{stats?.payments ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-gray-400">Revenue</div>
                <div className="text-lg font-semibold">{stats?.revenue ?? 0}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Last updated: <span className="text-gray-300">{stats?.lastUpdated || "—"}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


