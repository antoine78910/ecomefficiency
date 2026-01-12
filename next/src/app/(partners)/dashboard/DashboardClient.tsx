"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, RefreshCcw, Save, Palette, LayoutTemplate, Trash2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TemplatePreview from "./TemplatePreview";

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
  faviconUrl?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  currency?: string;
  monthlyPrice?: string | number;
  yearlyPrice?: string | number;
  annualDiscountPercent?: number;
  allowPromotionCodes?: boolean;
  defaultDiscountId?: string;
  signupMode?: string;
  faq?: { q: string; a: string }[];
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
  const initialTab = (searchParams?.get("tab") || "settings") as "data" | "settings" | "page" | "promos";
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
  const [tab, setTab] = React.useState<"data" | "settings" | "page" | "promos">(initialTab);
  const [stripeStatus, setStripeStatus] = React.useState<StripeStatus>({ connected: false });
  const [domainVerify, setDomainVerify] = React.useState<{ status: "idle" | "checking" | "ok" | "fail"; message?: string }>({
    status: "idle",
  });
  const [vercelAttach, setVercelAttach] = React.useState<{ status: "idle" | "working" | "ok" | "fail"; message?: string }>({ status: "idle" });
  const [requests, setRequests] = React.useState<Array<{ id: string; createdAt: string; email?: string; message: string }>>([]);
  const [requestDraft, setRequestDraft] = React.useState("");
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [copiedPulse, setCopiedPulse] = React.useState(false);
  const copiedTimer = React.useRef<number | null>(null);
  const [pageDraft, setPageDraft] = React.useState<{
    saasName: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    monthlyPrice: string;
    yearlyPrice: string;
    annualDiscountPercent: string;
    currency: string;
    main: string;
    secondary: string;
    accent: string;
    background: string;
    faq: { q: string; a: string }[];
  }>({
    saasName: "",
    tagline: "",
    logoUrl: "",
    faviconUrl: "",
    monthlyPrice: "",
    yearlyPrice: "",
    annualDiscountPercent: "",
    currency: "EUR",
    main: "",
    secondary: "",
    accent: "",
    background: "",
    faq: [],
  });

  const [promos, setPromos] = React.useState<
    Array<{
      id: string;
      createdAt: string;
      code: string;
      type: "percent_once" | "percent_forever";
      percentOff: number;
      maxUses?: number;
      timesRedeemed?: number;
      active: boolean;
      couponId: string;
      promotionCodeId: string;
    }>
  >([]);
  const [promosLoading, setPromosLoading] = React.useState(false);
  const [promosError, setPromosError] = React.useState<string | null>(null);
  const [promoDraft, setPromoDraft] = React.useState<{ code: string; type: "percent_once" | "percent_forever"; percentOff: string; maxUses: string }>({
    code: "",
    type: "percent_once",
    percentOff: "50",
    maxUses: "100",
  });

  const [editPromoId, setEditPromoId] = React.useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = React.useState<string>("");

  const copyText = async (text: string) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      setCopiedPulse(true);
      copiedTimer.current = window.setTimeout(() => setCopiedPulse(false), 900);
    } catch {}
  };

  const toColorInputValue = (value: string) => {
    const v = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) {
      const r = v[1], g = v[2], b = v[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return "#000000";
  };

  const uploadAsset = async (kind: "logo" | "favicon", file: File) => {
    if (!slug) throw new Error("missing_slug");
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("slug", slug);
    const res = await fetch("/api/partners/upload", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "upload_failed");
    return String(json.publicUrl || "");
  };

  React.useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  React.useEffect(() => {
    try {
      const t = (searchParams?.get("tab") || "") as any;
      if (t === "data" || t === "settings" || t === "page" || t === "promos") setTab(t);
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

  const customDomainUrl = React.useMemo(() => {
    const d = String((config as any)?.customDomain || "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .replace(/\.$/, "")
      .replace(/^www\./, "");
    if (!d) return "";
    return `https://${d}`;
  }, [(config as any)?.customDomain]);

  const publishPatch = React.useMemo(() => {
    return {
      saasName: pageDraft.saasName.trim(),
      tagline: pageDraft.tagline.trim(),
      logoUrl: pageDraft.logoUrl.trim(),
      faviconUrl: pageDraft.faviconUrl.trim(),
      colors: {
        main: pageDraft.main.trim(),
        secondary: pageDraft.secondary.trim(),
        accent: pageDraft.accent.trim(),
        background: pageDraft.background.trim(),
      },
      monthlyPrice: pageDraft.monthlyPrice.trim(),
      yearlyPrice: pageDraft.yearlyPrice.trim(),
      annualDiscountPercent: pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : undefined,
      currency: pageDraft.currency,
      faq: Array.isArray(pageDraft.faq)
        ? pageDraft.faq
            .map((x) => ({ q: String(x?.q || "").trim(), a: String(x?.a || "").trim() }))
            .filter((x) => x.q || x.a)
        : [],
    } as Partial<PartnerConfig>;
  }, [
    pageDraft.saasName,
    pageDraft.tagline,
    pageDraft.logoUrl,
    pageDraft.faviconUrl,
    pageDraft.main,
    pageDraft.secondary,
    pageDraft.accent,
    pageDraft.background,
    pageDraft.monthlyPrice,
    pageDraft.yearlyPrice,
    pageDraft.annualDiscountPercent,
    pageDraft.currency,
    pageDraft.faq,
  ]);

  const pageNeedsPublish = React.useMemo(() => {
    const c: any = config || {};
    const colors = (c as any)?.colors || {};
    const normFaq = (arr: any) =>
      (Array.isArray(arr) ? arr : []).map((x: any) => ({ q: String(x?.q || "").trim(), a: String(x?.a || "").trim() })).filter((x: any) => x.q || x.a);
    const faqSame = JSON.stringify(normFaq(c?.faq)) === JSON.stringify(normFaq((publishPatch as any)?.faq));
    const same =
      String(c?.saasName || "").trim() === publishPatch.saasName &&
      String(c?.tagline || "").trim() === publishPatch.tagline &&
      String(c?.logoUrl || "").trim() === publishPatch.logoUrl &&
      String((c as any)?.faviconUrl || "").trim() === publishPatch.faviconUrl &&
      String(colors?.main || "").trim() === (publishPatch as any)?.colors?.main &&
      String(colors?.secondary || "").trim() === (publishPatch as any)?.colors?.secondary &&
      String(colors?.accent || "").trim() === (publishPatch as any)?.colors?.accent &&
      String(colors?.background || "").trim() === (publishPatch as any)?.colors?.background &&
      String(c?.monthlyPrice ?? "").trim() === String(publishPatch.monthlyPrice || "").trim() &&
      String(c?.yearlyPrice ?? "").trim() === String(publishPatch.yearlyPrice || "").trim() &&
      String(c?.currency || "").trim() === String(publishPatch.currency || "").trim() &&
      (c?.annualDiscountPercent === undefined || c?.annualDiscountPercent === null
        ? (publishPatch as any)?.annualDiscountPercent === undefined
        : Number(c.annualDiscountPercent) === Number((publishPatch as any)?.annualDiscountPercent)) &&
      faqSame;
    return !same;
  }, [config, publishPatch]);

  const loadRequests = React.useCallback(async (s: string) => {
    try {
      const res = await fetch(`/api/partners/requests?slug=${encodeURIComponent(s)}`, {
        cache: "no-store",
        headers: accountEmail ? { "x-user-email": accountEmail } : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) return;
      setRequests(Array.isArray(json.requests) ? json.requests : []);
    } catch {}
  }, [accountEmail]);

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
      // Best-effort load promos (for Promo codes tab)
      loadPromos(s);

      if ((!cfgRes.ok || !cfgJson?.ok) && (!statsRes.ok || !statsJson?.ok)) {
        setError(cfgJson?.error || statsJson?.error || "Failed to load dashboard data.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const loadPromos = async (s: string) => {
    if (!s) return;
    setPromosLoading(true);
    setPromosError(null);
    try {
      const res = await fetch(`/api/partners/promo-codes?slug=${encodeURIComponent(s)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to load promo codes");
      setPromos(Array.isArray(json.promos) ? json.promos : []);
    } catch (e: any) {
      setPromosError(e?.message || "Failed to load promo codes");
    } finally {
      setPromosLoading(false);
    }
  };

  const createPromo = async () => {
    if (!slug) return;
    setPromosLoading(true);
    setPromosError(null);
    try {
      const body = {
        slug,
        code: promoDraft.code.trim(),
        type: promoDraft.type,
        percentOff: promoDraft.percentOff ? Number(promoDraft.percentOff) : 0,
        maxUses: promoDraft.maxUses ? Number(promoDraft.maxUses) : undefined,
      };
      const res = await fetch("/api/partners/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Create failed");
      setPromos(Array.isArray(json.promos) ? json.promos : promos);
      setPromoDraft((d) => ({ ...d, code: "" }));
    } catch (e: any) {
      setPromosError(e?.message || "Create failed");
    } finally {
      setPromosLoading(false);
    }
  };

  const addDomainOnVercel = async () => {
    try {
      const d = String(config.customDomain || "").trim();
      if (!slug) return;
      if (!d) {
        setVercelAttach({ status: "fail", message: "Please enter a domain first." });
        return;
      }
      setVercelAttach({ status: "working", message: "Adding domain in Vercel…" });
      const res = await fetch("/api/partners/domain/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify({ slug, domain: d }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to add domain on Vercel");

      const rec = Array.isArray(json?.vercel?.record) ? json.vercel.record : [];
      const verified = Boolean(json?.vercel?.verified);
      const hint = rec.length
        ? ` Verification required: ${rec
            .slice(0, 2)
            .map((r: any) => `${r.type} ${r.domain} ${r.value}`)
            .join(" • ")}`
        : "";
      setVercelAttach({ status: "ok", message: verified ? "Domain added on Vercel ✅" : `Domain added on Vercel ✅.${hint}` });
    } catch (e: any) {
      setVercelAttach({ status: "fail", message: e?.message || "Failed to add domain on Vercel" });
    }
  };

  const setPromoActive = async (promotionCodeId: string, active: boolean, maxUses?: number) => {
    if (!slug) return;
    setPromosLoading(true);
    setPromosError(null);
    try {
      const res = await fetch("/api/partners/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify({ slug, promotionCodeId, active, ...(maxUses ? { maxUses } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Update failed");
      setPromos(Array.isArray(json.promos) ? json.promos : promos);
    } catch (e: any) {
      setPromosError(e?.message || "Update failed");
    } finally {
      setPromosLoading(false);
    }
  };

  // Keep page editor draft in sync with loaded config
  React.useEffect(() => {
    const c = config || {};
    const colors = (c as any).colors || {};
    setPageDraft((d) => ({
      ...d,
      saasName: String(c.saasName || d.saasName || ""),
      tagline: String(c.tagline || d.tagline || ""),
      logoUrl: String((c as any).logoUrl || d.logoUrl || ""),
      faviconUrl: String((c as any).faviconUrl || d.faviconUrl || ""),
      monthlyPrice: c.monthlyPrice !== undefined && c.monthlyPrice !== null ? String(c.monthlyPrice) : d.monthlyPrice,
      yearlyPrice: c.yearlyPrice !== undefined && c.yearlyPrice !== null ? String(c.yearlyPrice) : d.yearlyPrice,
      annualDiscountPercent:
        c.annualDiscountPercent !== undefined && c.annualDiscountPercent !== null ? String(c.annualDiscountPercent) : d.annualDiscountPercent,
      currency: String(c.currency || d.currency || "EUR"),
      main: String(colors.main || d.main || ""),
      secondary: String(colors.secondary || d.secondary || ""),
      accent: String(colors.accent || d.accent || ""),
      background: String(colors.background || d.background || ""),
      faq: Array.isArray((c as any)?.faq) ? ((c as any).faq as any[]).map((x) => ({ q: String(x?.q || ""), a: String(x?.a || "") })) : d.faq,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.saasName,
    (config as any)?.tagline,
    (config as any)?.logoUrl,
    (config as any)?.faviconUrl,
    (config as any)?.monthlyPrice,
    (config as any)?.yearlyPrice,
    (config as any)?.annualDiscountPercent,
    (config as any)?.currency,
    (config as any)?.colors,
    (config as any)?.faq,
  ]);

  // ... rest of file ...

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
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
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

  const deleteRequest = async (id: string) => {
    if (!slug || !id) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this request?");
      if (!ok) return;
    }
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/partners/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify({ slug, id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to delete request");
      setRequests(Array.isArray(json.requests) ? json.requests : requests.filter((r) => r.id !== id));
    } catch (e: any) {
      setRequestError(e?.message || "Failed to delete request");
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
      {copiedPulse ? (
        <div className="fixed top-4 right-4 z-50 rounded-full border border-white/10 bg-white/10 px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur">
          <Check className="h-4 w-4 text-green-300" />
        </div>
      ) : null}
      <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10 py-8">
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

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
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
                <button
                  type="button"
                  onClick={() => setTab("promos")}
                  className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                    tab === "promos" ? "border-purple-400/40 bg-purple-500/15 text-white" : "border-transparent hover:border-white/10 hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium">Promo codes</div>
                  <div className="text-xs text-gray-500">Discounts & share links</div>
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
            {error ? (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200 break-words">
                {error}
              </div>
            ) : null}

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
                    <div className="text-xs text-gray-400">Domain to connect</div>
                    <input
                      value={config.customDomain || ""}
                      onChange={(e) => {
                        setConfig((s) => ({ ...s, customDomain: e.target.value }));
                        setDomainVerify({ status: "idle" });
                        setVercelAttach({ status: "idle" });
                      }}
                      placeholder="ecomwolf.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    />
                    {customDomainUrl ? (
                      <div className="text-xs text-gray-500">
                        Once verified, your template is served automatically on{" "}
                        <a href={customDomainUrl} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 break-all">
                          {customDomainUrl}
                        </a>
                      </div>
                    ) : null}
                    <div className="text-[11px] text-gray-500">
                      Important: DNS can be “Verified” but the domain can still show another site if it’s attached to another Vercel project (domain ownership).
                      If `saave.io` still shows the old website, remove the domain from the other project and add it to this project in Vercel (it may ask for a TXT `_vercel` token).
                    </div>
                    <button
                      type="button"
                      onClick={addDomainOnVercel}
                      disabled={!slug || vercelAttach.status === "working"}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Automatically attach this domain to our Vercel project (may require a TXT _vercel record)."
                    >
                      {vercelAttach.status === "working" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Add domain on Vercel
                    </button>
                    {vercelAttach.status !== "idle" ? (
                      <div className={`text-xs ${vercelAttach.status === "ok" ? "text-green-300" : vercelAttach.status === "working" ? "text-gray-400" : "text-red-300"}`}>
                        {vercelAttach.message || ""}
                      </div>
                    ) : null}
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
                          if (!d) {
                            setDomainVerify({ status: "fail", message: "Please enter a domain first." });
                            return;
                          }
                          setDomainVerify({ status: "checking" });
                          const res = await fetch(`/api/partners/domain/verify?domain=${encodeURIComponent(d)}`, { cache: "no-store" });
                          const json = await res.json().catch(() => ({}));
                          if (res.ok && json?.ok && json?.verified) {
                            setDomainVerify({ status: "ok", message: `Verified ✅${customDomainUrl ? ` Live: ${customDomainUrl}` : ""}` });
                            // Auto-save mapping (no separate Save button)
                            await saveConfig({ customDomain: d });
                            return;
                          }
                          const expected = Array.isArray(json?.expected) ? json.expected : [];
                          const hint = expected
                            .map((r: any) => `${r.type} ${r.name} ${r.value}`)
                            .slice(0, 3)
                            .join(" • ");
                          const a = Array.isArray(json?.checks?.a) ? json.checks.a.join(", ") : "";
                          const cname = Array.isArray(json?.checks?.cname) ? json.checks.cname.join(", ") : "";
                          const wwwCname = Array.isArray(json?.checks?.www_cname) ? json.checks.www_cname.join(", ") : "";
                          const ns = Array.isArray(json?.nameservers) ? json.nameservers.slice(0, 3).join(", ") : "";
                          const src = json?.source ? String(json.source) : "";
                          const apiHint = json?.hint ? String(json.hint) : "";
                          const seenParts = [
                            a ? `A=${a}` : "",
                            cname ? `CNAME(root)=${cname}` : "",
                            wwwCname ? `CNAME(www)=${wwwCname}` : "",
                            ns ? `NS=${ns}` : "",
                            src ? `source=${src}` : "",
                          ].filter(Boolean);
                          const seen = seenParts.length ? ` Seen: ${seenParts.join(" • ")}` : "";
                          const baseMsg = hint ? `Not verified yet. Expected: ${hint}.${seen}` : `Not verified yet.${seen}`;
                          const msg = apiHint ? `${baseMsg}\n${apiHint}` : baseMsg;
                          setDomainVerify({ status: "fail", message: msg });
                        } catch (e: any) {
                          setDomainVerify({ status: "fail", message: e?.message || "Verify failed" });
                        }
                      }}
                      disabled={saving || domainVerify.status === "checking"}
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
                    {domainVerify.status === "ok" && customDomainUrl ? (
                      <a
                        href={customDomainUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> Open domain
                      </a>
                    ) : null}
                    {domainVerify.status !== "idle" ? (
                      <div className={`text-xs ${domainVerify.status === "ok" ? "text-green-300" : domainVerify.status === "checking" ? "text-gray-400" : "text-red-300"}`}>
                        {domainVerify.message || (domainVerify.status === "checking" ? "Checking…" : "")}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : tab === "promos" ? (
              <div className="space-y-4">
                <Card title="Promo codes">
                  <div className="text-sm text-gray-300">
                    Create Stripe promo codes for your customers. You can share the code or a link that auto-applies it.
                  </div>
                  {!stripeStatus.connected ? (
                    <div className="mt-3 text-xs text-red-300">
                      Connect Stripe first to create promo codes.
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 items-start">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-gray-400 mb-2">Process</div>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <div className="text-xs text-gray-400">Code</div>
                          <input
                            value={promoDraft.code}
                            onChange={(e) => setPromoDraft((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                            placeholder="CODE_18"
                            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25 font-mono"
                          />
                          <div className="mt-1 text-[11px] text-gray-500">You can share the code or the link.</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400">Type</div>
                          <select
                            value={promoDraft.type}
                            onChange={(e) => setPromoDraft((s) => ({ ...s, type: e.target.value as any }))}
                            className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                          >
                            <option value="percent_once">Percentage off (one payment)</option>
                            <option value="percent_forever">Percentage off (forever)</option>
                          </select>
                          <div className="mt-1 text-[11px] text-gray-500">
                            Percentage discounts for one payment are not compatible with lifetime split payments.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-400">Percentage off</div>
                            <input
                              value={promoDraft.percentOff}
                              onChange={(e) => setPromoDraft((s) => ({ ...s, percentOff: e.target.value }))}
                              placeholder="50"
                              inputMode="numeric"
                              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Max uses</div>
                            <input
                              value={promoDraft.maxUses}
                              onChange={(e) => setPromoDraft((s) => ({ ...s, maxUses: e.target.value }))}
                              placeholder="100"
                              inputMode="numeric"
                              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={createPromo}
                          disabled={!slug || promosLoading || !stripeStatus.connected}
                          className="mt-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {promosLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Create
                        </button>
                        {promosError ? <div className="text-xs text-red-300 break-words">{promosError}</div> : null}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-400">Status</div>
                        <button
                          type="button"
                          onClick={() => slug && loadPromos(slug)}
                          disabled={!slug || promosLoading}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {promosLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                          Refresh
                        </button>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-12 gap-0 bg-white/5 text-[11px] text-gray-400 px-3 py-2">
                          <div className="col-span-4">Code</div>
                          <div className="col-span-2">Type</div>
                          <div className="col-span-2">Percent</div>
                          <div className="col-span-2">Max uses</div>
                          <div className="col-span-2 text-right">Status</div>
                        </div>
                        <div className="divide-y divide-white/10">
                          {promos.length ? (
                            promos.map((p) => {
                              const origin =
                                typeof window !== "undefined"
                                  ? `${window.location.protocol}//${window.location.hostname}`
                                  : "https://partners.ecomefficiency.com";
                              const link = `${origin}/api/partners/stripe/checkout?slug=${encodeURIComponent(slug)}&interval=month&code=${encodeURIComponent(
                                p.code
                              )}`;
                              const times = Number.isFinite(Number((p as any).timesRedeemed)) ? Number((p as any).timesRedeemed) : 0;
                              const max = Number.isFinite(Number(p.maxUses)) && Number(p.maxUses) > 0 ? Number(p.maxUses) : 0;
                              const pct = max > 0 ? Math.min(100, Math.round((times / max) * 100)) : 0;
                              return (
                                <div key={p.id} className="grid grid-cols-12 gap-0 px-3 py-3 text-sm items-center">
                                  <div className="col-span-4 min-w-0">
                                    <div className="font-mono text-gray-200 truncate">{p.code}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                      <button type="button" onClick={() => copyText(p.code)} className="inline-flex items-center gap-1 hover:text-gray-300">
                                        <Copy className="w-3.5 h-3.5" /> Copy code
                                      </button>
                                      <button type="button" onClick={() => copyText(link)} className="inline-flex items-center gap-1 hover:text-gray-300">
                                        <Link2 className="w-3.5 h-3.5" /> Copy link
                                      </button>
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-gray-300 text-xs">{p.type === "percent_forever" ? "Forever" : "One payment"}</div>
                                  <div className="col-span-2 text-gray-300 text-xs">{p.percentOff}%</div>
                                  <div className="col-span-2 text-gray-300 text-xs">
                                    {editPromoId === p.promotionCodeId ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          value={editMaxUses}
                                          onChange={(e) => setEditMaxUses(e.target.value)}
                                          inputMode="numeric"
                                          className="w-20 rounded-lg border border-white/15 bg-black/60 text-white px-2 py-1 text-xs focus:outline-none focus:border-white/25"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const n = Number(editMaxUses);
                                            if (!Number.isFinite(n) || n <= 0) return;
                                            setPromoActive(p.promotionCodeId, p.active, Math.floor(n));
                                            setEditPromoId(null);
                                          }}
                                          className="text-[11px] text-purple-300 hover:text-purple-200"
                                          disabled={promosLoading}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditPromoId(null)}
                                          className="text-[11px] text-gray-400 hover:text-gray-200"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="text-gray-200 hover:text-white underline decoration-white/10 hover:decoration-white/20"
                                        onClick={() => {
                                          setEditPromoId(p.promotionCodeId);
                                          setEditMaxUses(String(p.maxUses || ""));
                                        }}
                                        title="Click to edit max uses"
                                      >
                                        {p.maxUses || "—"}
                                      </button>
                                    )}
                                  </div>
                                  <div className="col-span-2 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      <div className={`text-xs ${p.active ? "text-green-300" : "text-gray-500"}`}>{p.active ? "active" : "disabled"}</div>
                                      {max > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditPromoId(p.promotionCodeId);
                                            setEditMaxUses(String(p.maxUses || ""));
                                          }}
                                          className="text-[11px] text-gray-400 hover:text-gray-200"
                                          title="Edit max uses"
                                        >
                                          Usage: {times}/{max} ({pct}%)
                                        </button>
                                      ) : (
                                        <div className="text-[11px] text-gray-500">Usage: {times}</div>
                                      )}
                                      {max > 0 ? (
                                        <div className="w-24 h-1.5 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                                          <div className="h-full" style={{ width: `${pct}%`, background: p.active ? "#34d399" : "#6b7280" }} />
                                        </div>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPromoActive(p.promotionCodeId, !p.active)}
                                      disabled={promosLoading}
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 disabled:opacity-60"
                                    >
                                      {p.active ? "Disable" : "Enable"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-6 text-center text-xs text-gray-500">No promo codes yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-300 font-medium">Allow promo codes at checkout</div>
                        <div className="text-[11px] text-gray-500 truncate">Customers can enter a Stripe promotion code.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => saveConfig({ allowPromotionCodes: !config.allowPromotionCodes })}
                        className={`h-7 w-12 rounded-full border transition ${
                          config.allowPromotionCodes ? "bg-green-500/20 border-green-400/40" : "bg-white/5 border-white/10"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full bg-white/80 translate-y-[1px] transition ${
                            config.allowPromotionCodes ? "translate-x-[22px]" : "translate-x-[2px]"
                          }`}
                        />
                      </button>
                    </div>
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
                      {customDomainUrl ? (
                        <div className="mt-1 text-sm text-gray-300">
                          Custom domain:{" "}
                          <a href={customDomainUrl} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 break-all">
                            {customDomainUrl}
                          </a>
                        </div>
                      ) : null}
                      {pageNeedsPublish ? (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveConfig(publishPatch)}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Publish your draft to the live site (slug + custom domain)"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Publish changes
                          </button>
                          <div className="text-xs text-gray-500">Applies instantly to {customDomainUrl ? "custom domain + " : ""}public page.</div>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-gray-500">All changes are published.</div>
                      )}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1 inline-flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> SaaS</div>
                          <div className="space-y-2">
                            <input
                              value={pageDraft.saasName}
                              onChange={(e) => setPageDraft((s) => ({ ...s, saasName: e.target.value }))}
                              placeholder="SaaS name"
                              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                            <input
                              value={pageDraft.tagline}
                              onChange={(e) => setPageDraft((s) => ({ ...s, tagline: e.target.value }))}
                              placeholder="Tagline"
                              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                            <button
                              type="button"
                              onClick={() => saveConfig({ saasName: pageDraft.saasName.trim(), tagline: pageDraft.tagline.trim() })}
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1">Logo & favicon</div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              {pageDraft.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pageDraft.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl border border-white/10 object-contain bg-black/30" />
                              ) : (
                                <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/20" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-gray-500 mb-1">Logo URL</div>
                                <input
                                  value={pageDraft.logoUrl}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, logoUrl: e.target.value }))}
                                  placeholder="https://..."
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                              </div>
                              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    try {
                                      setSaving(true);
                                      const url = await uploadAsset("logo", f);
                                      setPageDraft((s) => ({ ...s, logoUrl: url }));
                                      await saveConfig({ logoUrl: url });
                                    } catch (err: any) {
                                      setError(err?.message || "Upload failed");
                                    } finally {
                                      setSaving(false);
                                      e.currentTarget.value = "";
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            <div className="flex items-center gap-3">
                              {pageDraft.faviconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pageDraft.faviconUrl} alt="Favicon" className="w-8 h-8 rounded-lg border border-white/10 object-contain bg-black/30" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg border border-white/10 bg-black/20" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-gray-500 mb-1">Favicon URL</div>
                                <input
                                  value={pageDraft.faviconUrl}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, faviconUrl: e.target.value }))}
                                  placeholder="https://... (png/svg/ico)"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                              </div>
                              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  accept="image/png,image/svg+xml,image/x-icon,.ico"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    try {
                                      setSaving(true);
                                      const url = await uploadAsset("favicon", f);
                                      setPageDraft((s) => ({ ...s, faviconUrl: url }));
                                      await saveConfig({ faviconUrl: url });
                                    } catch (err: any) {
                                      setError(err?.message || "Upload failed");
                                    } finally {
                                      setSaving(false);
                                      e.currentTarget.value = "";
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() => saveConfig({ logoUrl: pageDraft.logoUrl.trim(), faviconUrl: pageDraft.faviconUrl.trim() })}
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1 inline-flex items-center gap-2"><Palette className="w-4 h-4" /> Colors</div>
                          <div className="space-y-2">
                            {([
                              ["Main", "main"],
                              ["Secondary", "secondary"],
                              ["Accent", "accent"],
                              ["Background", "background"],
                            ] as const).map(([label, key]) => (
                              <div key={key} className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={toColorInputValue((pageDraft as any)[key])}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, [key]: e.target.value } as any))}
                                  className="w-8 h-8 p-0 rounded border border-white/10 bg-transparent overflow-hidden"
                                  aria-label={`${label} color picker`}
                                  title={`${label} color picker`}
                                />
                                <div className="w-20 text-xs text-gray-400">{label}</div>
                                <input
                                  value={(pageDraft as any)[key]}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, [key]: e.target.value } as any))}
                                  placeholder="#111111"
                                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25 font-mono"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                saveConfig({
                                  colors: {
                                    main: pageDraft.main.trim(),
                                    secondary: pageDraft.secondary.trim(),
                                    accent: pageDraft.accent.trim(),
                                    background: pageDraft.background.trim(),
                                  },
                                })
                              }
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-gray-400 mb-1">Pricing</div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={pageDraft.monthlyPrice}
                                onChange={(e) => setPageDraft((s) => ({ ...s, monthlyPrice: e.target.value }))}
                                placeholder="29.99"
                                inputMode="decimal"
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              />
                              <input
                                value={pageDraft.yearlyPrice}
                                onChange={(e) => setPageDraft((s) => ({ ...s, yearlyPrice: e.target.value }))}
                                placeholder="Yearly (optional)"
                                inputMode="decimal"
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              />
                              <select
                                value={pageDraft.currency}
                                onChange={(e) => setPageDraft((s) => ({ ...s, currency: e.target.value }))}
                                className="w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                              </select>
                              <input
                                value={pageDraft.annualDiscountPercent}
                                onChange={(e) => setPageDraft((s) => ({ ...s, annualDiscountPercent: e.target.value }))}
                                placeholder="Annual discount % (optional)"
                                inputMode="numeric"
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                saveConfig({
                                  monthlyPrice: pageDraft.monthlyPrice.trim(),
                                  yearlyPrice: pageDraft.yearlyPrice.trim(),
                                  annualDiscountPercent: pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : undefined,
                                  currency: pageDraft.currency,
                                })
                              }
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save
                            </button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:col-span-2">
                          <div className="text-xs text-gray-400 mb-1">FAQ</div>
                          <div className="text-[11px] text-gray-500 mb-3">Shown at the bottom of the public page (custom domain + slug).</div>
                          <div className="space-y-2">
                            {(pageDraft.faq || []).map((it, idx) => (
                              <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="text-xs text-gray-400">Item #{idx + 1}</div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPageDraft((s) => ({
                                        ...s,
                                        faq: (s.faq || []).filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" /> Remove
                                  </button>
                                </div>
                                <input
                                  value={String(it?.q || "")}
                                  onChange={(e) =>
                                    setPageDraft((s) => ({
                                      ...s,
                                      faq: (s.faq || []).map((x, i) => (i === idx ? { ...(x || { q: "", a: "" }), q: e.target.value } : x)),
                                    }))
                                  }
                                  placeholder="Question"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                                <textarea
                                  value={String(it?.a || "")}
                                  onChange={(e) =>
                                    setPageDraft((s) => ({
                                      ...s,
                                      faq: (s.faq || []).map((x, i) => (i === idx ? { ...(x || { q: "", a: "" }), a: e.target.value } : x)),
                                    }))
                                  }
                                  placeholder="Answer"
                                  className="mt-2 w-full min-h-[80px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                              </div>
                            ))}

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPageDraft((s) => ({ ...s, faq: [...(s.faq || []), { q: "", a: "" }] }))}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                              >
                                + Add FAQ
                              </button>
                              <button
                                type="button"
                                onClick={() => saveConfig({ faq: (publishPatch as any).faq || [] })}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save FAQ
                              </button>
                            </div>
                          </div>
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

                <Card title="Live preview">
                  <TemplatePreview
                    config={{
                      slug,
                      saasName: pageDraft.saasName,
                      tagline: pageDraft.tagline,
                      logoUrl: pageDraft.logoUrl ? String(pageDraft.logoUrl) : undefined,
                      colors: {
                        main: pageDraft.main,
                        secondary: pageDraft.secondary,
                        accent: pageDraft.accent,
                        background: pageDraft.background,
                      },
                      currency: pageDraft.currency,
                      monthlyPrice: pageDraft.monthlyPrice,
                      yearlyPrice: pageDraft.yearlyPrice,
                      annualDiscountPercent: pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : undefined,
                      allowPromotionCodes: Boolean(config.allowPromotionCodes),
                      defaultDiscountId: String((config as any).defaultDiscountId || ""),
                      faq: pageDraft.faq,
                    }}
                  />
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
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="shrink-0">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                                <button
                                  type="button"
                                  onClick={() => deleteRequest(r.id)}
                                  disabled={requestLoading}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-50"
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


