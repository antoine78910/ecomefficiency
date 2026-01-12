"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type CreatorType = "trainer_coach" | "agency" | "ecom_owner" | "community" | "other" | "";
type AudienceLevel = "beginners" | "intermediate" | "advanced" | "";
type AudienceMainChannel = "discord" | "formation" | "newsletter" | "social" | "existing_clients" | "";
type OfferType = "included" | "upsell" | "separate_subscription" | "";

type FormState = {
  slug: string;
  adminEmail: string;
  creatorType: CreatorType;
  creatorTypeOther: string;
  audienceLevel: AudienceLevel;
  audienceMainChannels: AudienceMainChannel[];
  launchOnboardCount: string;
  offerType: OfferType;
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
  const [accountEmail, setAccountEmail] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState(0);

  const [form, setForm] = React.useState<FormState>(() => ({
    slug: "",
    adminEmail: "",
    creatorType: "",
    creatorTypeOther: "",
    audienceLevel: "",
    audienceMainChannels: [],
    launchOnboardCount: "",
    offerType: "",
  }));

  // Prefill from URL (signup flow can pass email)
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const email = url.searchParams.get("email");
      if (email && isEmail(email)) {
        setForm((s) => ({ ...s, adminEmail: s.adminEmail || email }));
      }
    } catch {}
  }, []);

  // Prefill from session if available
  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email || "";
        setAccountEmail(email || "");
        if (email && isEmail(email)) {
          setForm((s) => ({ ...s, adminEmail: s.adminEmail || email }));
        }
      } catch {}
    })();
  }, [ready]);

  // Keep account badge updated (signin/out)
  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user?.email || "");
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

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
      { key: "creatorType", title: "What best describes you?", help: "We use this to tailor the template & onboarding.", required: true },
      { key: "audienceLevel", title: "Your audience is mainly:", help: "Choose one.", required: true },
      { key: "audienceMainChannel", title: "Where is your audience mainly?", help: "Choose one.", required: true },
      { key: "launchOnboardCount", title: "How many people can you onboard at launch?", help: "Rough estimate.", required: true },
      { key: "offerType", title: "Do you want it to be:", help: "Choose one.", required: true },
      { key: "slug", title: "URL slug", help: "Used for your default URL (e.g. ecomwolf → partners.ecomefficiency.com/ecomwolf)", required: true },
      { key: "adminEmail", title: "Admin email", help: "We’ll use it to contact you + give admin access.", required: true },
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
    switch (current.key) {
      case "creatorType":
        return Boolean(form.creatorType) && (form.creatorType !== "other" || form.creatorTypeOther.trim().length > 1);
      case "audienceLevel":
        return form.audienceLevel === "beginners" || form.audienceLevel === "intermediate" || form.audienceLevel === "advanced";
      case "audienceMainChannel":
        return Array.isArray(form.audienceMainChannels) && form.audienceMainChannels.length > 0;
      case "launchOnboardCount": {
        const n = Number(String(form.launchOnboardCount || "").replace(",", "."));
        return Number.isFinite(n) && n > 0;
      }
      case "offerType":
        return form.offerType === "included" || form.offerType === "upsell" || form.offerType === "separate_subscription";
      case "slug":
        return /^[a-z0-9-]{2,40}$/.test(slug);
      case "adminEmail":
        return isEmail(form.adminEmail);
      case "review":
        return true;
      default:
        return true;
    }
  }, [current.key, form]);

  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const creatorLabel =
        form.creatorType === "trainer_coach"
          ? "trainer/coach"
          : form.creatorType === "agency"
          ? "agency (e-commerce, ads, SEO, etc.)"
          : form.creatorType === "ecom_owner"
          ? "dropshipper/e-commerce owner"
          : form.creatorType === "community"
          ? "media/community/Discord"
          : form.creatorType === "other"
          ? `Other: ${form.creatorTypeOther.trim()}`
          : "";

      const channelLabel = (c: AudienceMainChannel) =>
        c === "discord"
          ? "Discord"
          : c === "formation"
          ? "formation"
          : c === "newsletter"
          ? "newsletter"
          : c === "social"
          ? "Instagram / TikTok / YouTube"
          : c === "existing_clients"
          ? "clients existants"
          : "";
      const channelLabels = (form.audienceMainChannels || []).map(channelLabel).filter(Boolean);

      const payload = {
        slug: cleanSlug(form.slug),
        adminEmail: form.adminEmail.trim(),
        onboarding: {
          creatorType: form.creatorType,
          creatorTypeLabel: creatorLabel,
          audienceLevel: form.audienceLevel,
          audienceMainChannels: form.audienceMainChannels,
          audienceMainChannelLabels: channelLabels,
          launchOnboardCount: Number(String(form.launchOnboardCount || "").replace(",", ".")),
          offerType: form.offerType,
        },
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
        if (payload.slug) localStorage.setItem("partners_current_slug", payload.slug);
      } catch {}
      const qs = `?slug=${encodeURIComponent(payload.slug)}&submitted=1`;
      window.location.href = `/dashboard${qs}`;
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
          <div className="flex items-center gap-3">
            {accountEmail ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-200">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400/80" />
                <span className="truncate max-w-[220px]">{accountEmail}</span>
              </div>
            ) : null}
            <Link href="/signin" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
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
            {current.key === "creatorType" && (
              <div className="space-y-3">
                {[
                  ["trainer_coach", "🎓 trainer/coach"],
                  ["agency", "🧑‍💼 agency (e-commerce, ads, SEO, etc.)"],
                  ["ecom_owner", "🛒 dropshipper/e-commerce owner"],
                  ["community", "🌐 media/community/Discord"],
                  ["other", "Other"],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, creatorType: v as CreatorType }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      form.creatorType === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
                {form.creatorType === "other" ? (
                  <input
                    autoFocus
                    value={form.creatorTypeOther}
                    onChange={(e) => setForm((s) => ({ ...s, creatorTypeOther: e.target.value }))}
                    placeholder="Tell us what you do…"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
                  />
                ) : null}
              </div>
            )}

            {current.key === "audienceLevel" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {([
                  ["beginners", "beginners"],
                  ["intermediate", "intermediate learners"],
                  ["advanced", "advanced learners"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, audienceLevel: v }))}
                    className={`px-4 py-3 rounded-xl border transition ${
                      form.audienceLevel === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            )}

            {current.key === "audienceMainChannel" && (
              <div className="space-y-3">
                {([
                  ["discord", "Discord"],
                  ["formation", "formation"],
                  ["newsletter", "newsletter"],
                  ["social", "Instagram / TikTok / YouTube"],
                  ["existing_clients", "clients existants"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setForm((s) => {
                        const prev = Array.isArray(s.audienceMainChannels) ? s.audienceMainChannels : [];
                        const next = prev.includes(v as any) ? prev.filter((x) => x !== (v as any)) : [...prev, v as any];
                        return { ...s, audienceMainChannels: next };
                      })
                    }
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      form.audienceMainChannels.includes(v as any)
                        ? "border-purple-400/60 bg-purple-500/15"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
                <div className="text-xs text-gray-500">Tu peux en sélectionner plusieurs.</div>
              </div>
            )}

            {current.key === "launchOnboardCount" && (
              <input
                autoFocus
                value={form.launchOnboardCount}
                onChange={(e) => setForm((s) => ({ ...s, launchOnboardCount: e.target.value }))}
                placeholder="Example: 100"
                inputMode="numeric"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "offerType" && (
              <div className="space-y-3">
                {([
                  ["included", "included in an existing offer"],
                  ["upsell", "sold as an upsell"],
                  ["separate_subscription", "sold as a separate subscription"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, offerType: v }))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                      form.offerType === v ? "border-purple-400/60 bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
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

            {current.key === "adminEmail" && (
              <input
                autoFocus
                value={form.adminEmail}
                onChange={(e) => setForm((s) => ({ ...s, adminEmail: e.target.value }))}
                placeholder="Example: admin@yourdomain.com"
                className="w-full text-lg md:text-xl rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:border-white/25"
              />
            )}

            {current.key === "review" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm font-semibold mb-3">Summary</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">You are:</span> <span className="text-gray-200">{form.creatorType === "other" ? (form.creatorTypeOther || "Other") : form.creatorType || "—"}</span></div>
                    <div><span className="text-gray-400">Audience level:</span> <span className="text-gray-200">{form.audienceLevel || "—"}</span></div>
                    <div><span className="text-gray-400">Main channels:</span> <span className="text-gray-200">{(form.audienceMainChannels || []).join(", ") || "—"}</span></div>
                    <div><span className="text-gray-400">Launch onboard:</span> <span className="text-gray-200">{form.launchOnboardCount || "—"}</span></div>
                    <div><span className="text-gray-400">Offer type:</span> <span className="text-gray-200">{form.offerType || "—"}</span></div>
                    <div><span className="text-gray-400">Slug:</span> <span className="text-gray-200">{cleanSlug(form.slug) || "—"}</span></div>
                    <div className="md:col-span-2"><span className="text-gray-400">Default URL:</span> <span className="text-gray-200">{baseUrlPreview || "—"}</span></div>
                    <div className="md:col-span-2"><span className="text-gray-400">Admin email:</span> <span className="text-gray-200">{form.adminEmail || "—"}</span></div>
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


