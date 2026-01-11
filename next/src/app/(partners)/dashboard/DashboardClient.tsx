"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, RefreshCcw, Save, Palette, LayoutTemplate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PartnerConfig = {
  saasName?: string;
  slug?: string;
  adminEmail?: string;
  supportEmail?: string;
  whatsappNumber?: string;
  customDomain?: string;
  stripeAccountEmail?: string;
  connectedAccountId?: string;
  feeModel?: "percent_50" | "";
  notes?: string;
  tagline?: string;
  logoUrl?: string;
  mainColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  currency?: string;
  monthlyPrice?: string;
  signupMode?: string;
};

type PartnerStats = {
  signups: number;
  payments: number;
  revenue: number;
  lastUpdated?: string;
  recentSignups?: Array<{ firstName?: string; email?: string; createdAt?: string }>;
  recentPayments?: Array<{ email?: string; amount?: number; currency?: string; createdAt?: string }>;
};

type StripeStatus = {
  connected: boolean;
  connectedAccountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
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
  const initialTab = (searchParams?.get("tab") || "settings") as "data" | "settings" | "page";
  const qsAcct = searchParams?.get("acct") || "";

  const [slug, setSlug] = React.useState<string>(qsSlug);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<PartnerConfig>({});
  const [stats, setStats] = React.useState<PartnerStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [connectLoading, setConnectLoading] = React.useState(false);
  const didAutoSetFee = React.useRef(false);
  const [accountEmail, setAccountEmail] = React.useState<string>("");
  const [tab, setTab] = React.useState<"data" | "settings" | "page">(initialTab);
  const [stripeStatus, setStripeStatus] = React.useState<StripeStatus>({ connected: false });
  const [domainVerify, setDomainVerify] = React.useState<{ status: "idle" | "checking" | "ok" | "fail"; message?: string }>({
    status: "idle",
  });
  const [requests, setRequests] = React.useState<Array<{ id: string; createdAt: string; email?: string; message: string }>>([]);
  const [requestDraft, setRequestDraft] = React.useState("");
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  const copyText = async (text: string) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore (some browsers block clipboard without user gesture)
    }
  };

  React.useEffect(() => {
    try {
      const t = (searchParams?.get("tab") || "") as any;
      if (t === "data" || t === "settings" || t === "page") setTab(t);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setAccountEmail(data.user?.email || "");
      } catch {}
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email || "");
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

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

  const publicPageUrl = React.useMemo(() => {
    if (!slug) return "";
    const host = typeof window !== "undefined" ? window.location.hostname.replace(/^www\./, "") : "partners.ecomefficiency.com";
    const partnersHost = host.startsWith("partners.") ? host : `partners.${host}`;
    return `https://${partnersHost}/${slug}`;
  }, [slug]);

  const loadRequests = React.useCallback(async (s: string) => {
    try {
      const res = await fetch(`/api/partners/requests?slug=${encodeURIComponent(s)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) return;
      setRequests(Array.isArray(json.requests) ? json.requests : []);
    } catch {}
  }, []);

  const fetchStripeStatus = React.useCallback(async (s: string) => {
    try {
      let account = "";
      try {
        account =
          (searchParams?.get("acct") || "") ||
          (config.connectedAccountId || "") ||
          localStorage.getItem(`partners_connected_account_id:${s}`) ||
          "";
      } catch {}

      const qs = account
        ? `account=${encodeURIComponent(account)}`
        : `slug=${encodeURIComponent(s)}`;

      const res = await fetch(`/api/partners/stripe/status?${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) return;
      setStripeStatus({
        connected: Boolean(json.connected),
        connectedAccountId: json.connectedAccountId,
        chargesEnabled: json.chargesEnabled,
        payoutsEnabled: json.payoutsEnabled,
        detailsSubmitted: json.detailsSubmitted,
        bankLast4: typeof json.bankLast4 === "string" ? json.bankLast4 : null,
      });
    } catch {}
  }, [config.connectedAccountId, searchParams]);

  // If Stripe redirected back with acct=..., store it locally and reflect in UI even if DB persistence failed
  React.useEffect(() => {
    if (!slug) return;
    const acct = String(qsAcct || "").trim();
    if (!acct) return;
    try {
      localStorage.setItem(`partners_connected_account_id:${slug}`, acct);
    } catch {}
    setConfig((s) => ({ ...s, connectedAccountId: s.connectedAccountId || acct }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, qsAcct]);

  const customers = React.useMemo(() => {
    const signups = stats?.recentSignups || [];
    const paid = new Set(
      (stats?.recentPayments || [])
        .map((p) => (p.email || "").toLowerCase().trim())
        .filter(Boolean)
    );
    return signups.map((s) => ({
      firstName: s.firstName || "",
      email: s.email || "",
      createdAt: s.createdAt,
      paid: paid.has((s.email || "").toLowerCase().trim()),
    }));
  }, [stats]);

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
      // Refresh Stripe status (best-effort)
      fetchStripeStatus(s);
      // Best-effort load requests (for Page tab)
      loadRequests(s);

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

  // On return from Stripe onboarding, refresh a couple times to catch eventual consistency
  React.useEffect(() => {
    if (!slug) return;
    const stripeFlag = searchParams?.get("stripe") || "";
    if (stripeFlag !== "return") return;
    const t1 = setTimeout(() => loadAll(slug), 800);
    const t2 = setTimeout(() => loadAll(slug), 2400);
    const t3 = setTimeout(() => fetchStripeStatus(slug), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, searchParams]);

  const submitRequest = async () => {
    if (!slug) return;
    const message = requestDraft.trim();
    if (!message) return;
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/partners/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: accountEmail || config.adminEmail || "", message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to submit request");
      setRequests(Array.isArray(json.requests) ? json.requests : requests);
      setRequestDraft("");
    } catch (e: any) {
      setRequestError(e?.message || "Failed to submit request");
    } finally {
      setRequestLoading(false);
    }
  };

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
      if (json.connectedAccountId) {
        setConfig((s) => ({ ...s, connectedAccountId: json.connectedAccountId }));
        try {
          localStorage.setItem(`partners_connected_account_id:${slug}`, String(json.connectedAccountId));
        } catch {}
      }
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
          <div className="flex items-center gap-3">
            {accountEmail ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-200">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400/80" />
                <span className="truncate max-w-[220px]">{accountEmail}</span>
              </div>
            ) : null}
            <Link href="/configuration" className="text-sm text-gray-400 hover:text-white">
              Edit onboarding
            </Link>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-3 sticky top-6">
              <div className="px-2 pt-2 pb-3">
                <div className="text-xs text-gray-400">Workspace</div>
                <div className="text-sm font-semibold text-white truncate">{slug || "—"}</div>
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setTab("data")}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                    tab === "data" ? "border-purple-400/40 bg-purple-500/15 text-white" : "border-transparent hover:border-white/10 hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium">Data</div>
                  <div className="text-xs text-gray-500">Signups & payments</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("settings")}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                    tab === "settings" ? "border-purple-400/40 bg-purple-500/15 text-white" : "border-transparent hover:border-white/10 hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium">Settings</div>
                  <div className="text-xs text-gray-500">Stripe & domain</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("page")}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                    tab === "page" ? "border-purple-400/40 bg-purple-500/15 text-white" : "border-transparent hover:border-white/10 hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium">Page</div>
                  <div className="text-xs text-gray-500">Branding & requests</div>
                </button>
              </nav>
              <div className="mt-4 border-t border-white/10 pt-3 px-2">
                <div className="text-xs text-gray-500">Default URL</div>
                <div className="text-xs text-gray-300 break-all">{portalUrl || "—"}</div>
                {portalUrl ? (
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200"
                  >
                    Open site <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="mb-5 rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="your-slug"
                    className="w-full md:w-64 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
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
                <div className="flex items-center gap-3">
                  {searchParams?.get("submitted") === "1" ? (
                    <span className="inline-flex items-center gap-2 text-green-300 text-sm">
                      <Check className="w-4 h-4" /> Onboarding submitted
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
              {error ? <div className="mt-3 text-xs text-red-300 break-words">{error}</div> : null}
            </div>

            {tab === "data" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card title="Signups">
                    <div className="text-2xl font-semibold">{stats?.signups ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Tracked by slug</div>
                  </Card>
                  <Card title="Payments">
                    <div className="text-2xl font-semibold">{stats?.payments ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Tracked by slug</div>
                  </Card>
                  <Card title="Revenue">
                    <div className="text-2xl font-semibold">{stats?.revenue ?? 0}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last updated: <span className="text-gray-300">{stats?.lastUpdated || "—"}</span>
                    </div>
                  </Card>
                </div>

                <Card title="Customers">
                  <div className="text-xs text-gray-500 mb-3">Email + first name, with paid status.</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-white/10">
                          <th className="py-2 pr-4">First name</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Paid</th>
                          <th className="py-2">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.length ? (
                          customers.map((c, i) => (
                            <tr key={`${c.email}-${i}`} className="border-b border-white/5">
                              <td className="py-2 pr-4 text-gray-200">{c.firstName || "—"}</td>
                              <td className="py-2 pr-4 text-gray-300">{c.email || "—"}</td>
                              <td className="py-2 pr-4">
                                {c.paid ? (
                                  <span className="inline-flex items-center gap-2 text-green-300">
                                    <span className="w-2 h-2 rounded-full bg-green-400/80" /> Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 text-gray-400">
                                    <span className="w-2 h-2 rounded-full bg-gray-500/60" /> Not paid
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-gray-500">
                              No customer data yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : tab === "settings" ? (
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
                      {connectLoading ? "Redirecting to Stripe…" : stripeStatus.connected ? "Edit" : "Connect Stripe"}
                    </button>
                    <div className="text-xs text-gray-500">
                      {stripeStatus.connected ? (
                        <span className="text-green-300">
                          Stripe connected
                          {stripeStatus.bankLast4 ? (
                            <>
                              {" "}
                              • <span className="text-gray-200">IBAN •••• {stripeStatus.bankLast4}</span>
                            </>
                          ) : null}
                        </span>
                      ) : (
                        <>
                          Connected account: <span className="text-gray-300">{config.connectedAccountId || "not connected"}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>

                <Card title="Custom domain">
                  <div className="text-sm text-gray-300">Connect your own domain for your SaaS website.</div>
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-gray-400">Custom domain</div>
                    <input
                      value={config.customDomain || ""}
                      onChange={(e) => {
                        setConfig((s) => ({ ...s, customDomain: e.target.value }));
                        setDomainVerify({ status: "idle" });
                      }}
                      placeholder="ecomwolf.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => saveConfig({ customDomain: config.customDomain || "" })}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-gray-300">
                      <div className="text-gray-400 mb-3">DNS records (copy/paste)</div>
                      <div className="space-y-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-400">A record</div>
                            <div className="text-[11px] text-gray-500">Type: A</div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Host</div>
                                <div className="font-mono text-sm text-gray-200 truncate">@</div>
                              </div>
                              <button type="button" onClick={() => copyText("@")} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy host">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Target</div>
                                <div className="font-mono text-sm text-gray-200 truncate">76.76.21.21</div>
                              </div>
                              <button type="button" onClick={() => copyText("76.76.21.21")} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy target">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-400">CNAME record</div>
                            <div className="text-[11px] text-gray-500">Type: CNAME</div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Host</div>
                                <div className="font-mono text-sm text-gray-200 truncate">www</div>
                              </div>
                              <button type="button" onClick={() => copyText("www")} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy host">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                            <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Target</div>
                                <div className="font-mono text-sm text-gray-200 truncate">cname.vercel-dns.com</div>
                              </div>
                              <button type="button" onClick={() => copyText("cname.vercel-dns.com")} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy target">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const d = String(config.customDomain || "").trim();
                          if (!d) return;
                          setDomainVerify({ status: "checking" });
                          const res = await fetch(`/api/partners/domain/verify?domain=${encodeURIComponent(d)}`, { cache: "no-store" });
                          const json = await res.json().catch(() => ({}));
                          if (res.ok && json?.ok && json?.verified) {
                            setDomainVerify({ status: "ok", message: "Verified ✅" });
                            return;
                          }
                          const expected = Array.isArray(json?.expected) ? json.expected : [];
                          const hint = expected
                            .map((r: any) => `${r.type} ${r.name} ${r.value}`)
                            .slice(0, 3)
                            .join(" • ");
                          setDomainVerify({ status: "fail", message: hint ? `Not verified yet. Expected: ${hint}` : "Not verified yet." });
                        } catch (e: any) {
                          setDomainVerify({ status: "fail", message: e?.message || "Verify failed" });
                        }
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      {domainVerify.status === "checking" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                        </>
                      ) : (
                        "Verify DNS"
                      )}
                    </button>
                    {domainVerify.status !== "idle" ? (
                      <div className={`text-xs ${domainVerify.status === "ok" ? "text-green-300" : domainVerify.status === "checking" ? "text-gray-400" : "text-red-300"}`}>
                        {domainVerify.message || (domainVerify.status === "checking" ? "Checking…" : "")}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <Card title="Page & branding">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-300">
                        Public page:{" "}
                        {publicPageUrl ? (
                          <a href={publicPageUrl} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 break-all">
                            {publicPageUrl}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1 inline-flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> SaaS</div>
                          <div className="text-gray-200 font-medium">{config.saasName || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">{config.tagline || "—"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1 inline-flex items-center gap-2"><Palette className="w-4 h-4" /> Colors</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {([
                              ["Main", config.mainColor],
                              ["Secondary", config.secondaryColor],
                              ["Accent", config.accentColor],
                              ["Background", config.backgroundColor],
                            ] as const).map(([label, value]) => (
                              <div key={label} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border border-white/10" style={{ background: value || "transparent" }} />
                                <div className="text-gray-300">{label}:</div>
                                <div className="font-mono text-gray-200">{value || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1">Pricing</div>
                          <div className="text-gray-200 font-medium">
                            {config.monthlyPrice ? `${config.monthlyPrice}/mo` : "—"} {config.currency ? `(${String(config.currency).toUpperCase()})` : ""}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Signup mode: {config.signupMode || "—"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1">Custom domain</div>
                          <div className="text-gray-200 font-medium break-all">{config.customDomain || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">Stripe: {stripeStatus.connected ? "connected" : "not connected"}</div>
                        </div>
                      </div>
                    </div>
                    {config.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(config.logoUrl)} alt="Logo" className="w-24 h-24 rounded-xl border border-white/10 object-contain bg-black/30" />
                    ) : null}
                  </div>
                </Card>

                <Card title="Page requests">
                  <div className="text-xs text-gray-500 mb-3">Ask us to edit your page/template. We’ll see it in your workspace.</div>
                  <textarea
                    value={requestDraft}
                    onChange={(e) => setRequestDraft(e.target.value)}
                    placeholder="Example: Change hero copy, add 3 testimonials, update CTA color…"
                    className="w-full min-h-[110px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={submitRequest}
                      disabled={requestLoading || !requestDraft.trim()}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Submit request
                    </button>
                    {requestError ? <div className="text-xs text-red-300">{requestError}</div> : null}
                  </div>

                  <div className="mt-5">
                    <div className="text-xs text-gray-400 mb-2">Latest requests</div>
                    <div className="space-y-2">
                      {requests.length ? (
                        requests.slice(0, 8).map((r) => (
                          <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                              <div className="truncate">{r.email || "—"}</div>
                              <div className="shrink-0">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                            </div>
                            <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{r.message}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No requests yet.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


