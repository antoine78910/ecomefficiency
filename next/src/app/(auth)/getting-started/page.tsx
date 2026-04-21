"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, X } from "lucide-react";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";
import { postGoal } from "@/lib/analytics";
import { trackFirstPromoterReferral } from "@/lib/firstpromoterReferral";
import { BillingCyberSwitch } from "@/components/BillingCyberSwitch";

const TRUSTPILOT_REVIEW_URL = "https://www.trustpilot.com/review/ecomefficiency.com";
const DISCORD_COMMUNITY_URL = "https://discord.gg/7UgABk3jKJ";

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
  "Winning Hunter",
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

const PRO_CREDIT_BULLETS = [
  "Pipiads",
  "ElevenLabs",
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

/** Compact Discord CTA — navbar droite, uniquement sur cette page (getting-started). */
function GettingStartedDiscordNavButton() {
  return (
    <a
      href={DISCORD_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-1.5 sm:gap-2.5 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-zinc-950/60 to-black/80 backdrop-blur-xl px-2 py-1.5 sm:px-3 sm:py-2 shadow-2xl hover:shadow-indigo-500/30 hover:border-indigo-400/60 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-500 ease-out overflow-hidden w-full max-w-full sm:max-w-[280px] sm:w-auto"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-indigo-400/20 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 min-w-0 w-full">
        <div className="shrink-0 p-1 sm:p-2 rounded-lg bg-gradient-to-br from-indigo-500/30 to-indigo-600/10 backdrop-blur-sm group-hover:from-indigo-400/40 group-hover:to-indigo-500/20 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current text-indigo-400 group-hover:text-indigo-300 transition-all duration-300 group-hover:scale-105" aria-hidden>
            <path d="M524.531 69.836a1.5 1.5 0 0 0-.764-.7A485.065 485.065 0 0 0 404.081 32.03a1.816 1.816 0 0 0-1.923.91 337.461 337.461 0 0 0-14.9 30.6 447.848 447.848 0 0 0-134.426 0 309.541 309.541 0 0 0-15.135-30.6 1.89 1.89 0 0 0-1.924-.91 483.689 483.689 0 0 0-119.688 37.107 1.712 1.712 0 0 0-.788.676C39.068 183.651 18.186 294.69 28.43 404.354a2.016 2.016 0 0 0 .765 1.375 487.666 487.666 0 0 0 146.825 74.189 1.9 1.9 0 0 0 2.063-.676A348.2 348.2 0 0 0 208.12 430.4a1.86 1.86 0 0 0-1.019-2.588 321.173 321.173 0 0 1-45.868-21.853 1.885 1.885 0 0 1-.185-3.126 251.047 251.047 0 0 0 9.109-7.137 1.819 1.819 0 0 1 1.9-.256c96.229 43.917 200.41 43.917 295.5 0a1.812 1.812 0 0 1 1.924.233 234.533 234.533 0 0 0 9.132 7.16 1.884 1.884 0 0 1-.162 3.126 301.407 301.407 0 0 1-45.89 21.83 1.875 1.875 0 0 0-1 2.611 391.055 391.055 0 0 0 30.014 48.815 1.864 1.864 0 0 0 2.063.7A486.048 486.048 0 0 0 610.7 405.729a1.882 1.882 0 0 0 .765-1.352c12.264-126.783-20.532-236.912-86.934-334.541zM222.491 337.58c-28.972 0-52.844-26.587-52.844-59.239s23.409-59.241 52.844-59.241c29.665 0 53.306 26.82 52.843 59.239 0 32.654-23.41 59.241-52.843 59.241zm195.38 0c-28.971 0-52.843-26.587-52.843-59.239s23.409-59.241 52.843-59.241c29.667 0 53.307 26.820 52.844 59.239 0 32.654-23.177 59.241-52.844 59.241z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-indigo-400 font-bold text-xs sm:text-sm leading-tight group-hover:text-indigo-300 transition-colors duration-300">
            Discord
          </p>
          <p className="text-indigo-300/60 text-[10px] sm:text-xs leading-snug whitespace-normal group-hover:text-indigo-200/80 transition-colors duration-300">
            Join +3000 members
          </p>
        </div>
        <div className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 hidden sm:block">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" aria-hidden>
            <path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </a>
  );
}

export default function GettingStartedPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [checkoutTier, setCheckoutTier] = React.useState<"starter" | "pro" | null>(null);
  const [workType, setWorkType] = React.useState<WorkType | null>(null);
  const [workTypeOther, setWorkTypeOther] = React.useState<string>("");
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
  const [seoModalOpen, setSeoModalOpen] = React.useState(false);

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

        // FirstPromoter referral: attribute signup when user lands on get-started (after OAuth or email verify).
        if (user?.email && typeof window !== "undefined") {
          try {
            trackFirstPromoterReferral(String(user.email));
          } catch {}
        }

        // Only redirect to /app if they have completed setup (paid). Otherwise stay on onboarding to finish.
        if (user && existingSource) {
          try {
            const res = await fetch("/api/stripe/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email ?? "" }),
            });
            const data = await res.json().catch(() => ({}));
            if (data?.ok && data?.active && (data?.plan === "starter" || data?.plan === "pro")) {
              window.location.href = "/app";
              return;
            }
          } catch {
            // ignore
          }
          // Has acquisition_source but no paid plan: show setup step so they can pay
          if (!cancelled) {
            setStep("setup");
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("step", "setup");
              window.history.replaceState({}, "", url.toString());
            } catch {}
          }
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

  React.useEffect(() => {
    try { postGoal('view_getting_started'); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try { postGoal('view_getting_started_step', { step: String(step) }); } catch {}
  }, [step]);

  React.useEffect(() => {
    if (!seoModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSeoModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [seoModalOpen]);

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
    if (workType === "other" && !String(workTypeOther || "").trim()) {
      try {
        toast({ title: "Missing info", description: "Please specify your work type.", variant: "destructive" });
      } catch {}
      return;
    }
    if (source === "other" && !String(sourceOther || "").trim()) {
      try {
        toast({ title: "Missing info", description: "Please specify the marketing channel.", variant: "destructive" });
      } catch {}
      return;
    }
    // Funnel tracking: clicked "Next" after answering the 2 questions
    try {
      postGoal('click_getting_started_next', {
        work_type: String(workType),
        source: String(source),
      });
    } catch {}
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
            ...(workType === "other" ? { acquisition_work_type_other: String(workTypeOther || "").trim().slice(0, 80) } : {}),
            acquisition_onboarding_completed_at: nowIso,
            acquisition_paid_at_answer: paid,
            acquisition_plan_at_answer: plan,
          },
        } as any);
        if (error) throw error;
      }

      // Tracking disabled: we only keep review-related goals in DataFast.

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
    <>
    <div className={`bg-black text-white ${step === "setup" ? "min-h-0" : "min-h-screen"}`}>
      {/* Header aligned like LP navbar */}
      <div className="w-full mx-auto px-0 relative border-b border-white/10 bg-black/90 backdrop-blur-sm">
        <div className="w-full px-0">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 h-12 sm:h-14 md:h-16">
            {/* Logo — plus petit sur mobile pour laisser la place au CTA Discord */}
            <div className="flex items-center justify-start pl-2 md:pl-3 min-w-0">
              <Link href="/app" className="inline-flex items-center shrink-0">
                <Image
                  src="/ecomefficiency.png"
                  alt="Ecom Efficiency"
                  width={160}
                  height={64}
                  className="h-9 w-auto sm:h-11 md:h-12 object-contain mix-blend-screen"
                  priority
                />
              </Link>
            </div>

            {/* Right side — Discord uniquement sur getting-started */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 pr-2 md:pr-3 min-w-0">
              <GettingStartedDiscordNavButton />
              {debug ? <div className="text-[11px] text-gray-500 shrink-0 hidden sm:block">Debug</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className={`px-4 overflow-visible ${step === "setup" ? "pt-6 pb-2" : "py-6"}`}>
        <div className={`w-full mx-auto overflow-visible ${step === "setup" ? "max-w-6xl" : "max-w-2xl"}`}>
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
              <p className="text-gray-400 mt-2 text-sm">Let's start with what brought you here — tell us a bit about why you're using Ecom Efficiency and what you're hoping to get out of it.</p>
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
                        onClick={() => {
                          setWorkType(t.id);
                          if (t.id !== "other") setWorkTypeOther("");
                        }}
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

                {workType === "other" ? (
                  <div className="mt-2 mb-8 max-w-md mx-auto">
                    <label className="block text-left text-xs text-gray-400 mb-2">Please specify your work</label>
                    <input
                      value={workTypeOther}
                      onChange={(e) => setWorkTypeOther(e.target.value)}
                      placeholder="Example: creator, affiliate, media buyer…"
                      className="w-full h-11 rounded-lg border border-white/15 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                      maxLength={80}
                      disabled={alreadySet || saving}
                    />
                  </div>
                ) : null}

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

                <div className="mt-10 flex flex-col items-center justify-center">
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
                </div>

                {debug ? <div className="mt-3 text-[11px] text-gray-500">Debug mode enabled</div> : null}
              </div>
            </div>
          </>
        ) : (
          <div className="overflow-x-hidden overflow-y-visible">
            {/* Clip gradient at bottom so no purple band appears below content */}
            <div className="relative isolate overflow-y-hidden overflow-x-hidden">
              {/* Violet glow behind panel only; does not extend below the block */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[140%] w-[185%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_85%_70%_at_50%_55%,rgba(128,56,194,0.44)_0%,rgba(128,56,194,0.20)_38%,rgba(128,56,194,0.07)_55%,transparent_75%)] opacity-90"
                aria-hidden
              />

              <div className="relative z-10 rounded-2xl border border-white/10 bg-[#0d0e12] p-5 md:p-6">
              <div className="mb-0 -mt-0.5">
                <Link
                  href={TRUSTPILOT_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full max-w-[190px] sm:max-w-[214px] md:max-w-[240px] mx-auto leading-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/trustpilot-setup-banner.png"
                    alt="Trustpilot — Excellent"
                    width={2500}
                    height={500}
                    className="block w-full h-auto mix-blend-lighten"
                    loading="eager"
                    decoding="async"
                  />
                </Link>
              </div>
              <div className="text-center mb-4 mt-1">
                <h2 className="text-xl md:text-2xl font-semibold">Choose a plan</h2>
                <p className="text-gray-400 mt-1.5 text-sm">Subscribe to unlock the tools.</p>
              </div>

              <div className="flex items-center justify-center mb-6 px-2">
                <BillingCyberSwitch value={billing} onChange={setBilling} />
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

                      {billing === "monthly" ? (
                        <div className="flex items-end gap-2 mb-1">
                          <div className="text-5xl font-extrabold tabular-nums leading-none text-white">
                            {formatPrice(19.99, currency)}
                          </div>
                          <div className="text-sm text-gray-400 mb-2">/mo</div>
                        </div>
                      ) : (
                        <div className="mb-1 flex flex-col gap-1 md:flex-row md:items-end md:gap-2">
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                            <div className="text-5xl font-extrabold tabular-nums leading-none text-[#ab63ff]">
                              {formatPrice(11.99, currency)}
                            </div>
                            <span className="mb-0.5 md:mb-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-[#ab63ff] border border-purple-500/30 shrink-0">
                              -40%
                            </span>
                            <div className="hidden md:block text-sm text-gray-500 line-through mb-2 tabular-nums shrink-0">
                              {formatPrice(19.99, currency)}
                            </div>
                            <div className="hidden md:block text-sm text-gray-400 mb-2">/mo</div>
                          </div>
                          <div className="flex items-baseline gap-1.5 md:hidden">
                            <span className="text-sm text-gray-500 line-through tabular-nums">
                              {formatPrice(19.99, currency)}
                            </span>
                            <span className="text-sm text-gray-400">/mo</span>
                          </div>
                        </div>
                      )}
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
                              <div className="text-gray-300 mb-1">3 SPY tools</div>
                              <ul className="ml-3 space-y-1">
                                <li className="flex items-center gap-2 text-gray-300"><Check className="w-3.5 h-3.5 text-purple-400" /><span>Dropship.io</span></li>
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
                                  <button
                                    type="button"
                                    onClick={() => setSeoModalOpen(true)}
                                    className="text-xs text-purple-300 hover:text-purple-200 underline decoration-purple-500/40 cursor-pointer bg-transparent border-none p-0"
                                  >
                                    … see the other tools →
                                  </button>
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

                    <div className="group/pro relative overflow-visible rounded-2xl border border-purple-500/25 bg-[#0d0e12] p-6 flex flex-col shadow-[0_0_0_1px_rgba(139,92,246,0.12)]">
                      <div
                        className="absolute -top-2 right-3 sm:right-4 z-[2] px-3 py-1 sm:px-3.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold font-mono uppercase tracking-wider text-[rgba(245,243,255,0.98)] bg-[rgba(149,65,224,0.25)] border border-[rgba(171,99,255,0.55)] shadow-[0_0_12px_rgba(171,99,255,0.25),0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm whitespace-nowrap transition-all duration-200 ease-out group-hover/pro:border-[rgba(186,147,255,0.65)] group-hover/pro:bg-[rgba(149,65,224,0.32)] group-hover/pro:shadow-[0_0_18px_rgba(171,99,255,0.35),0_2px_8px_rgba(0,0,0,0.28)]"
                        aria-hidden
                      >
                        Most popular
                      </div>
                      <div>
                        <div className="text-white text-2xl font-semibold mb-1 pr-[5.25rem] sm:pr-24">Pro</div>
                        <div className="text-sm text-gray-200/90 mb-1">Your unfair advantage in speed &amp; efficiency</div>
                        <div className="text-xs text-gray-400 mb-5">Access to +50 Ecom tools</div>
                      </div>

                      {billing === "monthly" ? (
                        <div className="flex items-end gap-2 mb-1">
                          <div className="text-5xl font-extrabold tabular-nums leading-none text-white">
                            {formatPrice(29.99, currency)}
                          </div>
                          <div className="text-sm text-gray-400 mb-2">/mo</div>
                        </div>
                      ) : (
                        <div className="mb-1 flex flex-col gap-1 md:flex-row md:items-end md:gap-2">
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                            <div className="text-5xl font-extrabold tabular-nums leading-none text-[#ab63ff]">
                              {formatPrice(17.99, currency)}
                            </div>
                            <span className="mb-0.5 md:mb-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-[#ab63ff] border border-purple-500/30 shrink-0">
                              -40%
                            </span>
                            <div className="hidden md:block text-sm text-gray-500 line-through mb-2 tabular-nums shrink-0">
                              {formatPrice(29.99, currency)}
                            </div>
                            <div className="hidden md:block text-sm text-gray-400 mb-2">/mo</div>
                          </div>
                          <div className="flex items-baseline gap-1.5 md:hidden">
                            <span className="text-sm text-gray-500 line-through tabular-nums">
                              {formatPrice(29.99, currency)}
                            </span>
                            <span className="text-sm text-gray-400">/mo</span>
                          </div>
                        </div>
                      )}
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

                      <div className="mt-0 mb-6 space-y-1.5 text-gray-300 text-sm">
                        <div className="flex items-center gap-2 text-xs">
                          <Check className="w-4 h-4 text-purple-400" />
                          <span>Starter tools, plus:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {[...PRO_EXTRAS, ...PRO_CREDIT_BULLETS].map((t) => (
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

    {seoModalOpen && (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setSeoModalOpen(false)}
          className="absolute inset-0 cursor-pointer"
        />
        <div
          className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-3xl max-h-[80vh] overflow-auto mx-4"
          role="dialog"
          aria-modal="true"
          aria-label="+30 SEO Tools"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">+30 SEO Tools</h3>
            <button type="button" onClick={() => setSeoModalOpen(false)} className="text-white/70 hover:text-white">✕</button>
          </div>
          <p className="text-gray-400 text-sm mb-3">Included tools with short descriptions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seoToolsCatalog.map((t) => (
              <div key={t.slug} className="rounded-lg border border-white/10 p-3 bg-black/30">
                <div className="text-white font-medium text-sm">{t.name}</div>
                <div className="text-gray-400 text-xs">{t.shortDescription}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

