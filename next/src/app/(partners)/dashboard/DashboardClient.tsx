"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, RefreshCcw, Save, Palette, LayoutTemplate, Trash2, Link2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TemplatePreview from "./TemplatePreview";

type PartnerConfig = {
  saasName?: string;
  slug?: string;
  adminEmail?: string;
  supportEmail?: string;
  whatsappNumber?: string;
  customDomain?: string;
  domainVerified?: boolean;
  domainVerifiedAt?: string;
  stripeAccountEmail?: string;
  emailDomain?: string;
  resendDomainId?: string;
  resendDomainStatus?: string;
  resendDomainRecords?: Array<{ record?: string; type?: string; name?: string; value?: string; priority?: number; ttl?: number; status?: string }>;
  resendDomainLastCheckedAt?: string;
  dmarcName?: string;
  dmarcRecommended?: string;
  dmarcFound?: boolean;
  dmarcFoundRecords?: string[];
  dmarcMatchesRecommended?: boolean;
  dmarcLastCheckedAt?: string;
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
  offerTitle?: string;
  annualDiscountPercent?: number;
  allowPromotionCodes?: boolean;
  defaultDiscountId?: string;
  signupMode?: string;
  faq?: { q: string; a: string }[];
  titleHighlight?: string;
  titleHighlightColor?: "accent" | "main" | "secondary";
  subtitleHighlight?: string;
  subtitleHighlightColor?: "accent" | "main" | "secondary";
};

type PartnerStats = {
  signups: number;
  payments: number;
  revenue: number;
  lastUpdated?: string;
  recentSignups?: Array<{ firstName?: string; email?: string; createdAt?: string }>;
  recentPayments?: Array<{ email?: string; amount?: number; currency?: string; createdAt?: string }>;
};

type DataRow = {
  firstName: string;
  email: string;
  signupCreatedAt: string;
  paymentAmount: number | null;
  paymentCurrency: string;
  paymentCreatedAt: string;
  couponCode: string;
  subscriptionCreatedAt: string;
  subscriptionInterval: string; // month|year|unknown
  subscriptionCanceled: boolean;
  subscriptionActive: boolean;
  subscriptionStatus: string;
};

type StripeStatus = {
  connected: boolean;
  connectedAccountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  bankLast4?: string | null;
};

