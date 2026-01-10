"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Upload, X } from "lucide-react";

type SignupMode = "public" | "invite_only";
type Currency = "USD" | "EUR" | "OTHER";
type DomainProvider = "Namecheap" | "GoDaddy" | "Cloudflare" | "Other" | "";

type FormState = {
  saasName: string;
  slug: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  mainColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  customDomain: string;
  domainProvider: DomainProvider;
  adminEmail: string;
  signupMode: SignupMode;
  stripeAccountEmail: string;
  currency: Currency;
  currencyOther: string;
  monthlyPrice: string;
  supportEmail: string;
  desiredLaunch: "ASAP" | "DATE";
  desiredLaunchDate: string;
  notes: string;
};

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isHex(v: string) {
  return /^#([0-9a-fA-F]{6})$/.test(v.trim());
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function useSupabaseAuthCallback() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const hash = window.location.hash || "";
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const m = hash.match(/access_token=([^&]+).*refresh_token=([^&]+)/);
        if (m?.[1] && m?.[2]) {
          try {
            await supabase.auth.setSession({
              access_token: decodeURIComponent(m[1]),
              refresh_token: decodeURIComponent(m[2]),
            });
          } catch {}
          try {
            history.replaceState(null, "", window.location.pathname + window.location.search);
          } catch {}
          return;
        }
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch {}
          try {
            history.replaceState(null, "", window.location.pathname);
          } catch {}
          return;
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

export default function PartnersConfigurationPage() {
  const { toast } = useToast();
  const ready = useSupabaseAuthCallback();

  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState<{ logo?: boolean; favicon?: boolean }>({});
  const [step, setStep] = React.useState(0);

  const [form, setForm] = React.useState<FormState>(() => ({
    saasName: "",
    slug: "",
    tagline: "",
    logoUrl: "",
    faviconUrl: "",
    mainColor: "#111111",
    secondaryColor: "#7c30c7",
    accentColor: "#ab63ff",
    backgroundColor: "",
    customDomain: "",
    domainProvider: "",
    adminEmail: "",
    signupMode: "public",
    stripeAccountEmail: "",
    currency: "USD",
    currencyOther: "",
    monthlyPrice: "",
    supportEmail: "",
    desiredLaunch: "ASAP",
    desiredLaunchDate: "",
    notes: "",
  }));

  // Prefill from URL (signup flow can pass email)
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const email = url.searchParams.get("email");
      if (email && isEmail(email)) {
        setForm((s) => ({ ...s, adminEmail: s.adminEmail || email, supportEmail: s.supportEmail || email }));
      }
    } catch {}
  }, []);

  // Prefill from session if available
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email || "";
        if (email && isEmail(email)) {
          setForm((s) => ({ ...s, adminEmail: s.adminEmail || email }));
        }
      } catch {}
    })();
  }, [ready]);

  // Load draft
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("partners_onboarding_draft_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setForm((s) => ({ ...s, ...parsed }));
      }
    } catch {}
  }, []);

  // Persist draft
  React.useEffect(() => {
    try {
      localStorage.setItem("partners_onboarding_draft_v1", JSON.stringify(form));
    } catch {}
  }, [form]);

  const steps = React.useMemo(
    () => [
      { key: "saasName", title: "SaaS name", help: "Public name of your software", required: true },
      { key: "slug", title: "URL slug", help: "Used for the default URL (e.g. ecomwolf → partners.ecomefficiency.com/ecomwolf)", required: true },
      { key: "tagline", title: "Short tagline (optional)", help: "One short sentence under the logo", required: false },
      { key: "logo", title: "Logo upload", help: "PNG or SVG. Transparent background recommended. 10 MB max.", required: true },
      { key: "favicon", title: "Favicon upload", help: "10 MB max.", required: true },
      { key: "colors", title: "Brand colors (HEX)", help: "Main / Secondary / Accent (+ optional background)", required: true },
      { key: "customDomain", title: "Custom domain (optional)", help: "Example: app.ecomwolf.com", required: false },
      { key: "domainProvider", title: "Domain provider", help: "Namecheap / GoDaddy / Cloudflare / Other", required: true },
      { key: "adminEmail", title: "Admin email", help: "Full access to the SaaS", required: true },
      { key: "signupMode", title: "User signup mode", help: "Choose how end-users can join", required: true },
      { key: "stripeAccountEmail", title: "Stripe account email", help: "Used to connect your Stripe (Stripe Connect)", required: true },
      { key: "currency", title: "Currency", help: "$ / € / Other", required: true },
      { key: "monthlyPrice", title: "Monthly price you will charge users", help: "Example: 29.99 / 39.99", required: true },
      { key: "supportEmail", title: "Support email", help: "Example: support@yourdomain.com", required: true },
      { key: "desiredLaunch", title: "Desired launch date", help: "ASAP or pick a date", required: true },
      { key: "notes", title: "Anything important we should know? (optional)", help: "Optional notes", required: false },
      { key: "review", title: "Review & submit", help: "Confirm your info", required: true },
    ],
    []
  );

  const total = steps.length;
  const progress = Math.round(((step + 1) / total) * 100);
  const current = steps[step];

  const baseUrlPreview = React.useMemo(() => {
    try {
      const hostname = window.location.hostname.replace(/^www\./, "");
      const host = hostname.startsWith("partners.") ? hostname : `partners.${hostname}`;
      const slug = cleanSlug(form.slug);
      if (!slug) return "";
      return `https://${host}/${slug}`;
    } catch {
      const slug = cleanSlug(form.slug);
      return slug ? `https://partners.ecomefficiency.com/${slug}` : "";
    }
  }, [form.slug]);

  const canGoNext = React.useMemo(() => {
    const slug = cleanSlug(form.slug);
    const price = Number(form.monthlyPrice);
    switch (current.key) {
      case "saasName":
        return form.saasName.trim().length > 1;
      case "slug":
        return /^[a-z0-9-]{2,40}$/.test(slug);
      case "logo":
        return Boolean(form.logoUrl);
      case "favicon":
        return Boolean(form.faviconUrl);
      case "colors":
        return isHex(form.mainColor) && isHex(form.secondaryColor) && isHex(form.accentColor) && (!form.backgroundColor || isHex(form.backgroundColor));
      case "domainProvider":
        return Boolean(form.domainProvider);
      case "adminEmail":
        return isEmail(form.adminEmail);
      case "signupMode":
        return form.signupMode === "public" || form.signupMode === "invite_only";
      case "stripeAccountEmail":
        return isEmail(form.stripeAccountEmail);
      case "currency":
        return form.currency === "USD" || form.currency === "EUR" || (form.currency === "OTHER" && form.currencyOther.trim().length > 0);
      case "monthlyPrice":
        return Number.isFinite(price) && price > 0;
      case "supportEmail":
        return isEmail(form.supportEmail);
      case "desiredLaunch":
        return form.desiredLaunch === "ASAP" || (form.desiredLaunch === "DATE" && Boolean(form.desiredLaunchDate));
      case "review":
        return true;
      default:
        return true;
    }
  }, [current.key, form]);

  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const uploadFile = async (kind: "logo" | "favicon", file: File) => {
    const slug = cleanSlug(form.slug);
    if (!slug) {
      toast({ title: "Slug required first", description: "Please set your URL slug before uploading files.", variant: "destructive" });
      return;
    }
    setUploading((u) => ({ ...u, [kind]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("slug", slug);
      const res = await fetch("/api/partners/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json?.publicUrl) {
        throw new Error(json?.detail || json?.error || "Upload failed");
      }
      if (kind === "logo") setForm((s) => ({ ...s, logoUrl: String(json.publicUrl) }));
      if (kind === "favicon") setForm((s) => ({ ...s, faviconUrl: String(json.publicUrl) }));
      toast({ title: "Uploaded", description: `${kind} uploaded successfully.` });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload. Ensure Supabase Storage bucket 'partners-assets' exists.",
        variant: "destructive",
      });
    } finally {
      setUploading((u) => ({ ...u, [kind]: false }));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        saasName: form.saasName.trim(),
        slug: cleanSlug(form.slug),
        tagline: form.tagline.trim(),
        logoUrl: form.logoUrl,
        faviconUrl: form.faviconUrl,
        mainColor: form.mainColor.trim(),
        secondaryColor: form.secondaryColor.trim(),
        accentColor: form.accentColor.trim(),
        backgroundColor: form.backgroundColor.trim(),
        customDomain: form.customDomain.trim(),
        domainProvider: form.domainProvider,
        adminEmail: form.adminEmail.trim(),
        signupMode: form.signupMode,
        stripeAccountEmail: form.stripeAccountEmail.trim(),
        currency: form.currency,
        currencyOther: form.currencyOther.trim(),
        monthlyPrice: form.monthlyPrice,
        supportEmail: form.supportEmail.trim(),
        desiredLaunch: form.desiredLaunch === "DATE" ? form.desiredLaunchDate : "ASAP",
        notes: form.notes.trim(),
      };
      const res = await fetch("/api/partners/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json?.error === "slug_taken") {
        toast({ title: "Slug already used", description: "Please choose another URL slug.", variant: "destructive" });
        // Jump back to slug step
        const idx = steps.findIndex((s) => s.key === "slug");
        if (idx >= 0) setStep(idx);
        setSubmitting(false);
        return;
      }
      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || "Submission failed");
      }
      toast({ title: "Submitted!", description: "Your onboarding has been received. We'll contact you shortly." });
      try {
        localStorage.removeItem("partners_onboarding_draft_v1");
      } catch {}
      window.location.href = `/signin?submitted=1`;
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Could not submit onboarding.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const onEnterNext: React.KeyboardEventHandler = (e) => {
    if (e.key !== "Enter") return;
    // Avoid submitting on textarea
    const el = e.target as HTMLElement | null;
    if (el && el.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (!canGoNext) return;
    if (current.key === "review") return;
    next();
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="text-gray-300 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={160} height={52} priority className="h-10 w-auto object-contain" />
            <div>
              <div className="text-sm font-semibold">Partners Onboarding</div>
              <div className="text-xs text-gray-400">Configuration wizard</div>
            </div>
          </div>
          <Link href="/signin" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>
              Step {step + 1} / {total}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[linear-gradient(to_right,#9541e0,#7c30c7)]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.12)]">
          <div className="p-6 md:p-10" onKeyDown={onEnterNext}>
            <div className="text-xs uppercase tracking-wide text-purple-300 mb-2">{current.title}</div>
            <div className="text-sm text-gray-400 mb-8">{current.help}</div>

            {/* Step content */}
            {current.key === "saasName" && (
              <input
                autoFocus
                value={form.saasName}
                onChange={(e) => setForm((s) => ({ ...s, saasName: e.target.value }))}
                placeholder="Example: EcomWolf Software"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "slug" && (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={form.slug}
                  onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                  placeholder="Example: ecomwolf"
                  className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
                />
                <div className="text-xs text-gray-400">
                  Preview:{" "}
                  <span className="text-gray-200 font-medium">{baseUrlPreview || "—"}</span>
                </div>
              </div>
            )}

            {current.key === "tagline" && (
              <input
                autoFocus
                value={form.tagline}
                onChange={(e) => setForm((s) => ({ ...s, tagline: e.target.value }))}
                placeholder="Example: All-in-one tools for dropshippers"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "logo" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload logo</span>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile("logo", f);
                      }}
                    />
                  </label>
                  {uploading.logo ? <span className="text-xs text-gray-400">Uploading…</span> : null}
                </div>
                {form.logoUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/30">
                    <div className="w-24 h-14 rounded-lg bg-black overflow-hidden grid place-items-center border border-white/10">
                      <img src={form.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate">{form.logoUrl}</div>
                      <button
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, logoUrl: "" }))}
                        className="mt-1 text-xs text-red-300 hover:text-red-200 inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No logo uploaded yet.</div>
                )}
              </div>
            )}

            {current.key === "favicon" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload favicon</span>
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/x-icon"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile("favicon", f);
                      }}
                    />
                  </label>
                  {uploading.favicon ? <span className="text-xs text-gray-400">Uploading…</span> : null}
                </div>
                {form.faviconUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/30">
                    <div className="w-10 h-10 rounded-lg bg-black overflow-hidden grid place-items-center border border-white/10">
                      <img src={form.faviconUrl} alt="Favicon preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate">{form.faviconUrl}</div>
                      <button
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, faviconUrl: "" }))}
                        className="mt-1 text-xs text-red-300 hover:text-red-200 inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No favicon uploaded yet.</div>
                )}
              </div>
            )}

            {current.key === "colors" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  ["mainColor", "Main color (HEX)", "#111111"],
                  ["secondaryColor", "Secondary color (HEX)", "#7c30c7"],
                  ["accentColor", "Accent / highlight (HEX)", "#ab63ff"],
                  ["backgroundColor", "Background color (optional)", "#000000"],
                ] as const).map(([k, label, placeholder]) => (
                  <div key={k} className="space-y-2">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="flex items-center gap-3">
                      <input
                        value={(form as any)[k]}
                        onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value } as any))}
                        placeholder={placeholder}
                        className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
                      />
                      <div
                        className="w-10 h-10 rounded-xl border border-white/15"
                        style={{ background: (form as any)[k] || "transparent" }}
                        title={(form as any)[k] || ""}
                      />
                    </div>
                    {(form as any)[k] && k !== "backgroundColor" && !isHex((form as any)[k]) ? (
                      <div className="text-xs text-red-300">Must be a valid HEX like #111111</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {current.key === "customDomain" && (
              <input
                autoFocus
                value={form.customDomain}
                onChange={(e) => setForm((s) => ({ ...s, customDomain: e.target.value }))}
                placeholder="Example: app.ecomwolf.com"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "domainProvider" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(["Namecheap", "GoDaddy", "Cloudflare", "Other"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, domainProvider: p }))}
                    className={`text-left px-4 py-3 rounded-xl border transition ${
                      form.domainProvider === p ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{p}</div>
                  </button>
                ))}
              </div>
            )}

            {current.key === "adminEmail" && (
              <input
                autoFocus
                value={form.adminEmail}
                onChange={(e) => setForm((s) => ({ ...s, adminEmail: e.target.value }))}
                placeholder="Example: admin@yourdomain.com"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "signupMode" && (
              <div className="space-y-3">
                {([
                  ["public", "Public Signup", "Anyone can sign up"],
                  ["invite_only", "Admin invite only", "Only invited users can join"],
                ] as const).map(([v, title, desc]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, signupMode: v }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      form.signupMode === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-gray-400 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            )}

            {current.key === "stripeAccountEmail" && (
              <input
                autoFocus
                value={form.stripeAccountEmail}
                onChange={(e) => setForm((s) => ({ ...s, stripeAccountEmail: e.target.value }))}
                placeholder="Example: billing@yourdomain.com"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "currency" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    ["USD", "$"],
                    ["EUR", "€"],
                    ["OTHER", "Autre"],
                  ] as const).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, currency: v }))}
                      className={`px-4 py-3 rounded-xl border transition ${
                        form.currency === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-medium">{label}</div>
                    </button>
                  ))}
                </div>
                {form.currency === "OTHER" ? (
                  <input
                    autoFocus
                    value={form.currencyOther}
                    onChange={(e) => setForm((s) => ({ ...s, currencyOther: e.target.value }))}
                    placeholder="Which currency?"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
                  />
                ) : null}
              </div>
            )}

            {current.key === "monthlyPrice" && (
              <input
                autoFocus
                value={form.monthlyPrice}
                onChange={(e) => setForm((s) => ({ ...s, monthlyPrice: e.target.value }))}
                placeholder="Example: 29.99"
                inputMode="decimal"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "supportEmail" && (
              <input
                autoFocus
                value={form.supportEmail}
                onChange={(e) => setForm((s) => ({ ...s, supportEmail: e.target.value }))}
                placeholder="Example: support@yourdomain.com"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "desiredLaunch" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(["ASAP", "DATE"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, desiredLaunch: v }))}
                      className={`px-4 py-3 rounded-xl border transition text-left ${
                        form.desiredLaunch === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-medium">{v === "ASAP" ? "ASAP" : "Pick a date"}</div>
                      <div className="text-xs text-gray-400 mt-1">{v === "ASAP" ? "We start right away" : "Choose your target launch date"}</div>
                    </button>
                  ))}
                </div>
                {form.desiredLaunch === "DATE" ? (
                  <input
                    type="date"
                    value={form.desiredLaunchDate}
                    onChange={(e) => setForm((s) => ({ ...s, desiredLaunchDate: e.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
                  />
                ) : null}
              </div>
            )}

            {current.key === "notes" && (
              <textarea
                autoFocus
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Optional notes…"
                className="w-full min-h-[160px] rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "review" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold mb-3">Summary</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">SaaS name:</span> <span className="text-gray-200">{form.saasName || "—"}</span></div>
                    <div><span className="text-gray-400">Slug:</span> <span className="text-gray-200">{cleanSlug(form.slug) || "—"}</span></div>
                    <div className="md:col-span-2"><span className="text-gray-400">Default URL:</span> <span className="text-gray-200">{baseUrlPreview || "—"}</span></div>
                    <div><span className="text-gray-400">Admin email:</span> <span className="text-gray-200">{form.adminEmail || "—"}</span></div>
                    <div><span className="text-gray-400">Signup mode:</span> <span className="text-gray-200">{form.signupMode === "invite_only" ? "Admin invite only" : "Public signup"}</span></div>
                    <div><span className="text-gray-400">Stripe email:</span> <span className="text-gray-200">{form.stripeAccountEmail || "—"}</span></div>
                    <div><span className="text-gray-400">Price:</span> <span className="text-gray-200">{form.monthlyPrice ? `${form.monthlyPrice}/mo` : "—"}</span></div>
                    <div><span className="text-gray-400">Currency:</span> <span className="text-gray-200">{form.currency === "OTHER" ? form.currencyOther : form.currency}</span></div>
                    <div><span className="text-gray-400">Support email:</span> <span className="text-gray-200">{form.supportEmail || "—"}</span></div>
                    <div><span className="text-gray-400">Launch:</span> <span className="text-gray-200">{form.desiredLaunch === "DATE" ? (form.desiredLaunchDate || "—") : "ASAP"}</span></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  By submitting, you confirm we can use these details to prepare your white-label setup.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={back}
                disabled={step === 0 || submitting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  step === 0 || submitting ? "border-white/5 text-white/30 cursor-not-allowed" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {current.key !== "review" ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={!canGoNext || submitting}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border ${
                    !canGoNext || submitting
                      ? "border-white/5 text-white/30 cursor-not-allowed"
                      : "border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110"
                  }`}
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 ${
                    submitting ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/90 border-b-transparent animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Tip: press <span className="text-gray-300">Enter</span> to go next.
        </div>
      </div>
    </div>
  );
}


