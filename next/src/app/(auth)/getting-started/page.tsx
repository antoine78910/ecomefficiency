"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { postGoal } from "@/lib/analytics";
import { Check, ChevronDown, X } from "lucide-react";

type AcquisitionSource =
  | "instagram"
  | "tiktok"
  | "google"
  | "ai_llm"
  | "friends"
  | "twitter"
  | "discord"
  | "youtube"
  | "reddit"
  | "word_of_mouth"
  | "other";

const SOURCES: { id: AcquisitionSource; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "google", label: "Google Search" },
  { id: "ai_llm", label: "AI / LLM" },
  { id: "twitter", label: "X / Twitter" },
  { id: "discord", label: "Discord" },
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
  { id: "word_of_mouth", label: "Word of mouth" },
  { id: "friends", label: "From a friend" },
  { id: "other", label: "Other" },
];

type WorkType = "agency" | "ecom_brand" | "dropshippers" | "software" | "freelancer" | "other";

const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: "agency", label: "Agency" },
  { id: "ecom_brand", label: "Ecommerce brand" },
  { id: "dropshippers", label: "Dropshippers" },
  { id: "software", label: "Software" },
  { id: "freelancer", label: "Freelancer" },
  { id: "other", label: "Other" },
];

type Step = "personalize" | "setup";
type Currency = "USD" | "EUR";

const COMMUNITY_FEATURES = [
  "White-label SaaS",
  "Fully personalized",
  "Group pricing",
  "Custom domain",
  "Your Stripe account",
] as const;

// Same list as PricingSection (tools)
const PRO_EXTRAS = [
  "Higgsfield",
  "Vmake",
  "Atria",
  "Runway",
  "Heygen",
  "Freepik",
  "TurboScribe",
  "Flair AI",
  "Exploding topics",
  "Fotor",
  "Foreplay",
  "Kalodata",
] as const;

const COMMON_CREDIT_BULLETS = [
  "+1 100k credits ElevenLabs account (refill every 3 days)",
  "+1 100k credits Pipiads account (refill every 3 days)",
] as const;

function detectCurrencyFromLocale(): Currency {
  try {
    const eurCC = new Set([
      "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
    ]);
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || "en-US";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const regionMatch = locale.match(/[-_]([A-Z]{2})/);
    const region = regionMatch ? regionMatch[1] : "";
    const isEuropeTimezone = timeZone.startsWith("Europe/") || timeZone.includes("Paris") || timeZone.includes("Berlin") || timeZone.includes("Brussels");
    return (region && eurCC.has(region)) || isEuropeTimezone ? "EUR" : "USD";
  } catch {
    return "USD";
  }
}

