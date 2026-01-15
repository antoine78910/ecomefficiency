"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "@/components/AdminNavigation";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { ExternalLink, Loader2, RefreshCcw, Trash2 } from "lucide-react";

type PartnerRow = {
  slug: string;
  config: any;
  stats: { signups: number; payments: number; revenue: number; lastUpdated?: string | null };
  requests: Array<{ id: string; createdAt: string; email?: string; message: string }>;
};

function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [partners, setPartners] = React.useState<PartnerRow[]>([]);
  const [credsBySlug, setCredsBySlug] = React.useState<Record<string, { adspower_email?: string; adspower_password?: string; updatedAt?: string }>>({});
  const [credsLoadingSlug, setCredsLoadingSlug] = React.useState<string | null>(null);
  const [manualSlug, setManualSlug] = React.useState<string>("");

  // Keep credentials inputs populated across refreshes on the admin page.
  // We use sessionStorage (not localStorage) so it doesn't persist forever on the device.
  const CREDS_CACHE_KEY = "__admin_partner_adspower_creds_cache:v1";
  const credsHydratedRef = React.useRef(false);
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.sessionStorage.getItem(CREDS_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object") setCredsBySlug(parsed);
    } catch {}
    credsHydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!credsHydratedRef.current) return; // avoid clobbering cache before hydration
      window.sessionStorage.setItem(CREDS_CACHE_KEY, JSON.stringify(credsBySlug || {}));
    } catch {}
  }, [credsBySlug]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure admin session
      const v = await fetch("/api/admin/auth/verify", { cache: "no-store" });
      const vjson = await v.json().catch(() => ({}));
      if (!v.ok || !vjson?.authenticated) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/partners", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to load");
      setPartners(Array.isArray(json.partners) ? json.partners : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onDeleteRequest = async (slug: string, id: string) => {
    if (!slug || !id) return;
    const ok = window.confirm("Delete this request?");
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/partners/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Delete failed");
      setPartners((prev) =>
        prev.map((p) =>
          p.slug !== slug ? p : { ...p, requests: Array.isArray(json.requests) ? json.requests : p.requests.filter((r) => r.id !== id) }
        )
      );
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const loadCreds = async (slug: string) => {
    if (!slug) return;
    setCredsLoadingSlug(slug);
    try {
      const res = await fetch(`/api/admin/partners/credentials?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to load credentials");
      const v = (json.value || {}) as any;
      setCredsBySlug((prev) => ({
        ...prev,
        [slug]: {
          adspower_email: String(v?.adspower_email || ""),
          adspower_password: String(v?.adspower_password || ""),
          updatedAt: v?.updatedAt ? String(v.updatedAt) : undefined,
        },
      }));
    } catch (e: any) {
      alert(e?.message || "Failed to load credentials");
    } finally {
      setCredsLoadingSlug(null);
    }
  };

  // Auto-load saved credentials after a page refresh so inputs stay populated.
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!partners.length) return;
        // Fetch persisted creds from Supabase after refresh (silent).
        // We refresh when we don't have an updatedAt (or we have no local entry at all).
        const targets = partners
          .map((p) => p.slug)
          .filter((slug) => slug && !credsBySlug?.[slug]?.updatedAt);
        if (!targets.length) return;

        await Promise.all(
          targets.slice(0, 50).map(async (slug) => {
            try {
              const res = await fetch(`/api/admin/partners/credentials?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json?.ok) return;
              const v = (json.value || {}) as any;
              if (cancelled) return;
              // Only apply if server has something (or has an updatedAt).
              const nextEmail = String(v?.adspower_email || "");
              const nextPass = String(v?.adspower_password || "");
              const nextUpdatedAt = v?.updatedAt ? String(v.updatedAt) : undefined;
              if (!nextEmail && !nextPass && !nextUpdatedAt) return;
              setCredsBySlug((prev) => ({
                ...prev,
                [slug]: {
                  adspower_email: nextEmail,
                  adspower_password: nextPass,
                  updatedAt: nextUpdatedAt,
                },
              }));
            } catch {}
          })
        );
      } catch {}
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [partners, credsBySlug]);

  const saveCreds = async (slug: string) => {
    if (!slug) return;
    setCredsLoadingSlug(slug);
    try {
      const payload = {
        slug,
        adspower_email: String(credsBySlug?.[slug]?.adspower_email || ""),
        adspower_password: String(credsBySlug?.[slug]?.adspower_password || ""),
      };
      const res = await fetch(`/api/admin/partners/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Save failed");
      const v = (json.value || {}) as any;
      setCredsBySlug((prev) => ({
        ...prev,
        [slug]: {
          adspower_email: String(v?.adspower_email || ""),
          adspower_password: String(v?.adspower_password || ""),
          updatedAt: v?.updatedAt ? String(v.updatedAt) : undefined,
        },
      }));
    } catch (e: any) {
      alert(e?.message || "Save failed");
    } finally {
      setCredsLoadingSlug(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <AdminNavigation />
          <AdminLogoutButton />
        </div>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-2xl font-bold">Partners</div>
            <div className="text-sm text-gray-400">All white-labels (stats + onboarding + requests)</div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error ? <div className="mb-4 text-sm text-red-300">{error}</div> : null}
        {loading ? (
          <div className="text-sm text-gray-300 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : null}

        <div className="space-y-4">
          {/* Fallback editor when partner configs are missing (so creds can still be persisted). */}
          {!loading && !partners.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
              <div className="text-lg font-semibold mb-1">Manual AdsPower credentials (by slug)</div>
              <div className="text-sm text-gray-400 mb-4">
                Your partners list is empty on this environment, but you can still save AdsPower credentials for a partner slug here.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <label className="block md:col-span-1">
                  <div className="text-xs text-gray-400">Partner slug</div>
                  <input
                    value={manualSlug}
                    onChange={(e) => setManualSlug(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    placeholder="ex: ecomefficiency-casa"
                  />
                </label>

                <div className="md:col-span-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadCreds(manualSlug)}
                    disabled={!manualSlug.trim() || credsLoadingSlug === manualSlug}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/40 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {credsLoadingSlug === manualSlug ? "Loading…" : "Load"}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCreds(manualSlug)}
                    disabled={!manualSlug.trim() || credsLoadingSlug === manualSlug}
                    className="px-3 py-2 rounded-lg border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {credsLoadingSlug === manualSlug ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {!!manualSlug.trim() ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-gray-400">Email</div>
                    <input
                      value={String(credsBySlug?.[manualSlug]?.adspower_email || "")}
                      onChange={(e) =>
                        setCredsBySlug((prev) => ({ ...prev, [manualSlug]: { ...(prev[manualSlug] || {}), adspower_email: e.target.value } }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                      placeholder="email@adspower.com"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-gray-400">Password</div>
                    <input
                      value={String(credsBySlug?.[manualSlug]?.adspower_password || "")}
                      onChange={(e) =>
                        setCredsBySlug((prev) => ({ ...prev, [manualSlug]: { ...(prev[manualSlug] || {}), adspower_password: e.target.value } }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                      placeholder="••••••••"
                    />
                  </label>
                </div>
              ) : null}

              {!!manualSlug.trim() && credsBySlug?.[manualSlug]?.updatedAt ? (
                <div className="mt-2 text-[11px] text-gray-500">
                  Last updated: {new Date(String(credsBySlug[manualSlug].updatedAt)).toLocaleString()}
                </div>
              ) : null}
            </div>
          ) : null}

          {partners.map((p) => {
            const cfg = p.config || {};
            const onboarding = cfg.onboarding || {};
            const channels =
              Array.isArray(onboarding.audienceMainChannelLabels) && onboarding.audienceMainChannelLabels.length
                ? onboarding.audienceMainChannelLabels
                : Array.isArray(onboarding.audienceMainChannels) && onboarding.audienceMainChannels.length
                ? onboarding.audienceMainChannels
                : onboarding.audienceMainChannelLabel
                ? [onboarding.audienceMainChannelLabel]
                : onboarding.audienceMainChannel
                ? [onboarding.audienceMainChannel]
                : [];

            return (
              <div key={p.slug} className="rounded-2xl border border-white/10 bg-black/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{cfg.saasName || p.slug}</div>
                    <div className="text-xs text-gray-400 break-all">slug: {p.slug}</div>
                    <div className="text-xs text-gray-400 break-all">admin: {cfg.adminEmail || "—"}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://partners.ecomefficiency.com/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" /> Public
                    </a>
                    <a
                      href={`https://partners.ecomefficiency.com/dashboard?slug=${encodeURIComponent(p.slug)}&tab=page`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" /> Dashboard
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-gray-400">Signups</div>
                    <div className="text-xl font-semibold">{p.stats?.signups ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-gray-400">Payments</div>
                    <div className="text-xl font-semibold">{p.stats?.payments ?? 0}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-gray-400">Revenue</div>
                    <div className="text-xl font-semibold">{fmtMoney(p.stats?.revenue ?? 0)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-gray-400 mb-2">Onboarding</div>
                    <div className="text-sm text-gray-200 space-y-1">
                      <div>
                        <span className="text-gray-400">Type:</span> {onboarding.creatorTypeLabel || onboarding.creatorType || "—"}
                      </div>
                      <div>
                        <span className="text-gray-400">Audience:</span> {onboarding.audienceLevel || "—"}
                      </div>
                      <div>
                        <span className="text-gray-400">Channels:</span> {channels.length ? channels.join(", ") : "—"}
                      </div>
                      <div>
                        <span className="text-gray-400">Launch onboard:</span>{" "}
                        {onboarding.launchOnboardCount !== undefined && onboarding.launchOnboardCount !== null ? String(onboarding.launchOnboardCount) : "—"}
                      </div>
                      <div>
                        <span className="text-gray-400">Offer:</span> {onboarding.offerType || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-gray-400 mb-2">Requests</div>
                    <div className="space-y-2">
                      {p.requests?.length ? (
                        p.requests.slice(0, 10).map((r) => (
                          <div key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                              <div className="truncate">{r.email || "—"}</div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="shrink-0">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRequest(p.slug, r.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                                  title="Delete request"
                                  aria-label="Delete request"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{r.message}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500">No requests.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Credentials</div>
                      <div className="text-sm text-gray-200 font-semibold">AdsPower (single)</div>
                      <div className="text-[11px] text-gray-500">Ces creds seront affichés dans “AdsPower Credentials” pour ce partner.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadCreds(p.slug)}
                        disabled={credsLoadingSlug === p.slug}
                        className="px-3 py-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/40 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {credsLoadingSlug === p.slug ? "Loading…" : "Load"}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCreds(p.slug)}
                        disabled={credsLoadingSlug === p.slug}
                        className="px-3 py-2 rounded-lg border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {credsLoadingSlug === p.slug ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-xs text-gray-400">Email</div>
                      <input
                        value={String(credsBySlug?.[p.slug]?.adspower_email || "")}
                        onChange={(e) =>
                          setCredsBySlug((prev) => ({ ...prev, [p.slug]: { ...(prev[p.slug] || {}), adspower_email: e.target.value } }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                        placeholder="email@adspower.com"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-gray-400">Password</div>
                      <input
                        value={String(credsBySlug?.[p.slug]?.adspower_password || "")}
                        onChange={(e) =>
                          setCredsBySlug((prev) => ({ ...prev, [p.slug]: { ...(prev[p.slug] || {}), adspower_password: e.target.value } }))
                        }
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                        placeholder="••••••••"
                      />
                    </label>
                  </div>

                  {credsBySlug?.[p.slug]?.updatedAt ? (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Last updated: {new Date(String(credsBySlug[p.slug].updatedAt)).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {!loading && !partners.length ? <div className="text-sm text-gray-500">No partners found.</div> : null}
        </div>
      </div>
    </div>
  );
}