function safeCurrencyCode(input: any) {
  const c = String(input || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "";
}

function fmtCurrency(amount: any, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `0 ${currency}`.trim();
  const code = safeCurrencyCode(currency) || "EUR";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${code}`.trim();
  }
}

function Card({ title, children, statusIcon }: { title: string; children: React.ReactNode; statusIcon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-5">
      <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        {statusIcon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function DashboardClient() {
  const DEFAULT_TAGLINE = "Access to +50 Ecom tools for nothing";
  const prettyNameFromSlug = React.useCallback((s: string) => {
    const clean = String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!clean) return "";
    return clean
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }, []);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const qsSlug = searchParams?.get("slug") || "";
  const initialTab = (searchParams?.get("tab") || "settings") as "data" | "settings" | "page" | "promos";
  const qsAcct = searchParams?.get("acct") || "";

  const [slug, setSlug] = React.useState<string>(qsSlug);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<PartnerConfig>({});
  const [stats, setStats] = React.useState<PartnerStats | null>(null);
  const [statsRefreshing, setStatsRefreshing] = React.useState(false);
  const [dataRows, setDataRows] = React.useState<DataRow[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [connectLoading, setConnectLoading] = React.useState(false);
  const didAutoSetFee = React.useRef(false);
  const [accountEmail, setAccountEmail] = React.useState<string>("");
  const [tab, setTab] = React.useState<"data" | "settings" | "page" | "promos">(initialTab);
  const [stripeStatus, setStripeStatus] = React.useState<StripeStatus>({ connected: false });
  const [stripeStatusError, setStripeStatusError] = React.useState<string | null>(null);
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
    supportEmail: string;
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
    titleHighlight: string;
    titleHighlightColor: "accent" | "main" | "secondary";
    subtitleHighlight: string;
    subtitleHighlightColor: "accent" | "main" | "secondary";
  }>({
    saasName: prettyNameFromSlug(qsSlug),
    tagline: DEFAULT_TAGLINE,
    supportEmail: "",
    logoUrl: "",
    faviconUrl: "",
    monthlyPrice: "",
    yearlyPrice: "",
    annualDiscountPercent: "20",
    currency: "EUR",
    main: "",
    secondary: "",
    accent: "",
    background: "",
    faq: [],
    titleHighlight: "",
    titleHighlightColor: "accent",
    subtitleHighlight: "",
    subtitleHighlightColor: "accent",
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
      excludeMonthly?: boolean;
      excludeAnnual?: boolean;
      couponId: string;
      promotionCodeId: string;
    }>
  >([]);
  const [promosLoading, setPromosLoading] = React.useState(false);
  const [promosError, setPromosError] = React.useState<string | null>(null);
  const [promoDraft, setPromoDraft] = React.useState<{
    code: string;
    type: "percent_once" | "percent_forever";
    percentOff: string;
    maxUses: string;
    excludeMonthly: boolean;
    excludeAnnual: boolean;
  }>({
    code: "",
    type: "percent_once",
    percentOff: "50",
    maxUses: "100",
    excludeMonthly: false,
    excludeAnnual: false,
  });

  const [emailDomainDraft, setEmailDomainDraft] = React.useState<string>("");
  const [emailDomainLoading, setEmailDomainLoading] = React.useState(false);
  const [emailDomainError, setEmailDomainError] = React.useState<string | null>(null);
  const [dmarcLoading, setDmarcLoading] = React.useState(false);
  const [dmarcError, setDmarcError] = React.useState<string | null>(null);

  const [promoEditor, setPromoEditor] = React.useState<null | {
    promotionCodeId: string;
    code: string;
    type: "percent_once" | "percent_forever";
    percentOff: string;
    maxUses: string;
    active: boolean;
    excludeMonthly: boolean;
    excludeAnnual: boolean;
    original: {
      code: string;
      type: "percent_once" | "percent_forever";
      percentOff: number;
      maxUses?: number;
      active: boolean;
      excludeMonthly?: boolean;
      excludeAnnual?: boolean;
    };
  }>(null);

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
    // Accept "#fff", "fff", "#ffffff", "ffffff" and normalize to "#rrggbb" for the <input type="color" />.
    const withHash = v.startsWith("#") ? v : (v ? `#${v}` : "");
    if (/^#[0-9a-f]{6}$/i.test(withHash)) return withHash;
    if (/^#[0-9a-f]{3}$/i.test(withHash)) {
      const r = withHash[1], g = withHash[2], b = withHash[3];
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

  const ensureRequesterEmail = React.useCallback(async () => {
    const current = String(accountEmail || "").trim();
    if (current) return current;
    try {
      const { data } = await supabase.auth.getUser();
      const email = String(data.user?.email || "").trim();
      if (email) setAccountEmail(email);
      return email;
    } catch {
      return "";
    }
  }, [accountEmail]);

  React.useEffect(() => {
    if (slug) return;
    // SECURITY: never blindly reuse a stored slug across accounts.
    // Resolve allowed slugs for the authenticated email and pick a matching slug (or force onboarding).
    let cancelled = false;
    (async () => {
      try {
        const requesterEmail = await ensureRequesterEmail();
        if (!requesterEmail) return;
        const res = await fetch("/api/partners/me", { cache: "no-store", headers: { "x-user-email": requesterEmail } });
        const json = await res.json().catch(() => ({}));
        const slugs: string[] = Array.isArray(json?.slugs) ? json.slugs : [];
        if (!slugs.length) {
          try { localStorage.removeItem("partners_current_slug"); } catch {}
          if (!cancelled) window.location.href = "/configuration";
          return;
        }
        const stored = (() => {
          try { return String(localStorage.getItem("partners_current_slug") || "").trim().toLowerCase(); } catch { return ""; }
        })();
        const chosen = (stored && slugs.includes(stored)) ? stored : slugs[0];
        try { localStorage.setItem("partners_current_slug", chosen); } catch {}
        if (!cancelled) setSlug(chosen);
      } catch {}
    })();
    return () => { cancelled = true; };
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

  const parsePrice = React.useCallback((v: any) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const format2 = React.useCallback((n: number) => {
    return (Math.round(n * 100) / 100).toFixed(2);
  }, []);

  // Auto-compute yearly base price (= monthly * 12) for a simpler pricing UX.
  React.useEffect(() => {
    const m = parsePrice(pageDraft.monthlyPrice);
    const nextYearly = m > 0 ? format2(m * 12) : "";
    if (String(pageDraft.yearlyPrice || "") === nextYearly) return;
    setPageDraft((s) => ({ ...s, yearlyPrice: nextYearly }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageDraft.monthlyPrice, parsePrice, format2]);

  const publishPatch = React.useMemo(() => {
    const monthly = Number(String(pageDraft.monthlyPrice || "").replace(",", "."));
    const derivedYearly =
      Number.isFinite(monthly) && monthly > 0 ? (Math.round(monthly * 12 * 100) / 100).toFixed(2) : "";
    const aDisc = pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : undefined;
    const aDiscNum = aDisc !== undefined && Number.isFinite(aDisc) ? Math.min(Math.max(aDisc, 0), 90) : 20;
    return {
      saasName: pageDraft.saasName.trim(),
      tagline: pageDraft.tagline.trim(),
      supportEmail: pageDraft.supportEmail.trim(),
      logoUrl: pageDraft.logoUrl.trim(),
      faviconUrl: pageDraft.faviconUrl.trim(),
      titleHighlight: pageDraft.titleHighlight.trim(),
      titleHighlightColor: pageDraft.titleHighlightColor,
      subtitleHighlight: pageDraft.subtitleHighlight.trim(),
      subtitleHighlightColor: pageDraft.subtitleHighlightColor,
      colors: {
        main: pageDraft.main.trim(),
        secondary: pageDraft.secondary.trim(),
        accent: pageDraft.accent.trim(),
        background: pageDraft.background.trim(),
      },
      // Offer name is no longer configurable: leave empty so Stripe uses `${saasName} Subscription`.
      offerTitle: "",
      monthlyPrice: pageDraft.monthlyPrice.trim(),
      yearlyPrice: derivedYearly,
      annualDiscountPercent: aDiscNum,
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
    pageDraft.supportEmail,
    pageDraft.logoUrl,
    pageDraft.faviconUrl,
    pageDraft.titleHighlight,
    pageDraft.titleHighlightColor,
    pageDraft.subtitleHighlight,
    pageDraft.subtitleHighlightColor,
    pageDraft.main,
    pageDraft.secondary,
    pageDraft.accent,
    pageDraft.background,
    pageDraft.monthlyPrice,
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
      String((c as any)?.supportEmail || "").trim() === String((publishPatch as any)?.supportEmail || "").trim() &&
      String(c?.logoUrl || "").trim() === publishPatch.logoUrl &&
      String((c as any)?.faviconUrl || "").trim() === publishPatch.faviconUrl &&
      String(colors?.main || "").trim() === (publishPatch as any)?.colors?.main &&
      String(colors?.secondary || "").trim() === (publishPatch as any)?.colors?.secondary &&
      String(colors?.accent || "").trim() === (publishPatch as any)?.colors?.accent &&
      String(colors?.background || "").trim() === (publishPatch as any)?.colors?.background &&
      String((c as any)?.offerTitle || "").trim() === String((publishPatch as any)?.offerTitle || "").trim() &&
      String(c?.monthlyPrice ?? "").trim() === String(publishPatch.monthlyPrice || "").trim() &&
      String(c?.yearlyPrice ?? "").trim() === String(publishPatch.yearlyPrice || "").trim() &&
      String(c?.currency || "").trim() === String(publishPatch.currency || "").trim() &&
      (Number(c?.annualDiscountPercent ?? 20) || 0) === (Number((publishPatch as any)?.annualDiscountPercent ?? 20) || 0) &&
      faqSame;
    return !same;
  }, [config, publishPatch]);

  // Auto-publish page branding so the live site updates like the preview.
  const [autoPublishPage, setAutoPublishPage] = React.useState(true);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("__partners_auto_publish_page");
      if (v === "0") setAutoPublishPage(false);
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem("__partners_auto_publish_page", autoPublishPage ? "1" : "0");
    } catch {}
  }, [autoPublishPage]);

  React.useEffect(() => {
    if (tab !== "page") return;
    if (!slug) return;
    if (!autoPublishPage) return;
    if (!pageNeedsPublish) return;
    if (saving) return;
    const t = window.setTimeout(() => {
      // Best-effort: apply to live
      saveConfig(publishPatch);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, slug, autoPublishPage, pageNeedsPublish, publishPatch]);

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
      setStripeStatusError(null);
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
      if (!res.ok || !json?.ok) {
        if (account) {
          setStripeStatus((prev) => ({ ...prev, connected: true, connectedAccountId: prev.connectedAccountId || account }));
        }
        setStripeStatusError(String(json?.detail || json?.error || "Stripe status unavailable"));
        return;
      }
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

  const revenueCurrency = React.useMemo(() => {
    const cfgCur = safeCurrencyCode((config as any)?.currency);
    if (cfgCur) return cfgCur;
    const payCur = safeCurrencyCode((stats?.recentPayments || [])[0]?.currency);
    if (payCur) return payCur;
    return "EUR";
  }, [config, stats]);

  const fallbackRows = React.useMemo<DataRow[]>(() => {
    const signups = Array.isArray((stats as any)?.recentSignups) ? ((stats as any).recentSignups as any[]) : [];
    const payments = Array.isArray((stats as any)?.recentPayments) ? ((stats as any).recentPayments as any[]) : [];
    const paymentsByEmail = new Map<string, { amount?: number; currency?: string; createdAt?: string }>();
    for (const p of payments) {
      const email = String(p?.email || "").toLowerCase().trim();
      if (!email) continue;
      if (!paymentsByEmail.has(email)) {
        paymentsByEmail.set(email, {
          amount: Number(p?.amount || 0) || 0,
          currency: p?.currency ? String(p.currency).toUpperCase() : "",
          createdAt: p?.createdAt ? String(p.createdAt) : "",
        });
      }
    }
    return signups.map((s) => {
      const email = String(s?.email || "").toLowerCase().trim();
      const pay = email ? paymentsByEmail.get(email) : undefined;
      return {
        firstName: String(s?.firstName || ""),
        email,
        signupCreatedAt: s?.createdAt ? String(s.createdAt) : "",
        paymentAmount: pay?.amount ?? null,
        paymentCurrency: pay?.currency || "",
        paymentCreatedAt: pay?.createdAt || "",
        couponCode: "",
        subscriptionCreatedAt: "",
        subscriptionInterval: "",
        subscriptionCanceled: false,
        subscriptionActive: false,
        subscriptionStatus: "",
      };
    });
  }, [stats]);

  const tableRows = React.useMemo<DataRow[]>(() => {
    const map = new Map<string, DataRow>();
    for (const r of Array.isArray(dataRows) ? dataRows : []) {
      const k = String(r?.email || "").toLowerCase().trim();
      if (!k) continue;
      map.set(k, r);
    }
    for (const r of fallbackRows) {
      const k = String(r?.email || "").toLowerCase().trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, r);
    }
    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const ta = Date.parse(String(a.subscriptionCreatedAt || a.signupCreatedAt || a.paymentCreatedAt || 0)) || 0;
      const tb = Date.parse(String(b.subscriptionCreatedAt || b.signupCreatedAt || b.paymentCreatedAt || 0)) || 0;
      return tb - ta;
    });
    return merged;
  }, [dataRows, fallbackRows]);

  const exportCsv = React.useCallback(() => {
    try {
      const rows = Array.isArray(tableRows) ? tableRows : [];
      const header = [
        "first_name",
        "email",
        "signup_created_at",
        "coupon_code",
        "subscription_created_at",
        "subscription_interval",
        "subscription_active",
        "subscription_canceled",
        "subscription_status",
        "payment_amount",
        "payment_currency",
        "payment_created_at",
      ];
      const esc = (v: any) => {
        const s = String(v ?? "");
        // RFC4180-ish: quote if contains comma/quote/newline
        if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const lines = [header.join(",")].concat(
        rows.map((r) =>
          [
            esc(r.firstName),
            esc(r.email),
            esc(r.signupCreatedAt),
            esc(r.couponCode),
            esc(r.subscriptionCreatedAt),
            esc(r.subscriptionInterval),
            esc(r.subscriptionActive),
            esc(r.subscriptionCanceled),
            esc(r.subscriptionStatus),
            esc(r.paymentAmount ?? ""),
            esc(r.paymentCurrency),
            esc(r.paymentCreatedAt),
          ].join(",")
        )
      );
      const csv = lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      const safeSlug = String(slug || "partner").replace(/[^a-z0-9_-]+/gi, "_");
      a.download = `partner_data_${safeSlug}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  }, [tableRows, slug]);

  const checkDomainStatus = React.useCallback(async (domain: string) => {
    if (!domain) return;
    try {
      const res = await fetch(`/api/partners/domain/verify?domain=${encodeURIComponent(domain)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok && json?.verified) {
        setDomainVerify({ status: "ok", message: "Verified ✅" });
      } else {
        // Don't set to "fail" on load, keep as "idle" to avoid false negatives
        // User can manually verify if needed
      }
    } catch {}
  }, []);

  const loadAll = async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const requesterEmail = await ensureRequesterEmail();
      if (!requesterEmail) {
        setError("Please sign in again.");
        window.location.href = "/signin";
        return;
      }
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`/api/partners/config?slug=${encodeURIComponent(s)}`, { cache: "no-store", headers: { "x-user-email": requesterEmail } }),
        fetch(`/api/partners/stats?slug=${encodeURIComponent(s)}`, { cache: "no-store", headers: { "x-user-email": requesterEmail } }),
      ]);

      const cfgJson = await cfgRes.json().catch(() => ({}));
      const statsJson = await statsRes.json().catch(() => ({}));

      if (cfgRes.status === 403) {
        // Security: user is not allowed to view this slug -> force onboarding
        try { localStorage.removeItem("partners_current_slug"); } catch {}
        window.location.href = "/configuration";
        return;
      }
      if (cfgRes.ok && cfgJson?.ok) {
        const loadedConfig = cfgJson.config || {};
        setConfig(loadedConfig);
        // Restore domain verification status from config if it was previously verified
        const customDomain = String((loadedConfig as any)?.customDomain || "").trim();
        if (customDomain && (loadedConfig as any)?.domainVerified === true) {
          // Immediately set to verified (from persisted state)
          setDomainVerify({ status: "ok", message: "Verified ✅" });
          // Then verify in background to confirm it's still valid
          checkDomainStatus(customDomain);
        } else if (customDomain) {
          // Domain exists but not verified yet, check it
          checkDomainStatus(customDomain);
        }
      }
      if (statsRes.ok && statsJson?.ok) setStats(statsJson.stats || null);

      // Load live enriched rows (best-effort)
      try {
        const requesterEmail = await ensureRequesterEmail();
        setDataLoading(true);
        const dr = await fetch(`/api/partners/data?slug=${encodeURIComponent(s)}`, {
          cache: "no-store",
          headers: requesterEmail ? { "x-user-email": requesterEmail } : undefined,
        });
        const dj = await dr.json().catch(() => ({}));
        if (dr.ok && dj?.ok && Array.isArray(dj?.rows)) setDataRows(dj.rows as DataRow[]);
      } catch {} finally {
        setDataLoading(false);
      }
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

  const refreshStats = React.useCallback(async () => {
    if (!slug) return;
    setStatsRefreshing(true);
    try {
      const requesterEmail = await ensureRequesterEmail();
      const res = await fetch(`/api/partners/stats?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
        headers: requesterEmail ? { "x-user-email": requesterEmail } : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to refresh stats");
      setStats(json.stats || null);
      // refresh enriched rows too
      try {
        const requesterEmail = await ensureRequesterEmail();
        setDataLoading(true);
        const dr = await fetch(`/api/partners/data?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
          headers: requesterEmail ? { "x-user-email": requesterEmail } : undefined,
        });
        const dj = await dr.json().catch(() => ({}));
        if (dr.ok && dj?.ok && Array.isArray(dj?.rows)) setDataRows(dj.rows as DataRow[]);
      } catch {} finally {
        setDataLoading(false);
      }
      try {
        toast({ title: "Data refreshed", description: "Your stats have been updated." });
      } catch {}
    } catch (e: any) {
      try {
        toast({ title: "Refresh failed", description: e?.message || "Failed to refresh stats" });
      } catch {}
    } finally {
      setStatsRefreshing(false);
    }
  }, [slug, toast]);

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try { localStorage.removeItem("partners_current_slug"); } catch {}
    try { if (slug) localStorage.removeItem(`partners_connected_account_id:${slug}`); } catch {}
    window.location.href = "/signin";
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

  const checkDmarc = async () => {
    if (!slug) return;
    setDmarcLoading(true);
    setDmarcError(null);
    try {
      const requesterEmail = await ensureRequesterEmail();
      const normalizeDomain = (v: any) =>
        String(v || "")
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "")
          .replace(/:\d+$/, "")
          .replace(/\.$/, "")
          .replace(/^www\./, "");

      const base = normalizeDomain((config as any)?.customDomain || "") || normalizeDomain(emailDomainDraft);
      if (!base) throw new Error("Please enter a custom domain (Step 2) first.");
      const parts = base.split(".").filter(Boolean);
      const root = parts.length <= 2 ? base : parts.slice(-2).join(".");

      // Force rua mailbox domain to match the custom domain root.
      const normalizeLocalPart = (v: any) =>
        String(v || "")
          .trim()
          .toLowerCase()
          .replace(/^mailto:/, "")
          .split("@")[0]
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9._+-]/g, "");
      const fromSupportEmail = normalizeLocalPart(String(pageDraft.supportEmail || (config as any)?.supportEmail || ""));
      const localPart = fromSupportEmail || "support";
      const ruaEmail = `${localPart}@${root}`;

      const res = await fetch("/api/partners/dmarc", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(requesterEmail ? { "x-user-email": requesterEmail } : {}) },
        body: JSON.stringify({ slug, domain: root, rua: ruaEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const errorMsg = json?.detail || json?.error || "DMARC check failed";
        // Include debug info in error if available
        if (json?.debug) {
          console.error("DMARC check debug:", json.debug);
        }
        throw new Error(errorMsg);
      }
      // Log debug info for troubleshooting
      if (json?.debug) {
        console.log("DMARC check result:", {
          searched: json.debug.searchedName,
          found: json.found,
          recordsCount: json.debug.recordsCount,
          records: json.debug.recordsFound,
        });
      }
      if (json?.config) setConfig((s) => ({ ...s, ...(json.config || {}) }));
    } catch (e: any) {
      setDmarcError(e?.message || "DMARC check failed");
    } finally {
      setDmarcLoading(false);
    }
  };

  // (DMARC rua local-part now comes from Page → supportEmail, not from Step 2.)

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
        excludeMonthly: Boolean(promoDraft.excludeMonthly),
        excludeAnnual: Boolean(promoDraft.excludeAnnual),
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

  const parseBoolFlag = (v: any): boolean => {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    if (!s) return false;
    if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
    if (s === "0" || s === "false" || s === "no" || s === "n") return false;
    return Boolean(s);
  };

  /**
   * Add the partner's custom domain to Vercel.
   *
   * IMPORTANT: This adds the domain to the centralized "ecomefficiency" project.
   * All partner domains are managed in one Vercel project to avoid multi-project complexity.
   *
   * See: src/app/api/partners/domain/vercel/route.ts
   */
  const addDomainOnVercel = async () => {
    try {
      const d = String(config.customDomain || "").trim();
      if (!slug) return;
      if (!d) {
        setVercelAttach({ status: "fail", message: "Please enter a domain first." });
        return;
      }
      setVercelAttach({ status: "working", message: "Adding domain in Vercel…" });
      const email = await ensureRequesterEmail();
      if (!email) {
        throw new Error("Please sign in first (we need your email to authorize this action).");
      }
      const res = await fetch("/api/partners/domain/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": email },
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

  const replacePromo = async (
    promotionCodeId: string,
    patch: {
      code: string;
      type: "percent_once" | "percent_forever";
      percentOff: number;
      maxUses?: number;
      active?: boolean;
      excludeMonthly?: boolean;
      excludeAnnual?: boolean;
    }
  ) => {
    if (!slug) return;
    setPromosLoading(true);
    setPromosError(null);
    try {
      const res = await fetch("/api/partners/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify({ slug, promotionCodeId, ...patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Edit failed");
      const nextPromos = Array.isArray(json.promos) ? json.promos : promos;
      setPromos(nextPromos);
      const newItem = json?.item as any;
      // If user saved as disabled, immediately disable the newly created promo.
      if (newItem?.promotionCodeId && patch.active === false) {
        await setPromoActive(String(newItem.promotionCodeId), false);
        setPromoEditor(null);
      } else {
        setPromoEditor(null);
      }
    } catch (e: any) {
      setPromosError(e?.message || "Edit failed");
    } finally {
      setPromosLoading(false);
    }
  };

  const deletePromo = async (promotionCodeId: string) => {
    if (!slug) return;
    setPromosLoading(true);
    setPromosError(null);
    try {
      const res = await fetch("/api/partners/promo-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(accountEmail ? { "x-user-email": accountEmail } : {}) },
        body: JSON.stringify({ slug, promotionCodeId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Delete failed");
      setPromos(Array.isArray(json.promos) ? json.promos : promos);
      setPromoEditor(null);
    } catch (e: any) {
      setPromosError(e?.message || "Delete failed");
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
      saasName: String(c.saasName || d.saasName || prettyNameFromSlug((c as any)?.slug || slug) || ""),
      tagline: String(c.tagline || d.tagline || DEFAULT_TAGLINE),
      supportEmail: String((c as any).supportEmail || d.supportEmail || ""),
      logoUrl: String((c as any).logoUrl || d.logoUrl || ""),
      faviconUrl: String((c as any).faviconUrl || d.faviconUrl || ""),
      titleHighlight: String((c as any).titleHighlight || d.titleHighlight || ""),
      titleHighlightColor: (((c as any).titleHighlightColor as any) || d.titleHighlightColor || "accent") as any,
      subtitleHighlight: String((c as any).subtitleHighlight || d.subtitleHighlight || ""),
      subtitleHighlightColor: (((c as any).subtitleHighlightColor as any) || d.subtitleHighlightColor || "accent") as any,
      monthlyPrice: c.monthlyPrice !== undefined && c.monthlyPrice !== null ? String(c.monthlyPrice) : d.monthlyPrice,
      yearlyPrice: c.yearlyPrice !== undefined && c.yearlyPrice !== null ? String(c.yearlyPrice) : d.yearlyPrice,
      annualDiscountPercent:
        c.annualDiscountPercent !== undefined && c.annualDiscountPercent !== null
          ? String(c.annualDiscountPercent)
          : d.annualDiscountPercent,
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
    (config as any)?.supportEmail,
    (config as any)?.logoUrl,
    (config as any)?.faviconUrl,
    (config as any)?.monthlyPrice,
    (config as any)?.yearlyPrice,
    (config as any)?.annualDiscountPercent,
    (config as any)?.currency,
    (config as any)?.colors,
    (config as any)?.faq,
    slug,
    prettyNameFromSlug,
  ]);

  // Email domain draft defaults (notify.<customDomain>) and stays in sync with loaded config
  React.useEffect(() => {
    const existing = String((config as any)?.emailDomain || "").trim();
    if (existing) {
      setEmailDomainDraft(existing);
      return;
    }
    const cd = String((config as any)?.customDomain || "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .replace(/\.$/, "")
      .replace(/^www\./, "");
    if (cd) setEmailDomainDraft(`notify.${cd}`);
  }, [(config as any)?.emailDomain, (config as any)?.customDomain]);

  // Default support email to the DMARC rua mailbox (support@<root-domain>) when empty
  React.useEffect(() => {
    const normalizeDomain = (v: any) =>
      String(v || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .replace(/:\d+$/, "")
        .replace(/\.$/, "")
        .replace(/^www\./, "");
    const base = normalizeDomain((config as any)?.customDomain || "") || normalizeDomain(emailDomainDraft);
    if (!base) return;
    const parts = base.split(".").filter(Boolean);
    const root = parts.length <= 2 ? base : parts.slice(-2).join(".");
    const current = String(pageDraft.supportEmail || "").trim();
    const existing = String((config as any)?.supportEmail || "").trim();
    if (current || existing) return;
    setPageDraft((s) => ({ ...s, supportEmail: `support@${root}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(config as any)?.customDomain, emailDomainDraft, (config as any)?.supportEmail]);

  /**
   * Configure or verify the partner's email domain in Resend.
   *
   * This is separate from the Vercel domain configuration:
   * - Vercel domain: For hosting the website
   * - Email domain: For sending transactional emails
   *
   * See: src/app/api/partners/email-domain/route.ts
   */
  const refreshEmailDomain = async (action: "create" | "verify") => {
    if (!slug) return;
    const domain = String(emailDomainDraft || "").trim();
    if (!domain) {
      setEmailDomainError("Please enter an email domain (e.g. notify.yourdomain.com)");
      return;
    }
    setEmailDomainLoading(true);
    setEmailDomainError(null);
    try {
      const email = await ensureRequesterEmail();
      if (!email) {
        throw new Error("Please sign in first (we need your email to authorize this action).");
      }
      const res = await fetch("/api/partners/email-domain", {
        method: action === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", "x-user-email": email },
        body: JSON.stringify({ slug, domain }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait 2 seconds and click Verify again.");
        }
        throw new Error(json?.detail || json?.error || "Email domain request failed");
      }
      if (json?.config) {
        setConfig((s) => ({ ...s, ...(json.config || {}) }));
        const status = String((json.config as any)?.resendDomainStatus || "").toLowerCase();
        if (action === "create") {
          toast({
            title: "Domain registered",
            description: `The ${domain} domain has been registered in Resend. Add the DNS records below, then click "Verify".`,
          });
        } else if (action === "verify") {
          if (status === "verified" || status === "active") {
            toast({
              title: "Domain verified",
              description: `The ${domain} domain is now verified and ready to send emails.`,
            });
          } else {
            toast({
              title: "Verification pending",
              description: `DNS records are still propagating. Status: ${status}. Check again in a few minutes.`,
              variant: "default",
            });
          }
        }
      }
    } catch (e: any) {
      const msg = String(e?.message || "Email domain request failed");
      if (msg.includes("resend_not_configured")) {
        setEmailDomainError("Resend is not configured on this deployment. Add RESEND_API_KEY to the Vercel project “next” (Production) and redeploy, then retry.");
        toast({
          title: "Resend not configured",
          description: "Add RESEND_API_KEY to Vercel environment variables.",
          variant: "destructive",
        });
      } else if (/registered already/i.test(msg)) {
        // Domain likely already exists in Resend — don't show this as a scary error.
        const friendly = "This domain already exists in Resend. Click “Verify” to refresh status and DNS records.";
        setEmailDomainError(friendly);
        toast({
          title: "Domain already exists",
          description: friendly,
          variant: "default",
        });
      } else {
        setEmailDomainError(msg);
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setEmailDomainLoading(false);
    }
  };

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
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl"
            >
              Log out
            </button>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Data</div>
                    <div className="text-xs text-gray-500">Signups, payments & revenue for this slug</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={!tableRows.length}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Export CSV"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={refreshStats}
                      disabled={!slug || statsRefreshing}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {statsRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                      Refresh
                    </button>
                  </div>
                </div>
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
                    <div className="text-2xl font-semibold">{fmtCurrency(stats?.revenue ?? 0, revenueCurrency)}</div>
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
                          <th className="py-2 pr-4">Coupon code</th>
                          <th className="py-2 pr-4">Sub created</th>
                          <th className="py-2 pr-4">Interval</th>
                          <th className="py-2 pr-4">Active</th>
                          <th className="py-2 pr-4">Canceled</th>
                          <th className="py-2 pr-4">Payment</th>
                          <th className="py-2">Signup created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLoading ? (
                          <tr>
                            <td colSpan={11} className="py-6 text-center text-gray-500">
                              Loading…
                            </td>
                          </tr>
                        ) : tableRows.length ? (
                          tableRows.map((c, i) => (
                            <tr key={`${c.email}-${i}`} className="border-b border-white/5">
                              <td className="py-2 pr-4 text-gray-200">{c.firstName || "—"}</td>
                              <td className="py-2 pr-4 text-gray-300">{c.email || "—"}</td>
                              <td className="py-2 pr-4 text-gray-300">{c.couponCode || "—"}</td>
                              <td className="py-2 pr-4 text-gray-400">{c.subscriptionCreatedAt ? new Date(c.subscriptionCreatedAt).toLocaleString() : "—"}</td>
                              <td className="py-2 pr-4 text-gray-300">{c.subscriptionInterval || "—"}</td>
                              <td className="py-2 pr-4">
                                {c.subscriptionActive ? (
                                  <span className="inline-flex items-center gap-2 text-green-300">
                                    <span className="w-2 h-2 rounded-full bg-green-400/80" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 text-gray-400">
                                    <span className="w-2 h-2 rounded-full bg-gray-500/60" /> —
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-4">
                                {c.subscriptionCanceled ? (
                                  <span className="inline-flex items-center gap-2 text-amber-300">
                                    <span className="w-2 h-2 rounded-full bg-amber-400/80" /> Yes
                                  </span>
                                ) : (
                                  <span className="text-gray-400">No</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-gray-300">
                                {c.paymentAmount !== null && c.paymentAmount !== undefined
                                  ? `${c.paymentAmount.toFixed(2)} ${c.paymentCurrency || revenueCurrency}`
                                  : "—"}
                              </td>
                              <td className="py-2 text-gray-400">{c.signupCreatedAt ? new Date(c.signupCreatedAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={11} className="py-6 text-center text-gray-500">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(() => {
                  // Helper to determine status icon for each step
                  const getStripeStatusIcon = () => {
                    if (stripeStatusError) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    if (stripeStatus.connected && stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
                    if (stripeStatus.connected) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    return <XCircle className="w-4 h-4 text-gray-500" />;
                  };
                  const getDomainStatusIcon = () => {
                    if (domainVerify.status === "ok") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
                    if (domainVerify.status === "fail" || (config.customDomain && domainVerify.status === "idle")) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    if (config.customDomain) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    return <XCircle className="w-4 h-4 text-gray-500" />;
                  };
                  const getEmailStatusIcon = () => {
                    const normalizeDomain = (v: any) =>
                      String(v || "")
                        .trim()
                        .toLowerCase()
                        .replace(/^https?:\/\//, "")
                        .replace(/\/.*$/, "")
                        .replace(/:\d+$/, "")
                        .replace(/\.$/, "")
                        .replace(/^www\./, "");
                    const draft = normalizeDomain(emailDomainDraft);
                    const configured = normalizeDomain((config as any)?.emailDomain);
                    const matches = Boolean(draft && configured && draft === configured);

                    // If user typed a new domain but hasn't created/verified it yet,
                    // never show "verified" from the previous configured domain.
                    if (!matches) {
                      if (draft) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                      return <XCircle className="w-4 h-4 text-gray-500" />;
                    }

                    const st = String((config as any)?.resendDomainStatus || "").toLowerCase();
                    if (st === "verified" || st === "active") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
                    if (st === "pending" || st === "not_started" || emailDomainError) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    if ((config as any)?.resendDomainId) return <AlertCircle className="w-4 h-4 text-amber-400" />;
                    return <XCircle className="w-4 h-4 text-gray-500" />;
                  };
                  return (
                    <>
                      <Card title="Step 1 — Stripe payments (Connect)" statusIcon={getStripeStatusIcon()}>
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
                    {stripeStatusError ? (
                      <div className="text-[11px] text-amber-300/90 mt-2">
                        Stripe status warning: {stripeStatusError}
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card title="Step 2 — Custom domain" statusIcon={getDomainStatusIcon()}>
                  <div className="text-sm text-gray-300">Connect your own domain for your SaaS website.</div>
                  <div className="mt-4 space-y-3">
                    <div className="text-xs text-gray-400">Step 1 — Connect your custom domain</div>
                    <input
                      value={config.customDomain || ""}
                      onChange={(e) => {
                        const newDomain = e.target.value;
                        setConfig((s) => ({ ...s, customDomain: newDomain, domainVerified: false, domainVerifiedAt: undefined }));
                        setDomainVerify({ status: "idle" });
                        setVercelAttach({ status: "idle" });
                      }}
                      placeholder="ecomwolf.com"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    />

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
                            setDomainVerify({ status: "ok", message: "Verified ✅" });
                            // Auto-save mapping + persist verification status
                            await saveConfig({ customDomain: d, domainVerified: true, domainVerifiedAt: new Date().toISOString() });
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
                    {domainVerify.status !== "idle" ? (
                      <div className={`text-xs ${domainVerify.status === "ok" ? "text-green-300" : domainVerify.status === "checking" ? "text-gray-400" : "text-red-300"}`}>
                        {domainVerify.message || (domainVerify.status === "checking" ? "Checking…" : "")}
                      </div>
                    ) : null}

                    {/* Helpful hint for DNS propagation / common gotchas */}
                    {domainVerify.status === "fail" ? (
                      <div className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                        DNS propagation can take <b>10–30 minutes</b>, and sometimes up to <b>24–48h</b> depending on your provider and cached resolvers.
                        <div className="mt-1">
                          If it still doesn’t verify:
                          <ul className="list-disc ml-5 mt-1 space-y-0.5">
                            <li>Check there is only one <b>A</b> record for <b>@</b> (and remove conflicting <b>AAAA</b> if needed).</li>
                            <li>Make sure <b>www</b> is a <b>CNAME</b> to <b>cname.vercel-dns.com</b> (or the exact <b>vercel-dns-*</b> shown in Vercel).</li>
                            <li>If you use Cloudflare, set these DNS records to <b>DNS only</b> (not proxied).</li>
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    <div className="pt-2 border-t border-white/10" />
                    <div className="text-xs text-gray-400">Step 2 — Push your template to your custom domain</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const d = String(config.customDomain || "").trim();
                          if (!d) {
                            setVercelAttach({ status: "fail", message: "Please enter a domain first." });
                            return;
                          }
                          await addDomainOnVercel();
                          try {
                            await saveConfig({ customDomain: d });
                          } catch {}
                          try {
                            if (customDomainUrl) window.open(customDomainUrl, "_blank", "noopener,noreferrer");
                          } catch {}
                        }}
                        disabled={!slug || vercelAttach.status === "working"}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Attach the domain to this Vercel project (if needed) and publish the mapping so your template serves on the domain."
                      >
                        {vercelAttach.status === "working" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Push template to domain
                      </button>
                      {customDomainUrl ? (
                        <a href={customDomainUrl} target="_blank" rel="noreferrer" className="text-sm text-purple-300 hover:text-purple-200">
                          Open
                        </a>
                      ) : null}
                    </div>
                    {vercelAttach.status !== "idle" ? (
                      <div className={`text-xs ${vercelAttach.status === "ok" ? "text-green-300" : vercelAttach.status === "working" ? "text-gray-400" : "text-red-300"}`}>
                        {vercelAttach.message || ""}
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card title="Step 3 — Email (Resend)" statusIcon={getEmailStatusIcon()}>
                  <div className="text-sm text-gray-300">
                    Send magic-link emails from your own domain (recommended: <span className="font-mono text-gray-200">notify.yourdomain.com</span>).
                    <div className="mt-2 text-xs text-gray-500">
                      We’ll generate the exact DNS records (SPF/DKIM/etc.) for you to copy/paste, then you click “Verify”.
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(() => {
                      const normalizeDomain = (v: any) =>
                        String(v || "")
                          .trim()
                          .toLowerCase()
                          .replace(/^https?:\/\//, "")
                          .replace(/\/.*$/, "")
                          .replace(/:\d+$/, "")
                          .replace(/\.$/, "")
                          .replace(/^www\./, "");
                      const base = normalizeDomain((config as any)?.customDomain || "") || normalizeDomain(emailDomainDraft);
                      const parts = base ? base.split(".").filter(Boolean) : [];
                      const root = base ? (parts.length <= 2 ? base : parts.slice(-2).join(".")) : "";
                      const placeholder = root ? `support@${root}` : "support@yourdomain.com";
                      return (
                        <div>
                          <div className="text-xs text-gray-400">What’s your support email?</div>
                          <input
                            value={pageDraft.supportEmail}
                            onChange={(e) => setPageDraft((s) => ({ ...s, supportEmail: e.target.value }))}
                            placeholder={placeholder}
                            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                          />
                          <div className="mt-1 text-[11px] text-gray-500">Used in DMARC reporting (rua) + footer/policies.</div>
                        </div>
                      );
                    })()}

                    <div className="text-xs text-gray-400">Email domain</div>
                    <input
                      value={emailDomainDraft}
                      onChange={(e) => {
                        setEmailDomainDraft(e.target.value);
                        setEmailDomainError(null);
                      }}
                      placeholder="notify.ecomefficiency.casa"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => refreshEmailDomain("create")}
                        disabled={!slug || emailDomainLoading}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Create (or fetch) this domain in Resend and show DNS records"
                      >
                        {emailDomainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Create / show DNS
                      </button>
                      <button
                        type="button"
                        onClick={() => refreshEmailDomain("verify")}
                        disabled={!slug || emailDomainLoading}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Verify DNS records on Resend"
                      >
                        {emailDomainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        Verify
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      {(() => {
                        const normalizeDomain = (v: any) =>
                          String(v || "")
                            .trim()
                            .toLowerCase()
                            .replace(/^https?:\/\//, "")
                            .replace(/\/.*$/, "")
                            .replace(/:\d+$/, "")
                            .replace(/\.$/, "")
                            .replace(/^www\./, "");
                        const draft = normalizeDomain(emailDomainDraft);
                        const configured = normalizeDomain((config as any)?.emailDomain);
                        const matches = Boolean(draft && configured && draft === configured);
                        const st = matches ? String((config as any)?.resendDomainStatus || "") : "";
                        const stLower = String(st || "").toLowerCase();
                        const checkedAt = matches ? (config as any)?.resendDomainLastCheckedAt : null;

                        return (
                          <>
                            Status:{" "}
                            <span className={stLower === "verified" || stLower === "active" ? "text-green-300" : "text-gray-300"}>
                              {matches ? String(st || "not configured") : "not configured"}
                            </span>
                            {checkedAt ? <span className="text-gray-500"> • last check: {new Date(String(checkedAt)).toLocaleString()}</span> : null}
                            {!matches && draft ? (
                              <span className="text-amber-300">
                                {" "}
                                • you changed the domain — click “Create / show DNS” for this new domain
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>

                    {(() => {
                      const normalizeDomain = (v: any) =>
                        String(v || "")
                          .trim()
                          .toLowerCase()
                          .replace(/^https?:\/\//, "")
                          .replace(/\/.*$/, "")
                          .replace(/:\d+$/, "")
                          .replace(/\.$/, "")
                          .replace(/^www\./, "");
                      const draft = normalizeDomain(emailDomainDraft);
                      const configured = normalizeDomain((config as any)?.emailDomain);
                      const matches = Boolean(draft && configured && draft === configured);
                      const st = matches ? String((config as any)?.resendDomainStatus || "").toLowerCase() : "";
                      if (!st || st === "verified" || st === "active") return null;
                      if (st === "pending" || st === "not_started") {
                        return (
                          <div className="text-[11px] text-gray-500">
                            Pending usually means DNS hasn’t propagated yet. Typical: 5–30 minutes, sometimes up to 24h (depends on your DNS provider/TTL).
                            After you add the records, click “Verify” again.
                          </div>
                        );
                      }
                      return (
                        <div className="text-[11px] text-gray-500">
                          If this stays stuck, double-check the DNS record names/values match exactly (no extra dots/spaces) and that you added them to the correct DNS zone.
                        </div>
                      );
                    })()}

                    {emailDomainError ? <div className="text-xs text-red-300">{emailDomainError}</div> : null}

                    {(() => {
                      const normalizeDomain = (v: any) =>
                        String(v || "")
                          .trim()
                          .toLowerCase()
                          .replace(/^https?:\/\//, "")
                          .replace(/\/.*$/, "")
                          .replace(/:\d+$/, "")
                          .replace(/\.$/, "")
                          .replace(/^www\./, "");
                      const draft = normalizeDomain(emailDomainDraft);
                      const configured = normalizeDomain((config as any)?.emailDomain);
                      const matches = Boolean(draft && configured && draft === configured);
                      const recs = (config as any)?.resendDomainRecords;
                      if (matches && Array.isArray(recs) && recs.length) {
                        return (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                        <div className="text-gray-400 mb-2">DNS records (copy/paste)</div>
                        <div className="space-y-2">
                          {(recs as any[]).map((r: any, idx: number) => (
                            <div key={`${r?.type || "rec"}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-gray-300">{String(r?.type || "RECORD")}</div>
                                <div className="text-[11px] text-gray-500">{r?.status ? `Status: ${r.status}` : ""}</div>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2">
                                <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-gray-400">Name</div>
                                    <div className="font-mono text-sm text-gray-200 truncate">{String(r?.name || "")}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyText(String(r?.name || ""))}
                                    className="shrink-0 p-1 rounded hover:bg-white/10"
                                    aria-label="Copy name"
                                  >
                                    <Copy className="w-4 h-4 text-gray-300" />
                                  </button>
                                </div>
                                <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-gray-400">Value</div>
                                    <div className="font-mono text-sm text-gray-200 break-all">{String(r?.value || "")}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyText(String(r?.value || ""))}
                                    className="shrink-0 p-1 rounded hover:bg-white/10"
                                    aria-label="Copy value"
                                  >
                                    <Copy className="w-4 h-4 text-gray-300" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                        );
                      }
                      return (
                        <div className="text-[11px] text-gray-500">
                          Click “Create / show DNS” to generate the records for the domain above. After you add them in your DNS provider, click “Verify”.
                        </div>
                      );
                    })()}

                    {/* DMARC helper: DMARC must be added in DNS (TXT). We generate the record for the custom domain and can check it automatically. */}
                    {(() => {
                      const normalizeDomain = (v: any) =>
                        String(v || "")
                          .trim()
                          .toLowerCase()
                          .replace(/^https?:\/\//, "")
                          .replace(/\/.*$/, "")
                          .replace(/:\d+$/, "")
                          .replace(/\.$/, "")
                          .replace(/^www\./, "");

                      const base = normalizeDomain((config as any)?.customDomain || "") || normalizeDomain(emailDomainDraft);
                      if (!base) return null;
                      const parts = base.split(".").filter(Boolean);
                      const root = parts.length <= 2 ? base : parts.slice(-2).join(".");

                      const dmarcName = `_dmarc.${root}`;
                      const dmarcHostNamecheap = `_dmarc`;
                      const normalizeLocalPart = (v: any) =>
                        String(v || "")
                          .trim()
                          .toLowerCase()
                          .replace(/^mailto:/, "")
                          .split("@")[0]
                          .replace(/\s+/g, "")
                          .replace(/[^a-z0-9._+-]/g, "");
                      const supportLp = normalizeLocalPart(pageDraft.supportEmail || (config as any)?.supportEmail || "");
                      const localPart = supportLp || "support";
                      const ruaEmail = `${localPart}@${root}`;
                      const recommended = `v=DMARC1; p=none; rua=mailto:${ruaEmail}`;

                      const found = Boolean((config as any)?.dmarcFound);
                      const namecheapMistake = Boolean((config as any)?.dmarcNamecheapHostMistake);
                      const checkedAt = (config as any)?.dmarcLastCheckedAt;
                      const foundRecords = Array.isArray((config as any)?.dmarcFoundRecords) ? (config as any).dmarcFoundRecords : [];

                      return (
                        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-gray-300">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-gray-400">DMARC</div>
                            <div className="flex items-center gap-2">
                              <div className={`text-[11px] ${found ? "text-green-300" : "text-amber-300"}`}>
                                {found ? "present" : "missing"}
                                {checkedAt ? <span className="text-gray-500"> • last check: {new Date(String(checkedAt)).toLocaleString()}</span> : null}
                              </div>
                              <button
                                type="button"
                                onClick={checkDmarc}
                                disabled={!slug || dmarcLoading}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                title="Check DMARC TXT record in DNS"
                              >
                                {dmarcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                Check DMARC
                              </button>
                            </div>
                          </div>
                          
                          {/* Show found records for debugging */}
                          {foundRecords.length > 0 ? (
                            <div className="mt-3 rounded-md border border-white/5 bg-black/20 px-2 py-2">
                              <div className="text-[11px] text-gray-400 mb-1">Found DNS records ({foundRecords.length}):</div>
                              {foundRecords.map((record: string, idx: number) => (
                                <div key={idx} className="font-mono text-[10px] text-gray-300 break-all mt-1">
                                  {record}
                                </div>
                              ))}
                            </div>
                          ) : checkedAt ? (
                            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-2">
                              <div className="text-[11px] text-amber-300">
                                No DNS records found for <span className="font-mono">{dmarcName}</span>
                                <br />
                                {namecheapMistake ? (
                                  <span className="text-amber-400/80">
                                    Namecheap hint: your record likely exists at <span className="font-mono">{`_dmarc.${root}.${root}`}</span> because you entered the full domain in the Host field.
                                    Use Host <span className="font-mono">{dmarcHostNamecheap}</span> (not <span className="font-mono">{dmarcName}</span>).
                                  </span>
                                ) : (
                                  <span className="text-amber-400/80">
                                    If you're using Namecheap: set Host to <span className="font-mono">{dmarcHostNamecheap}</span> (Namecheap appends <span className="font-mono">.{root}</span> automatically).
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-2 space-y-2">
                            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Host / Name (Namecheap)</div>
                                <div className="font-mono text-sm text-gray-200 break-all">{dmarcHostNamecheap}</div>
                              </div>
                              <button type="button" onClick={() => copyText(dmarcHostNamecheap)} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy DMARC host">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-2">
                              <div className="text-[11px] text-gray-400">Full record (FQDN)</div>
                              <div className="font-mono text-[11px] text-gray-300 break-all">{dmarcName}</div>
                              <div className="mt-1 text-[10px] text-gray-500">Some DNS providers require the full name; Namecheap usually wants only the host.</div>
                            </div>
                            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Type</div>
                                <div className="font-mono text-sm text-gray-200">TXT</div>
                              </div>
                              <button type="button" onClick={() => copyText("TXT")} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy type">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-400">Value (starter)</div>
                                <div className="font-mono text-sm text-gray-200 break-all">{recommended}</div>
                              </div>
                              <button type="button" onClick={() => copyText(recommended)} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Copy DMARC value">
                                <Copy className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 text-[11px] text-gray-500">
                            <span className="text-gray-300">Optional but recommended:</span> without DMARC, email deliverability is often worse (more chances to land in spam).
                            <br />
                            Start with <span className="font-mono">p=none</span>, then move to <span className="font-mono">p=quarantine</span> /{" "}
                            <span className="font-mono">p=reject</span> once SPF/DKIM are stable.
                          </div>
                          {dmarcError ? <div className="mt-2 text-xs text-red-300">{dmarcError}</div> : null}
                        </div>
                      );
                    })()}
                  </div>
                </Card>
                    </>
                  );
                })()}
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

                        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xs text-gray-400 mb-2">Exclude price</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-sm text-gray-200">
                              <input
                                type="checkbox"
                                checked={promoDraft.excludeMonthly}
                                onChange={(e) => setPromoDraft((s) => ({ ...s, excludeMonthly: e.target.checked }))}
                              />
                              Exclude monthly
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-200">
                              <input
                                type="checkbox"
                                checked={promoDraft.excludeAnnual}
                                onChange={(e) => setPromoDraft((s) => ({ ...s, excludeAnnual: e.target.checked }))}
                              />
                              Exclude annual
                            </label>
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
                              const times = Number.isFinite(Number((p as any).timesRedeemed)) ? Number((p as any).timesRedeemed) : 0;
                              const max = Number.isFinite(Number(p.maxUses)) && Number(p.maxUses) > 0 ? Number(p.maxUses) : 0;
                              const pct = max > 0 ? Math.min(100, Math.round((times / max) * 100)) : 0;
                              const selected = promoEditor?.promotionCodeId === p.promotionCodeId;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setPromoEditor({
                                      promotionCodeId: p.promotionCodeId,
                                      code: p.code,
                                      type: p.type,
                                      percentOff: String(p.percentOff),
                                      maxUses: p.maxUses ? String(p.maxUses) : "",
                                      active: Boolean(p.active),
                                      excludeMonthly: parseBoolFlag((p as any).excludeMonthly),
                                      excludeAnnual: parseBoolFlag((p as any).excludeAnnual),
                                      original: {
                                        code: p.code,
                                        type: p.type,
                                        percentOff: Number(p.percentOff),
                                        maxUses: p.maxUses,
                                        active: Boolean(p.active),
                                        excludeMonthly: parseBoolFlag((p as any).excludeMonthly),
                                        excludeAnnual: parseBoolFlag((p as any).excludeAnnual),
                                      },
                                    });
                                  }}
                                  className={`w-full text-left grid grid-cols-12 gap-0 px-3 py-3 text-sm items-center hover:bg-white/5 transition ${
                                    selected ? "bg-white/5" : ""
                                  }`}
                                >
                                  <div className="col-span-4 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="font-mono text-gray-200 truncate">{p.code}</div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          copyText(String(p.code || ""));
                                        }}
                                        className="shrink-0 p-1 rounded hover:bg-white/10"
                                        aria-label="Copy promo code"
                                        title="Copy code"
                                      >
                                        <Copy className="w-4 h-4 text-gray-300" />
                                      </button>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                      {/* Copy link removed (requested). Keeping copy code as minimal convenience. */}
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-gray-300 text-xs">{p.type === "percent_forever" ? "Forever" : "One payment"}</div>
                                  <div className="col-span-2 text-gray-300 text-xs">{p.percentOff}%</div>
                                  <div className="col-span-2 text-gray-300 text-xs">
                                    <span className="text-gray-200">{p.maxUses || "—"}</span>
                                  </div>
                                  <div className="col-span-2 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      <div className={`text-xs ${p.active ? "text-green-300" : "text-gray-500"}`}>{p.active ? "active" : "disabled"}</div>
                                      {max > 0 ? (
                                        <div className="text-[11px] text-gray-400">
                                          Usage: {times}/{max} ({pct}%)
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-gray-500">Usage: {times}</div>
                                      )}
                                      {max > 0 ? (
                                        <div className="w-24 h-1.5 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                                          <div className="h-full" style={{ width: `${pct}%`, background: p.active ? "#34d399" : "#6b7280" }} />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-6 text-center text-xs text-gray-500">No promo codes yet.</div>
                          )}
                        </div>
                      </div>

                      {promoEditor ? (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white">Edit promo</div>
                              <div className="text-[11px] text-gray-500 font-mono break-all">{promoEditor.promotionCodeId}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPromoEditor(null)}
                              className="text-xs text-gray-400 hover:text-gray-200"
                            >
                              Close
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-gray-400">Code</div>
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  value={promoEditor.code}
                                  onChange={(e) => setPromoEditor((s) => (s ? { ...s, code: e.target.value.toUpperCase() } : s))}
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => copyText(String(promoEditor.code || "").trim())}
                                  className="shrink-0 inline-flex items-center gap-2 px-3 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                                  title="Copy promo code"
                                >
                                  <Copy className="w-4 h-4" /> Copy
                                </button>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500">Changing the code creates a new Stripe promo and disables the old one.</div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-400">Type</div>
                              <select
                                value={promoEditor.type}
                                onChange={(e) => setPromoEditor((s) => (s ? { ...s, type: e.target.value as any } : s))}
                                className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              >
                                <option value="percent_once">Percentage off (one payment)</option>
                                <option value="percent_forever">Percentage off (forever)</option>
                              </select>
                            </div>

                            <div>
                              <div className="text-xs text-gray-400">Percent off</div>
                              <input
                                value={promoEditor.percentOff}
                                onChange={(e) => setPromoEditor((s) => (s ? { ...s, percentOff: e.target.value } : s))}
                                inputMode="numeric"
                                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              />
                            </div>

                            <div>
                              <div className="text-xs text-gray-400">Max uses</div>
                              <input
                                value={promoEditor.maxUses}
                                onChange={(e) => setPromoEditor((s) => (s ? { ...s, maxUses: e.target.value } : s))}
                                inputMode="numeric"
                                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                              />
                              <div className="mt-1 text-[11px] text-gray-500">Leave empty for unlimited.</div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-gray-400 mb-2">Exclude price</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 text-sm text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={promoEditor.excludeMonthly}
                                  onChange={(e) => setPromoEditor((s) => (s ? { ...s, excludeMonthly: e.target.checked } : s))}
                                />
                                Exclude monthly
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={promoEditor.excludeAnnual}
                                  onChange={(e) => setPromoEditor((s) => (s ? { ...s, excludeAnnual: e.target.checked } : s))}
                                />
                                Exclude annual
                              </label>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={promosLoading}
                              onClick={async () => {
                                if (!promoEditor) return;
                                const code = promoEditor.code.trim().toUpperCase();
                                const percentOff = Number(promoEditor.percentOff);
                                const maxUses = promoEditor.maxUses ? Number(promoEditor.maxUses) : undefined;
                                const maxUsesClean = Number.isFinite(maxUses as any) && (maxUses as number) > 0 ? Math.floor(maxUses as number) : undefined;

                                // Validation
                                if (!/^[A-Z0-9_-]{3,}$/.test(code)) {
                                  setPromosError("Invalid code (use A-Z 0-9 _ -)");
                                  return;
                                }
                                if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
                                  setPromosError("Invalid percent off (1-100)");
                                  return;
                                }

                                // If only active/maxUses changes are needed, we can update in-place (PUT).
                                if (
                                  code === promoEditor.original.code &&
                                  promoEditor.type === promoEditor.original.type &&
                                  Number(percentOff) === Number(promoEditor.original.percentOff)
                                ) {
                                  // Exclusions cannot be changed in-place on Stripe promo codes; they require replacement.
                                  if (
                                    Boolean(promoEditor.excludeMonthly) !== Boolean(promoEditor.original.excludeMonthly) ||
                                    Boolean(promoEditor.excludeAnnual) !== Boolean(promoEditor.original.excludeAnnual)
                                  ) {
                                    await replacePromo(promoEditor.promotionCodeId, {
                                      code,
                                      type: promoEditor.type,
                                      percentOff,
                                      ...(maxUsesClean ? { maxUses: maxUsesClean } : {}),
                                      active: promoEditor.active,
                                      excludeMonthly: promoEditor.excludeMonthly,
                                      excludeAnnual: promoEditor.excludeAnnual,
                                    } as any);
                                    setPromoEditor(null);
                                    return;
                                  }
                                  await setPromoActive(promoEditor.promotionCodeId, promoEditor.active, maxUsesClean);
                                  setPromoEditor(null);
                                  return;
                                }

                                // Otherwise replace promo (PATCH).
                                await replacePromo(promoEditor.promotionCodeId, {
                                  code,
                                  type: promoEditor.type,
                                  percentOff,
                                  ...(maxUsesClean ? { maxUses: maxUsesClean } : {}),
                                  active: promoEditor.active,
                                  excludeMonthly: promoEditor.excludeMonthly,
                                  excludeAnnual: promoEditor.excludeAnnual,
                                });
                              }}
                              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {promosLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save changes
                            </button>

                            <button
                              type="button"
                              disabled={promosLoading}
                              onClick={async () => {
                                if (!promoEditor) return;
                                await setPromoActive(promoEditor.promotionCodeId, !promoEditor.active);
                                setPromoEditor(null);
                              }}
                              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {promoEditor.active ? "Disable" : "Enable"}
                            </button>

                            <button
                              type="button"
                              disabled={promosLoading}
                              onClick={async () => {
                                if (!promoEditor) return;
                                await deletePromo(promoEditor.promotionCodeId);
                              }}
                              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>

                          {promosError ? <div className="mt-2 text-xs text-red-300 break-words">{promosError}</div> : null}
                        </div>
                      ) : null}
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
                          <button
                            type="button"
                            onClick={() => setAutoPublishPage((v) => !v)}
                            className={`h-7 w-12 rounded-full border transition ${
                              autoPublishPage ? "bg-green-500/20 border-green-400/40" : "bg-white/5 border-white/10"
                            }`}
                            title="Auto-publish changes to the live site"
                          >
                            <span
                              className={`block h-5 w-5 rounded-full bg-white/80 translate-y-[1px] transition ${
                                autoPublishPage ? "translate-x-[22px]" : "translate-x-[2px]"
                              }`}
                            />
                          </button>
                          <div className="text-xs text-gray-500">{autoPublishPage ? "Auto-publish ON" : "Auto-publish OFF"}</div>
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
                            <input
                              value={pageDraft.supportEmail}
                              onChange={(e) => setPageDraft((s) => ({ ...s, supportEmail: e.target.value }))}
                              placeholder="Support email (used in policies/footer) — e.g. support@yourdomain.com"
                              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={pageDraft.titleHighlight}
                              onChange={(e) => setPageDraft((s) => ({ ...s, titleHighlight: e.target.value }))}
                              placeholder='Highlight word in title (e.g. "OFF")'
                              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                            <select
                              value={pageDraft.titleHighlightColor}
                              onChange={(e) => setPageDraft((s) => ({ ...s, titleHighlightColor: e.target.value as any }))}
                              className="w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            >
                              <option value="accent">Accent</option>
                              <option value="main">Main</option>
                              <option value="secondary">Secondary</option>
                            </select>
                            <input
                              value={pageDraft.subtitleHighlight}
                              onChange={(e) => setPageDraft((s) => ({ ...s, subtitleHighlight: e.target.value }))}
                              placeholder='Highlight word in subtitle (optional)'
                              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            />
                            <select
                              value={pageDraft.subtitleHighlightColor}
                              onChange={(e) => setPageDraft((s) => ({ ...s, subtitleHighlightColor: e.target.value as any }))}
                              className="w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                            >
                              <option value="accent">Accent</option>
                              <option value="main">Main</option>
                              <option value="secondary">Secondary</option>
                            </select>
                          </div>
                            <button
                              type="button"
                            onClick={() =>
                              saveConfig({
                                saasName: pageDraft.saasName.trim(),
                                tagline: pageDraft.tagline.trim(),
                                supportEmail: pageDraft.supportEmail.trim(),
                                titleHighlight: pageDraft.titleHighlight.trim(),
                                titleHighlightColor: pageDraft.titleHighlightColor,
                                subtitleHighlight: pageDraft.subtitleHighlight.trim(),
                                subtitleHighlightColor: pageDraft.subtitleHighlightColor,
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
                                  onChange={(e) => {
                                    // Normalize common inputs like "fff" -> "#fff" so they persist and apply immediately.
                                    const raw = String(e.target.value || "").trim();
                                    const next = raw && !raw.startsWith("#") && /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw) ? `#${raw}` : raw;
                                    setPageDraft((s) => ({ ...s, [key]: next } as any));
                                  }}
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
                            <div className="text-[11px] text-gray-500">
                              Enter your <span className="text-gray-300 font-medium">monthly</span> price. We auto-calculate the{" "}
                              <span className="text-gray-300 font-medium">annual</span> price as <span className="font-mono">monthly × 12</span>.
                                You can optionally apply a discount on the annual plan.
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <div className="text-[11px] text-gray-400 mb-1">Monthly price</div>
                                <input
                                  value={pageDraft.monthlyPrice}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, monthlyPrice: e.target.value }))}
                                  placeholder='Example: "29.99"'
                                  inputMode="decimal"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-400 mb-1">Annual price (auto)</div>
                                <input
                                  value={pageDraft.yearlyPrice}
                                  readOnly
                                  placeholder="Auto = monthly × 12"
                                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-300 focus:outline-none"
                                />
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-400 mb-1">Annual discount %</div>
                                <input
                                  value={pageDraft.annualDiscountPercent}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, annualDiscountPercent: e.target.value }))}
                                  placeholder='Example: "20"'
                                  inputMode="numeric"
                                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                />
                              </div>

                              <div>
                                <div className="text-[11px] text-gray-400 mb-1">Currency</div>
                                <select
                                  value={pageDraft.currency}
                                  onChange={(e) => setPageDraft((s) => ({ ...s, currency: e.target.value }))}
                                  className="w-full rounded-xl border border-white/15 bg-black/60 text-white px-3 py-2 text-sm focus:outline-none focus:border-white/25"
                                >
                                  <option value="EUR">EUR</option>
                                  <option value="USD">USD</option>
                                  <option value="GBP">GBP</option>
                                </select>
                              </div>
                            </div>

                            <div className="text-[11px] text-gray-500">
                              Preview in popup:
                              {" "}
                              {(() => {
                                const m = parsePrice(pageDraft.monthlyPrice);
                                const y = m > 0 ? m * 12 : 0;
                                const adRaw = pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : 20;
                                const ad = Number.isFinite(adRaw) ? Math.min(Math.max(adRaw, 0), 90) : 20;
                                const m2 = m;
                                const y2 = y > 0 ? y * (1 - ad / 100) : y;
                                const cur = String(pageDraft.currency || "EUR").toUpperCase();
                                const sym = cur === "USD" ? "$" : cur === "GBP" ? "£" : "€";
                                const fmt = (n: number) => (cur === "USD" || cur === "GBP" ? `${sym}${format2(n)}` : `${format2(n)}${sym}`);
                                const offer = "";
                                return (
                                  <span className="text-gray-300">
                                    Monthly: <span className="font-medium">{fmt(m2 || 0)}</span>
                                    {" • "}
                                    Annual: <span className="font-medium">{fmt(y2 || 0)}</span>
                                    {ad > 0 && y > 0 ? <span className="text-gray-500 line-through ml-1">{fmt(y)}</span> : null}
                                    {ad > 0 && y > 0 ? <span className="text-green-300 ml-1">-{ad}%</span> : null}
                                  </span>
                                );
                              })()}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const m = parsePrice(pageDraft.monthlyPrice);
                                const yearly = m > 0 ? format2(m * 12) : "";
                                const adRaw = pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : 20;
                                const ad = Number.isFinite(adRaw) ? Math.min(Math.max(adRaw, 0), 90) : 20;
                                saveConfig({
                                  offerTitle: "",
                                  monthlyPrice: pageDraft.monthlyPrice.trim(),
                                  yearlyPrice: yearly,
                                  annualDiscountPercent: ad,
                                  currency: pageDraft.currency,
                                });
                              }}
                              disabled={saving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save pricing
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
                    {/* Removed big logo preview here (it was confusing in the Pages tab). */}
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
                        offerTitle: "",
                      monthlyPrice: pageDraft.monthlyPrice,
                      yearlyPrice: pageDraft.yearlyPrice,
                      annualDiscountPercent: pageDraft.annualDiscountPercent ? Number(pageDraft.annualDiscountPercent) : 20,
                      allowPromotionCodes: Boolean(config.allowPromotionCodes),
                      defaultDiscountId: String((config as any).defaultDiscountId || ""),
                      faq: pageDraft.faq,
                      titleHighlight: pageDraft.titleHighlight,
                      titleHighlightColor: pageDraft.titleHighlightColor,
                      subtitleHighlight: pageDraft.subtitleHighlight,
                      subtitleHighlightColor: pageDraft.subtitleHighlightColor,
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