function formatPrice(amount: number, currency: Currency) {
  if (currency === "EUR") {
    const formatted = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return formatted.replace(/\s/g, "\u00A0") + "€";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function GettingStartedPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [checkoutTier, setCheckoutTier] = React.useState<"starter" | "pro" | null>(null);
  const [workType, setWorkType] = React.useState<WorkType | null>(null);
  const [source, setSource] = React.useState<AcquisitionSource | null>(null);
  const [sourceOther, setSourceOther] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [userId, setUserId] = React.useState<string>("");
  const [alreadySet, setAlreadySet] = React.useState(false);
  const [step, setStep] = React.useState<Step>("personalize");
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const [pricingReady, setPricingReady] = React.useState(false);
  const [starterExpanded, setStarterExpanded] = React.useState(false);

  const debug = React.useMemo(() => {
    try {
      if (typeof window === "undefined") return false;
      return new URL(window.location.href).searchParams.get("debug") === "1";
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Step from URL (?step=setup) for testing / refresh persistence
        try {
          const url = new URL(window.location.href);
          const s = String(url.searchParams.get("step") || "").toLowerCase();
          if (s === "setup") setStep("setup");
        } catch {}

        if (!SUPABASE_CONFIG_OK && !debug) {
          toast({ title: "Config required", description: "Missing Supabase env vars in local.", variant: "destructive" });
        }

        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          // Allow access even if not signed in (Get Started should still go to Stripe).
          if (!cancelled) {
            setEmail("");
            setUserId("");
            setAlreadySet(false);
          }
          return;
        }

        const meta = ((user?.user_metadata as any) || {}) as any;
        const existingSource = String(meta?.acquisition_source || "");
        if (!cancelled) {
          setEmail(user?.email || "");
          setUserId(user?.id || "");
          setAlreadySet(Boolean(existingSource));
        }

        // If already answered, skip onboarding.
        if (user && existingSource) {
          window.location.href = "/app";
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, debug]);

  const updateUrlStep = (next: Step) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("step", next);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const goSetup = () => {
    setStep("setup");
    updateUrlStep("setup");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const goPersonalize = () => {
    setStep("personalize");
    updateUrlStep("personalize");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  React.useEffect(() => {
    if (step !== "setup") return;
    let cancelled = false;
    (async () => {
      try {
        setPricingReady(false);
        try {
          const cached = sessionStorage.getItem("ee_currency");
          if (cached === "EUR" || cached === "USD") {
            if (!cancelled) setCurrency(cached as Currency);
            if (!cancelled) setPricingReady(true);
            return;
          }
        } catch {}

        try {
          const server = await fetch("/api/ip-region", { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
          if (server?.currency === "EUR" || server?.currency === "USD") {
            if (!cancelled) setCurrency(server.currency);
            try { sessionStorage.setItem("ee_currency", server.currency); } catch {}
            if (!cancelled) setPricingReady(true);
            return;
          }
        } catch {}

        const next = detectCurrencyFromLocale();
        if (!cancelled) setCurrency(next);
        try { sessionStorage.setItem("ee_currency", next); } catch {}
        if (!cancelled) setPricingReady(true);
      } catch {
        if (!cancelled) {
          setCurrency("USD");
          setPricingReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const getCurrentUser = async () => {
    try {
      const u = await supabase.auth.getUser().catch(() => null as any);
      const user = u?.data?.user || null;
      if (user) return user;
    } catch {}
    try {
      const s = await supabase.auth.getSession().catch(() => null as any);
      return s?.data?.session?.user || null;
    } catch {
      return null;
    }
  };

  const startStripeCheckout = async (tier: "starter" | "pro") => {
    if (saving) return;
    setSaving(true);
    setCheckoutTier(tier);
    try {
      // Mark that a checkout was initiated so confetti can fire even if success URL loses `checkout=success`.
      try {
        localStorage.setItem("__ee_pending_checkout", JSON.stringify({ at: Date.now(), tier, billing, currency }));
      } catch {}

      const user = await getCurrentUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Optional: if we have an authenticated user, prefill email + attach reference id
      if (user?.id) headers["x-user-id"] = user.id;
      if (user?.email) headers["x-user-email"] = user.email;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ tier, billing, currency }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (json?.url) {
        window.location.href = String(json.url);
        return;
      }
      throw new Error(String(json?.message || json?.error || "Checkout failed"));
    } catch (e: any) {
      setCheckoutTier(null);
      try {
        toast({ title: "Checkout error", description: String(e?.message || "Please try again."), variant: "destructive" });
      } catch {}
    } finally {
      setSaving(false);
      setCheckoutTier(null);
    }
  };

  const onNext = async () => {
    if (saving) return;
    if (!workType || !source) {
      try {
        toast({ title: "Missing info", description: "Please pick your work and where you heard about us.", variant: "destructive" });
      } catch {}
      return;
    }
    if (source === "other" && !String(sourceOther || "").trim()) {
      try {
        toast({ title: "Missing info", description: "Please specify the marketing channel.", variant: "destructive" });
      } catch {}
      return;
    }
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      let paid: boolean | null = null;
      let plan: string | null = null;
      try {
        const r = await fetch("/api/stripe/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        const j = await r.json().catch(() => ({} as any));
        if (j && typeof j.active === "boolean") {
          paid = Boolean(j.active);
          plan = j.plan ? String(j.plan) : null;
        }
      } catch {}

      if (!debug) {
        const { error } = await supabase.auth.updateUser({
          data: {
            acquisition_source: source,
            acquisition_source_set_at: nowIso,
            acquisition_source_context: "signup_email_verify",
            ...(source === "other" ? { acquisition_source_other: String(sourceOther || "").trim().slice(0, 80) } : {}),
            acquisition_work_type: workType,
            acquisition_onboarding_completed_at: nowIso,
            acquisition_paid_at_answer: paid,
            acquisition_plan_at_answer: plan,
          },
        } as any);
        if (error) throw error;
      }

      try {
        postGoal("getting_started_source_set", {
          source,
          ...(source === "other" && String(sourceOther || "").trim() ? { source_other: String(sourceOther || "").trim().slice(0, 80) } : {}),
          ...(workType ? { work_type: workType } : {}),
          ...(email ? { email } : {}),
          ...(userId ? { user_id: userId } : {}),
          ...(paid !== null ? { paid: String(paid) } : {}),
          ...(plan ? { plan } : {}),
          ...(debug ? { debug: "1" } : {}),
        });
      } catch {}

      goSetup();
    } catch (e: any) {
      try {
        toast({ title: "Erreur", description: String(e?.message || "Impossible d’enregistrer pour le moment."), variant: "destructive" });
      } catch {}
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center">
        <div className="text-gray-300 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header aligned like LP navbar */}
      <div className="w-full mx-auto px-0 relative border-b border-white/10 bg-black/90 backdrop-blur-sm">
        <div className="w-full px-0">
          <div className="grid grid-cols-[auto_1fr] items-center h-14 md:h-16">
            {/* Logo (flush-left like LP navbar) */}
            <div className="flex items-center justify-start space-x-3 pl-2 md:pl-3">
              <Link href="/app" className="inline-flex items-center">
                <Image
                  src="/ecomefficiency.png"
                  alt="Ecom Efficiency"
                  width={160}
                  height={64}
                  className="h-14 w-auto object-contain mix-blend-screen"
                  priority
                />
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center justify-end pr-2 md:pr-3">
              {debug ? <div className="text-[11px] text-gray-500">Debug mode</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className={`w-full mx-auto ${step === "setup" ? "max-w-6xl" : "max-w-2xl"}`}>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-6 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500/70" />
            <span>Register</span>
          </div>
          <div className="h-px w-10 bg-white/10" />
          <div className={`flex items-center gap-2 ${step === "personalize" ? "text-white" : "text-gray-300"}`}>
            <span className={`w-2 h-2 rounded-full ${step === "personalize" ? "bg-purple-500" : "bg-green-500/70"}`} />
            <span>Personalize</span>
          </div>
          <div className="h-px w-10 bg-white/10" />
          <div className={`flex items-center gap-2 ${step === "setup" ? "text-white" : "text-gray-500"}`}>
            <span className={`w-2 h-2 rounded-full ${step === "setup" ? "bg-purple-500" : "bg-white/10"}`} />
            <span>Setup</span>
          </div>
        </div>

        {step === "personalize" ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl md:text-2xl font-semibold">Personalize your Experience</h1>
              <p className="text-gray-400 mt-2 text-sm">Quick question so we can better understand what’s working.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-3">What best describes your work? *</div>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {WORK_TYPES.map((t) => {
                    const selected = workType === t.id;
                    const disabled = alreadySet || saving;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setWorkType(t.id)}
                        className={[
                          "px-4 py-2 rounded-lg border text-sm",
                          "transition-all duration-200 ease-out",
                          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                          selected
                            ? "border-purple-400/60 bg-purple-500/10 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
                            : "border-white/15 bg-black/30 text-gray-200 hover:bg-black/45 hover:border-white/30 hover:-translate-y-0.5",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="text-sm text-gray-400 mb-4">Where did you hear about us? *</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SOURCES.map((s) => {
                    const selected = source === s.id;
                    const disabled = alreadySet || saving || !workType;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSource(s.id);
                          if (s.id !== "other") setSourceOther("");
                        }}
                        className={[
                          "px-4 py-2 rounded-lg border text-sm",
                          "transition-all duration-200 ease-out",
                          disabled
                            ? "border-white/10 bg-black/20 text-gray-500 cursor-not-allowed"
                            : selected
                              ? "border-purple-400/60 bg-purple-500/10 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.25)] cursor-pointer"
                              : "border-white/15 bg-black/30 hover:bg-black/45 hover:border-white/30 hover:-translate-y-0.5 text-gray-200 cursor-pointer",
                        ].join(" ")}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {source === "other" ? (
                  <div className="mt-4 max-w-md mx-auto">
                    <label className="block text-left text-xs text-gray-400 mb-2">Please specify</label>
                    <input
                      value={sourceOther}
                      onChange={(e) => setSourceOther(e.target.value)}
                      placeholder="Example: newsletter, partner, community…"
                      className="w-full h-11 rounded-lg border border-white/15 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                      maxLength={80}
                      disabled={alreadySet || saving}
                    />
                    <div className="mt-2 text-[11px] text-gray-500">We’ll use this only for internal attribution.</div>
                  </div>
                ) : null}

                <div className="mt-10 flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    className={[
                      "w-full max-w-sm h-11 rounded-lg text-sm font-semibold",
                      "bg-[#9541e0] text-white",
                      "hover:bg-[#9541e0] active:bg-[#9541e0]",
                      "transition-none",
                      (saving || alreadySet || !workType || !source) ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                    disabled={saving || alreadySet || !workType || !source}
                    onClick={onNext}
                  >
                    {saving ? "Saving…" : "Next"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md text-xs text-gray-500 bg-transparent transition-colors duration-200 ease-out hover:bg-white/5 hover:text-gray-300"
                    onClick={() => (window.location.href = "/app")}
                  >
                    Skip
                  </button>
                </div>

                {debug ? <div className="mt-3 text-[11px] text-gray-500">Debug mode enabled</div> : null}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="relative">
              {/* subtle dark violet glow behind the panel (like /sign-in) */}
              <div
                className="pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(88,28,135,0.35),transparent_65%)] blur-3xl opacity-60"
                aria-hidden
              />

              <div className="relative rounded-2xl border border-white/10 bg-[#0d0e12] p-5 md:p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-semibold">Choose a plan</h2>
                <p className="text-gray-400 mt-2 text-sm">Subscribe to unlock the tools.</p>
              </div>

              <div className="flex items-center justify-center mb-6">
                {/* Match the pricing toggle style (compact) */}
                <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40 overflow-visible">
                  <button
                    type="button"
                    onClick={() => setBilling("monthly")}
                    className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${
                      billing === "monthly" ? "bg-purple-500/20 text-purple-200" : "text-gray-300 hover:bg-purple-500/10"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilling("yearly")}
                    className={`relative px-5 pr-8 py-2 text-sm rounded-full transition-colors cursor-pointer select-none ${
                      billing === "yearly" ? "bg-purple-500/20 text-purple-200" : "text-gray-300 hover:bg-purple-500/10"
                    }`}
                  >
                    Annual
                    <span className="pointer-events-none absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 z-20 text-[10px] px-2 py-0.5 rounded-full bg-[#0d0e12] text-[#ab63ff] border border-purple-500/40 shadow-[0_8px_26px_rgba(0,0,0,0.55)] whitespace-nowrap">
                      -40%
                    </span>
                  </button>
                </div>
              </div>

              {!pricingReady ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                </div>
              ) : (
                <>
                  <div className="relative max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6 flex flex-col">
                      <div className="text-white text-2xl font-semibold mb-1">Starter</div>
                      <div className="text-sm text-gray-200/90 mb-1">Essential tools for lean eCommerce growth</div>
                      <div className="text-xs text-gray-400 mb-5">Access to 40 Ecom tools</div>

                      <div className="flex items-end gap-2 mb-1">
                        <div
                          className={`text-5xl font-extrabold tabular-nums ${
                            billing === "yearly" ? "text-[#ab63ff]" : "text-white"
                          }`}
                        >
                          {billing === "yearly" ? formatPrice(11.99, currency) : formatPrice(19.99, currency)}
                        </div>
                        {billing === "yearly" ? (
                          <span className="mb-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-[#ab63ff] border border-purple-500/30">
                            -40%
                          </span>
                        ) : null}
                        {billing === "yearly" ? (
                          <div className="text-sm text-gray-500 line-through mb-2 tabular-nums">
                            {formatPrice(19.99, currency)}
                          </div>
                        ) : null}
                        <div className="text-sm text-gray-400 mb-2">/mo</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-5">{billing === "yearly" ? "Billed annually • Cancel anytime" : "Cancel anytime"}</div>

                      {/* Foreplay-like: primary CTA first */}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startStripeCheckout("starter")}
                        className={`group w-full h-12 rounded-full text-sm font-semibold cursor-pointer bg-[#2b2b2f]/70 text-white/90 border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-[rgba(158,76,252,0.22)] hover:text-white hover:shadow-[0_8px_36px_rgba(158,76,252,0.34),0_0_0_1px_rgba(255,255,255,0.06)] hover:brightness-110 transition-[box-shadow,filter,background-color] ${saving ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                      >
                        {saving && checkoutTier === "starter" ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-b-transparent animate-spin" />
                            Redirecting…
                          </span>
                        ) : (
                          <span className="transition-colors text-white group-hover:text-white">Get Started</span>
                        )}
                      </button>
                      <div className="my-5 h-px bg-white/10" />

                      <div className="mb-5 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2">
                        <div className="space-y-1.5">
                          {COMMON_CREDIT_BULLETS.map((b) => (
                            <div key={b} className="flex items-center gap-2 text-xs text-purple-200">
                              <Check className="w-4 h-4 text-purple-300 drop-shadow-[0_0_12px_rgba(171,99,255,0.55)]" />
                              <span className="font-semibold">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Same "tools" bullets as PricingSection */}
                      <div className="mt-0 mb-6 space-y-2">
                        <button
                          type="button"
                          onClick={() => setStarterExpanded((s) => !s)}
                          className="w-full flex items-center justify-between text-left text-gray-300 px-0 py-1 hover:text-white transition cursor-pointer select-none"
                        >
                          <span className="flex items-center gap-2 text-xs">
                            <Check className="w-4 h-4 text-purple-400" />
                            40 Ecom tools
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${starterExpanded ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${starterExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>
                          <ul className="mt-1 ml-1 space-y-2 text-xs">
                            <li>
                              <div className="text-gray-300 mb-1">4 SPY tools</div>
                              <ul className="ml-3 space-y-1">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Dropship.io</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Winning Hunter</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Shophunter</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Helium 10</span></li>
                              </ul>
                            </li>
                            <li>
                              <div className="text-gray-300 mb-1">3 AI tools</div>
                              <ul className="ml-3 space-y-1">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>GPT</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Midjourney</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>SendShort</span></li>
                              </ul>
                            </li>
                            <li>
                              <div className="text-gray-300 mb-1">3 Productivity & Content</div>
                              <ul className="ml-3 space-y-1">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Brain.fm</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Capcut</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Canva</span></li>
                              </ul>
                            </li>
                            <li>
                              <div className="text-gray-300 mb-1">+30 SEO tools</div>
                              <ul className="ml-3 space-y-1">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Semrush</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Ubersuggest</span></li>
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Similarweb</span></li>
                                <li>
                                  <a href="/tools/seo" className="text-xs text-purple-300 hover:text-purple-200 underline decoration-purple-500/40">… see the other tools →</a>
                                </li>
                              </ul>
                            </li>
                          </ul>
                        </div>
                        <ul className="space-y-1">
                          {PRO_EXTRAS.map((t) => (
                            <li key={t} className="flex items-center gap-2 text-gray-500 text-xs">
                              <X className="w-4 h-4 text-red-400" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-auto" />
                    </div>

                    <div className="rounded-2xl border border-purple-500/25 bg-[#0d0e12] p-6 flex flex-col shadow-[0_0_0_1px_rgba(139,92,246,0.12)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white text-2xl font-semibold mb-1">Pro</div>
                          <div className="text-sm text-gray-200/90 mb-1">Your unfair advantage in speed &amp; efficiency</div>
                          <div className="text-xs text-gray-400 mb-5">Access to +50 Ecom tools</div>
                        </div>
                        <div className="text-[10px] px-2 py-1 rounded-full bg-purple-500/80 text-white border border-white/10 font-semibold">Most Popular</div>
                      </div>

                      <div className="flex items-end gap-2 mb-1">
                        <div
                          className={`text-5xl font-extrabold tabular-nums ${
                            billing === "yearly" ? "text-[#ab63ff]" : "text-white"
                          }`}
                        >
                          {billing === "yearly" ? formatPrice(17.99, currency) : formatPrice(29.99, currency)}
                        </div>
                        {billing === "yearly" ? (
                          <span className="mb-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-[#ab63ff] border border-purple-500/30">
                            -40%
                          </span>
                        ) : null}
                        {billing === "yearly" ? (
                          <div className="text-sm text-gray-500 line-through mb-2 tabular-nums">
                            {formatPrice(29.99, currency)}
                          </div>
                        ) : null}
                        <div className="text-sm text-gray-400 mb-2">/mo</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-5">{billing === "yearly" ? "Billed annually • Cancel anytime" : "Cancel anytime"}</div>

                      {/* Foreplay-like: primary CTA first */}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startStripeCheckout("pro")}
                        className={`w-full h-12 rounded-full text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] hover:shadow-[0_6px_28px_rgba(149,65,224,0.6)] hover:brightness-110 transition-[box-shadow,filter] ${saving ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                      >
                        {saving && checkoutTier === "pro" ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-b-transparent animate-spin" />
                            Redirecting…
                          </span>
                        ) : (
                          "Get Started"
                        )}
                      </button>
                      <div className="my-5 h-px bg-white/10" />

                      <div className="mb-5 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2">
                        <div className="space-y-1.5">
                          {COMMON_CREDIT_BULLETS.map((b) => (
                            <div key={b} className="flex items-center gap-2 text-xs text-purple-200">
                              <Check className="w-4 h-4 text-purple-300 drop-shadow-[0_0_12px_rgba(171,99,255,0.55)]" />
                              <span className="font-semibold">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Same "tools" bullets as PricingSection */}
                      <div className="mt-0 mb-6 space-y-1.5 text-gray-300 text-sm">
                        <div className="flex items-center gap-2 text-xs">
                          <Check className="w-4 h-4 text-purple-400" />
                          <span>Starter tools, plus:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {PRO_EXTRAS.map((t) => (
                            <li key={t} className="flex items-center gap-2 text-xs text-gray-200">
                              <Check className="w-4 h-4 text-purple-400" />
                              <span>{t}</span>
                              {t === "Higgsfield" ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white/95 border border-[#a78bfa]/40">NEW</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-auto" />
                    </div>
                    </div>
                  </div>

                  <div className="mt-6 max-w-5xl mx-auto rounded-2xl border border-white/10 bg-black/15 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">COMMUNITY</div>
                      <div className="text-white font-semibold">Custom / White-label</div>
                      <div className="text-gray-400 text-sm mt-1">Group pricing, custom domain, your Stripe account.</div>
                      <ul className="mt-3 space-y-2">
                        {COMMUNITY_FEATURES.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                            <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                        Perfect for Discord communities, agencies, and creators with an audience.
                      </div>
                    </div>
                    <a
                      href="https://partners.ecomefficiency.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center justify-center px-7 h-12 min-w-[180px] rounded-full text-base font-semibold border border-white/10 bg-[#2b2b2f]/70 text-white/90 hover:bg-white/10 transition-colors"
                    >
                      Get Started
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

