"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clipboard, Crown, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { postGoal } from "@/lib/analytics";
import { trackDatafastGoal } from "@/lib/datafastGoals";
import { trackFirstPromoterReferral } from "@/lib/firstpromoterReferral";
import TrendTrackStatus from "@/components/TrendTrackStatus";
import { bestTextColorOn, hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";
import WhiteLabelPricingModal from "@/components/WhiteLabelPricingModal";
import { CheckoutSuccessEffects } from "@/components/CheckoutSuccessEffects";
import { ReviewPromptModal } from "@/components/ReviewPromptModal";
import { isMainEcomEfficiencyWorkspaceHost } from "@/lib/eeAppHost";
import {
  clearAffiliateSessionCacheAll,
  readAffiliateSessionCache,
  writeAffiliateSessionCache,
} from "@/lib/affiliateLinkSessionCache";
import { ZERO_AFFILIATE_SUMMARY, type AffiliateSummary } from "@/lib/affiliateSummary";
import { supabase } from "@/integrations/supabase/client";

const FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF = "https://ecomefficiency.firstpromoter.com";

function parseAffiliateSummary(raw: unknown): AffiliateSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    visitors: Math.max(0, Math.trunc(Number(o.visitors ?? 0))),
    conversions: Math.max(0, Math.trunc(Number(o.conversions ?? 0))),
    active_referrals: Math.max(0, Math.trunc(Number(o.active_referrals ?? 0))),
    total_earnings_display: String(o.total_earnings_display || "$0.00"),
  };
}

function AffiliateStatsRecap({ summary }: { summary: AffiliateSummary }) {
  return (
    <div className="mt-3 rounded-lg border border-white/5 bg-black/15 px-3 py-2.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4 sm:gap-y-0">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Visitors</div>
          <div className="text-sm font-semibold tabular-nums text-white">{summary.visitors.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Conversions</div>
          <div className="text-sm font-semibold tabular-nums text-white">{summary.conversions.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Active referrals</div>
          <div className="text-sm font-semibold tabular-nums text-white">{summary.active_referrals.toLocaleString("en-US")}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Total earnings</div>
          <div className="text-sm font-semibold tabular-nums text-white">{summary.total_earnings_display}</div>
        </div>
      </div>
    </div>
  );
}

function buildAffiliateFailureHint(j: Record<string, unknown>, httpStatus: number): string {
  const err = String(j?.error || "");
  if (err === "firstpromoter_not_configured") {
    const hasK = j?.has_api_key === true;
    const hasA = j?.has_account_id === true;
    if (!hasK && !hasA) {
      return "The production server still has empty FirstPromoter variables (they are not injected into this deployment). In Vercel: set FIRSTPROMOTER_API_KEY and FIRSTPROMOTER_ACCOUNT_ID for Production, fix any “Needs Attention” warning on the API key, then redeploy the latest production build.";
    }
    if (!hasA) {
      return "The server has FIRSTPROMOTER_API_KEY but not FIRSTPROMOTER_ACCOUNT_ID. Add FIRSTPROMOTER_ACCOUNT_ID for Production and redeploy.";
    }
    if (!hasK) {
      return "The server has FIRSTPROMOTER_ACCOUNT_ID but not FIRSTPROMOTER_API_KEY. Fix or recreate the API key in Vercel (Production) and redeploy.";
    }
    return "FirstPromoter env check failed unexpectedly. Redeploy, or open FirstPromoter below to copy your link.";
  }
  if (err === "firstpromoter_error") {
    const st = j?.fp_http_status;
    const detail = String(j?.message || "").trim().slice(0, 200);
    const base = `FirstPromoter returned an error${typeof st === "number" ? ` (HTTP ${st})` : ""}.`;
    const keys =
      " Confirm the private API key and Account ID in FirstPromoter → Settings → Integrations match Vercel exactly, then redeploy.";
    const campaign400 =
      st === 400
        ? " If FIRSTPROMOTER_INITIAL_CAMPAIGN_ID is set, use the numeric ID of an active campaign or remove the variable (invalid IDs often return HTTP 400)."
        : "";
    const tail = detail ? ` ${detail}` : "";
    return `${base}${keys}${campaign400}${tail}`;
  }
  if (httpStatus === 401 || err === "unauthorized" || err === "missing_authorization" || err === "missing_token") {
    return "Your session could not be verified for the affiliate service. Refresh the page or sign out and sign in again.";
  }
  if (err === "supabase_not_configured") {
    return "Supabase environment variables are missing on the server.";
  }
  return `Could not load your affiliate link${err ? ` (${err})` : httpStatus ? ` (HTTP ${httpStatus})` : ""}. Open FirstPromoter below to copy your referral link.`;
}

const App = ({
  showAffiliateCta = true,
  partnerSlug,
  brandColors,
  preview = false,
}: {
  showAffiliateCta?: boolean;
  partnerSlug?: string;
  brandColors?: { main?: string; accent?: string };
  preview?: boolean;
}) => {
  // no docker launch on this page anymore
  const [canvaInvite, setCanvaInvite] = React.useState<string | null>(null)
  const [appPlan, setAppPlan] = React.useState<'free'|'starter'|'pro'>('free')
  const [checkoutSuccessActive, setCheckoutSuccessActive] = React.useState(false)
  const checkoutTriggeredRef = React.useRef(false)
  const [reviewPromptOpen, setReviewPromptOpen] = React.useState(false)
  const reviewPromptTriggeredRef = React.useRef(false)
  const reviewPromptTimerRef = React.useRef<number | null>(null)
  const [reviewPromptTick, setReviewPromptTick] = React.useState(0)

  // Keep stable callbacks so confetti isn't interrupted by re-renders (e.g. credentials loading).
  const handleConfettiDone = React.useCallback(() => {
    console.log("[App] handleConfettiDone called -> setCheckoutSuccessActive(false)")
    setCheckoutSuccessActive(false)
  }, [])

  const [affiliateRefLink, setAffiliateRefLink] = React.useState("");
  const [affiliateRefLinks, setAffiliateRefLinks] = React.useState<string[]>([]);
  const [affiliateCoupon, setAffiliateCoupon] = React.useState("");
  const [affiliateFpPasswordUrl, setAffiliateFpPasswordUrl] = React.useState("");
  const [affiliateLinkStatus, setAffiliateLinkStatus] = React.useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [affiliateCopiedIndex, setAffiliateCopiedIndex] = React.useState<number | null>(null);
  const [affiliateErrorHint, setAffiliateErrorHint] = React.useState("");
  const [affiliateSummary, setAffiliateSummary] = React.useState<AffiliateSummary | null>(null);

  React.useEffect(() => {
    if (!showAffiliateCta || preview) return;
    let cancelled = false;

    const fetchAffiliate = async () => {
      let userIdForCatch = "";
      let hadCacheAtStart = false;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const userId = data.session?.user?.id;
        if (!token || !userId) {
          if (!cancelled) setAffiliateLinkStatus("idle");
          return;
        }
        userIdForCatch = userId;

        const cached = readAffiliateSessionCache(userId);
        hadCacheAtStart = Boolean(cached);
        if (cached && !cancelled) {
          const links =
            cached.ref_links && cached.ref_links.length
              ? cached.ref_links
              : cached.ref_link
                ? [cached.ref_link]
                : [];
          setAffiliateRefLinks(links);
          setAffiliateRefLink(links[0] || "");
          setAffiliateCoupon(cached.coupon);
          setAffiliateFpPasswordUrl(cached.password_setup_url);
          setAffiliateErrorHint("");
          setAffiliateLinkStatus("ready");
          setAffiliateSummary(cached.affiliate_summary ?? null);
        }

        const showLoading = !cached;
        if (showLoading && !cancelled) setAffiliateLinkStatus("loading");

        let r = await fetch("/api/firstpromoter/promoter", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!r.ok && r.status >= 500) {
          await new Promise((res) => setTimeout(res, 600));
          if (cancelled) return;
          r = await fetch("/api/firstpromoter/promoter", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
        }
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && j?.ok) {
          const refLinksRaw = Array.isArray(j?.affiliate?.ref_links) ? (j.affiliate.ref_links as unknown[]) : [];
          const links = refLinksRaw.map((x) => String(x ?? "").trim()).filter(Boolean);
          const link = links[0] || String(j?.affiliate?.ref_link || "").trim();
          const finalLinks = links.length ? links : link ? [link] : [];
          setAffiliateRefLinks(finalLinks);
          setAffiliateRefLink(link);
          setAffiliateCoupon(String(j?.affiliate?.coupon || "").trim());
          setAffiliateFpPasswordUrl(String(j?.promoter?.password_setup_url || "").trim());
          setAffiliateErrorHint("");
          setAffiliateLinkStatus("ready");
          const sum = parseAffiliateSummary(j?.affiliate_summary) ?? ZERO_AFFILIATE_SUMMARY;
          setAffiliateSummary(sum);
          writeAffiliateSessionCache(userId, {
            ref_link: link,
            ref_links: finalLinks,
            coupon: String(j?.affiliate?.coupon || "").trim(),
            password_setup_url: String(j?.promoter?.password_setup_url || "").trim(),
            affiliate_summary: sum,
          });
        } else {
          if (hadCacheAtStart) {
            return;
          }
          setAffiliateRefLink("");
          setAffiliateRefLinks([]);
          setAffiliateCoupon("");
          setAffiliateFpPasswordUrl("");
          setAffiliateSummary(null);
          setAffiliateErrorHint(buildAffiliateFailureHint(j as Record<string, unknown>, r.status));
          setAffiliateLinkStatus("unavailable");
        }
      } catch {
        if (cancelled) return;
        if (hadCacheAtStart || (userIdForCatch && readAffiliateSessionCache(userIdForCatch))) {
          return;
        }
        setAffiliateRefLink("");
        setAffiliateSummary(null);
        setAffiliateErrorHint(
          "Network error while loading your affiliate link. Check your connection, disable strict blockers for this site, then refresh."
        );
        setAffiliateLinkStatus("unavailable");
      }
    };

    void fetchAffiliate();
    const late = window.setTimeout(() => {
      if (!cancelled) void fetchAffiliate();
    }, 800);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        clearAffiliateSessionCacheAll();
        setAffiliateRefLink("");
        setAffiliateRefLinks([]);
        setAffiliateCoupon("");
        setAffiliateFpPasswordUrl("");
        setAffiliateErrorHint("");
        setAffiliateSummary(null);
        setAffiliateLinkStatus("idle");
        return;
      }
      if (session?.access_token) void fetchAffiliate();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(late);
      try {
        subscription.unsubscribe();
      } catch {}
    };
  }, [showAffiliateCta, preview]);

  const copyAffiliateLinkAt = React.useCallback(async (url: string, index: number) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setAffiliateCopiedIndex(index);
      window.setTimeout(() => setAffiliateCopiedIndex(null), 2000);
    } catch {}
  }, []);

  // Simulate return (sim_*): trigger confetti immediately so it always runs on localhost.
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const url = new URL(window.location.href)
      if (url.searchParams.get('checkout') !== 'success') return
      const sessionId = String(url.searchParams.get('session_id') || '')
      if (sessionId.startsWith('sim_')) setCheckoutSuccessActive(true)
    } catch {}
  }, [])

  // Dev-only: allow testing confetti without Stripe/Supabase configured
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (process.env.NODE_ENV === 'production') return
      const url = new URL(window.location.href)
      if (url.searchParams.get('debug_confetti') === '1') {
        setCheckoutSuccessActive(true)
        url.searchParams.delete('debug_confetti')
        window.history.replaceState({}, '', url.toString())
      }
    } catch {}
  }, [])

  // Expose brand colors for a few deep child components (white-label logos tinting)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (showAffiliateCta) return
    try {
      ;(window as any).__wl_main = String(brandColors?.main || '#9541e0')
      ;(window as any).__wl_accent = String(brandColors?.accent || '#ab63ff')
    } catch {}
  }, [showAffiliateCta, brandColors?.main, brandColors?.accent])
  
  // Suppress "Failed to fetch" console errors from network failures
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    const originalError = console.error
    const errorHandler = (...args: any[]) => {
      const message = String(args[0] || '')
      // Suppress "Failed to fetch" errors as they're expected in some network conditions
      if (message.includes('Failed to fetch') || message.includes('TypeError: Failed to fetch')) {
        return // Suppress silently
      }
      originalError.apply(console, args)
    }
    console.error = errorHandler
    
    return () => {
      console.error = originalError
    }
  }, [])
  
  // Handle Supabase auth hash after email verification so the session is available immediately
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash || ''
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const just = url.searchParams.get('just') === '1'
    const hasHashTokens = /access_token=|refresh_token=/.test(hash)

    // Helper pour vérifier si l'utilisateur est "nouveau" (créé il y a moins de 1 heure)
    const isUserNew = (user: any) => {
      if (!user?.created_at) return false;
      const created = new Date(user.created_at).getTime();
      const now = new Date().getTime();
      return (now - created) < 60 * 60 * 1000; // 1 heure
    };

    const maybeGoGettingStarted = (user: any) => {
      try {
        if (!user) return false
        const meta = (user.user_metadata as any) || {}
        if (meta?.acquisition_source) return false
        if (!isUserNew(user)) return false
        const key = `ee_getting_started_shown_${user.id}`
        try {
          if (localStorage.getItem(key)) return false
          localStorage.setItem(key, '1')
        } catch {}

        const protocol = window.location.protocol
        const hostname = window.location.hostname
        const port = window.location.port ? `:${window.location.port}` : ''
        const baseHost = hostname === 'localhost' ? `app.localhost${port}` : window.location.host
        window.location.href = `${protocol}//${baseHost}/getting-started?from=verify`
        return true
      } catch {
        return false
      }
    }

    // Fonction centralisée pour tracker le Signup de manière unique
    const trackUniqueSignup = (user: any) => {
        if (!user?.email || !user?.id) return;
        
        // 1. Si l'utilisateur n'est pas "frais" (créé il y a > 1h), on ignore
        if (!isUserNew(user)) return;

        // 2. Si on a déjà tracké ce user ID sur ce navigateur, on ignore
        const storageKey = `ee_signup_tracked_${user.id}`;
        if (localStorage.getItem(storageKey)) return;

        // 3. On marque comme tracké immédiatement
        try { localStorage.setItem(storageKey, '1'); } catch {}

        // 4. Tracking DataFast
        try {
            const providerRaw: unknown =
              (user?.app_metadata && (user.app_metadata.provider || (Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers[0] : undefined))) ||
              (user?.app_metadata && user.app_metadata?.provider_id) ||
              undefined;
            const provider: string = providerRaw != null ? `${providerRaw}` : 'unknown';
            (window as any)?.datafast?.('sign_up', {
                email: user.email,
                user_id: user.id,
                verified_at: new Date().toISOString(),
                provider,
            });
            // Fallback via postGoal to ensure DataFast goal triggers alongside Brevo
            try { postGoal('sign_up', { email: String(user.email), provider }); } catch {}
        } catch {}

        // 5. Tracking Brevo
        fetch('/api/brevo/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                event: 'signup',
                data: { 
                  source: 'website', 
                  status: 'pending_payment',
                  // Fallback name if available in metadata, else part of email
                  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
                }
            })
        }).catch(() => {});
    };

    // Fallback: if just=1 param present and user is already authenticated, mark complete_signup
    if (just) {
      // No op: complete_signup removed
    }

    if (hasHashTokens) {
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        (async () => {
          try {
            const mod = await import("@/integrations/supabase/client")
            await mod.supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            try { await fetch('/api/auth/flag', { method: 'POST' }) } catch {}

            // Track DataFast sign_up goal after OAuth sign-up OR Email verification
            // We rely strictly on isUserNew() to avoid false positives from logins
            const justSignedIn = params.get('just_signed_in')
            try {
              const { data } = await mod.supabase.auth.getUser()
              
              // AJOUT: Identifier l'utilisateur pour DataFast (toujours utile pour lier user_id)
              if (data.user?.email) {
                try {
                  (window as any)?.datafast?.('identify', {
                    email: data.user.email,
                    user_id: data.user.id
                  });
                } catch {}
              }

              // Tracking Unique du Signup
              if (data.user) trackUniqueSignup(data.user);

              // FirstPromoter referral: send before any redirect so fpr script can process (must run on this page with ?fpr=)
              if (data.user?.email) {
                try { trackFirstPromoterReferral(String(data.user.email)); } catch {}
                await new Promise((r) => setTimeout(r, 1800));
              }

              // After email verification: redirect to short onboarding (once) to capture source
              if (data.user && maybeGoGettingStarted(data.user)) return;
            } catch {}

            // Redirect to app.localhost subdomain after OAuth
            const protocol = window.location.protocol
            const hostname = window.location.hostname
            const port = window.location.port ? `:${window.location.port}` : ''

            // If on plain localhost after OAuth, redirect to app.localhost
            if (hostname === 'localhost') {
              // If the user is new and hasn't answered onboarding yet, go to /getting-started on app.localhost
              try {
                const { data } = await mod.supabase.auth.getUser()
                if (data.user && maybeGoGettingStarted(data.user)) return
              } catch {}
              window.location.href = `${protocol}//app.localhost${port}/`
              return
            }

            // Otherwise clean the hash and stay
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          } catch {}
        })()
        return
      }
    }

    // Handle code-based redirects (magic link / email confirm that returns ?code=...)
    if (code) {
      (async () => {
        try {
          const mod = await import("@/integrations/supabase/client")
          await mod.supabase.auth.exchangeCodeForSession(window.location.href)
          try { await fetch('/api/auth/flag', { method: 'POST' }) } catch {}

          // Track DataFast sign_up goal after email verification
          try {
            const { data } = await mod.supabase.auth.getUser()
            
            // AJOUT: Identifier l'utilisateur pour DataFast
            if (data.user?.email) {
              try {
                (window as any)?.datafast?.('identify', {
                  email: data.user.email,
                  user_id: data.user.id
                });
              } catch {}
           }
           
           // Tracking Unique du Signup
           if (data.user) trackUniqueSignup(data.user);

           // FirstPromoter referral: send before any redirect so fpr script can process
           if (data.user?.email) {
             try { trackFirstPromoterReferral(String(data.user.email)); } catch {}
             await new Promise((r) => setTimeout(r, 1800));
           }

           // After email verification: redirect to getting-started (once) to capture source
           if (data.user && maybeGoGettingStarted(data.user)) return;
          } catch (e) {
            // console.error('[App] Failed to track sign_up (non-fatal):', e);
          }

          // Redirect to app.localhost if on plain localhost
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          const port = window.location.port ? `:${window.location.port}` : ''

          if (hostname === 'localhost') {
            try {
              const { data } = await mod.supabase.auth.getUser()
              if (data.user && maybeGoGettingStarted(data.user)) return
            } catch {}
            window.location.href = `${protocol}//app.localhost${port}/`
            return
          }

          // Clean URL (remove code/state)
          window.history.replaceState(null, '', window.location.pathname)
        } catch {}
      })()
    }
  }, [])

  // Live-refresh Canva invite every 10s
  React.useEffect(() => {
    let cancelled = false
    let timer: any
    const run = async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const email = data.user?.email || ''
        const customerId = ((data.user?.user_metadata as any) || {}).stripe_customer_id || ''
        // White-label: detect partnerSlug from prop or global variable
        let detectedPartnerSlug = partnerSlug;
        if (!detectedPartnerSlug && typeof window !== 'undefined') {
          detectedPartnerSlug = (window as any).__wl_partner_slug;
        }
        const headers: Record<string, string> = {}
        if (email) headers['x-user-email'] = email
        if (customerId) headers['x-stripe-customer-id'] = customerId
        // White-label: allow credentials endpoint to validate subscription on partner Stripe Connect account.
        if (!showAffiliateCta && detectedPartnerSlug && !isMainEcomEfficiencyWorkspaceHost())
          headers["x-partner-slug"] = String(detectedPartnerSlug)
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' }).catch(() => null)
        if (!res) return
        const json = await res.json().catch(() => ({}))
        const link = json?.canva_invite_url ? String(json.canva_invite_url) : null
        if (!cancelled && link && link !== canvaInvite) setCanvaInvite(link)
      } catch {
        // Silently handle errors - network failures are expected
      }
    }
    // kick and schedule
    run()
    timer = setInterval(run, 10_000)
    return () => { cancelled = true; try { clearInterval(timer) } catch {} }
  }, [canvaInvite, showAffiliateCta, partnerSlug])
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const email = data.user?.email || ''
        const userId = data.user?.id || ''
        const customerId = ((data.user?.user_metadata as any) || {}).stripe_customer_id || ''
        
        // White-label: detect partnerSlug from prop or global variable
        let detectedPartnerSlug = partnerSlug;
        if (!detectedPartnerSlug && typeof window !== 'undefined') {
          detectedPartnerSlug = (window as any).__wl_partner_slug;
        }
        
        const headers: Record<string, string> = {}
        if (email) headers['x-user-email'] = email
        if (customerId) headers['x-stripe-customer-id'] = customerId
        // White-label: allow credentials endpoint to validate subscription on partner Stripe Connect account.
        if (!showAffiliateCta && detectedPartnerSlug && !isMainEcomEfficiencyWorkspaceHost())
          headers["x-partner-slug"] = String(detectedPartnerSlug)
        const res = await fetch('/api/credentials', { headers, cache: 'no-store' }).catch(() => null)
        if (res) {
          const json = await res.json().catch(() => ({}))
          if (json?.canva_invite_url) setCanvaInvite(String(json.canva_invite_url))
        }
        
        // Check for checkout=success and force plan refresh with retry
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isCheckoutSuccess = urlParams?.get('checkout') === 'success';
        const sessionId = String(urlParams?.get('session_id') || '');
        const hasStripeReturnParams =
          Boolean(urlParams?.get('session_id') || urlParams?.get('payment_intent') || urlParams?.get('redirect_status'));

        // Detect recent checkout even when return URL has no params (e.g. /checkout/success redirects to app.*).
        // IMPORTANT: do NOT clear the pending flag until plan verification succeeds, otherwise the paywall
        // may re-open and the user can appear "free" until a manual reload.
        let pendingFresh = false
        try {
          const pendingRaw = typeof window !== 'undefined' ? window.localStorage.getItem('__ee_pending_checkout') : null
          let pendingAt = 0
          if (pendingRaw) {
            try { pendingAt = Number(JSON.parse(pendingRaw)?.at || 0) } catch { pendingAt = Number(pendingRaw) || 0 }
          }
          pendingFresh = pendingAt > 0 && (Date.now() - pendingAt) < 1000 * 60 * 60 * 6 // 6h
        } catch {}

        const fromStripe = (() => {
          try {
            const ref = String(document.referrer || '').toLowerCase()
            return ref.includes('checkout.stripe.com') || ref.includes('pay.stripe.com') || ref.includes('stripe.com')
          } catch { return false }
        })()

        const isStripeReturn = Boolean(isCheckoutSuccess || hasStripeReturnParams || pendingFresh || fromStripe)

        // Trigger confetti ASAP on return from Stripe (do NOT wait for plan verification).
        // This avoids missing confetti when Supabase session isn't ready on first load.
        try {
          const confettiKey =
            userId ? `__ee_confetti_shown_${userId}` :
            (email ? `__ee_confetti_shown_${email}` :
            (sessionId ? `__ee_confetti_shown_session_${sessionId}` : '__ee_confetti_shown_anon'))

          const alreadyShown = confettiKey ? Boolean(localStorage.getItem(confettiKey)) : false
          const shouldCelebrate = isStripeReturn && !alreadyShown

          if (shouldCelebrate && !checkoutTriggeredRef.current) {
            checkoutTriggeredRef.current = true
            try {
              if (confettiKey) localStorage.setItem(confettiKey, String(Date.now()))
            } catch {}
            setCheckoutSuccessActive(true)
          }
        } catch {}
        
        // Determine user plan at app level - SECURITY: Only trust active subscriptions
        const verifyPlan = async (attempt = 0): Promise<void> => {
          try {
            const verifyHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
            if (email) verifyHeaders['x-user-email'] = email
            if (customerId) verifyHeaders['x-stripe-customer-id'] = customerId
            // White-label: subscription is on partner's Stripe Connect account
            if (!showAffiliateCta && detectedPartnerSlug && !isMainEcomEfficiencyWorkspaceHost())
              verifyHeaders["x-partner-slug"] = String(detectedPartnerSlug)
            const vr = await fetch('/api/stripe/verify', {
              method: 'POST',
              headers: verifyHeaders,
              body: JSON.stringify({ email, session_id: sessionId || undefined })
            }).catch(() => null)
            if (vr) {
              const vj = await vr.json().catch(() => ({}))
              const p = (vj?.plan as string)?.toLowerCase()
              // SECURITY: Only allow access if subscription is both OK and ACTIVE
              if (vj?.ok && vj?.active === true && (p === 'starter' || p === 'pro')) {
                setAppPlan(p as any)
                // Clear the pending checkout flag only once the plan is verified.
                try { localStorage.removeItem('__ee_pending_checkout') } catch {}
                // If checkout success, clean URL after successful verification
                if ((isCheckoutSuccess || hasStripeReturnParams) && typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('checkout');
                  url.searchParams.delete('session_id');
                  url.searchParams.delete('payment_intent');
                  url.searchParams.delete('redirect_status');
                  window.history.replaceState({}, '', url.toString());
                }
                return;
              } else {
                // SECURITY: Don't trust user_metadata alone, always default to free for inactive subscriptions
                setAppPlan('free')
              }
            } else {
              setAppPlan('free')
            }
          } catch {
            // SECURITY: On any error, default to free plan
            setAppPlan('free')
          }
          
          // Retry logic for Stripe return (covers checkout=success + session_id/pending flag)
          if (isStripeReturn && attempt < 10) {
            await new Promise(r => setTimeout(r, 500));
            return verifyPlan(attempt + 1);
          }
        };
        
        await verifyPlan();
      } catch {
        // Silently handle errors - network failures are expected
      }
    })()
  }, [showAffiliateCta, partnerSlug])

  // Review popup:
  // - Local/dev: show for any valid subscription (to test the flow easily).
  // - Prod: show once subscription age >= 14 days.
  React.useEffect(() => {
    if (reviewPromptTriggeredRef.current) return
    if (!isMainEcomEfficiencyWorkspaceHost()) return
    if (!showAffiliateCta) return // never ask on white-label surfaces
    if (partnerSlug) return // avoid asking partners users to review EcomEfficiency
    if (reviewPromptOpen) return
    if (checkoutSuccessActive) return // never interrupt checkout celebration

    let cancelled = false
    // Clear any previous timer when this effect runs
    try {
      if (reviewPromptTimerRef.current) window.clearTimeout(reviewPromptTimerRef.current)
      reviewPromptTimerRef.current = null
    } catch {}
    ;(async () => {
      try {
        let debug = false
        try {
          const url = new URL(window.location.href)
          debug = url.searchParams.get('debug_review') === '1'
        } catch {}

        if (!debug && (appPlan === 'free' || !appPlan)) return

        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const user = data.user
        if (!user) return

        const meta = (user.user_metadata as any) || {}
        // If the user already submitted, never show again.
        if (Boolean(meta?.review_prompt_submitted_at)) {
          reviewPromptTriggeredRef.current = true
          return
        }

        // If user closed / clicked "later" recently, wait until next visit (cooldown).
        // This enables re-prompting on the next session without spamming on refresh/navigation.
        try {
          const lastAtRaw =
            (typeof meta?.review_prompt_last_action_at === 'string' && meta.review_prompt_last_action_at) ||
            (typeof meta?.review_prompt_dismissed_at === 'string' && meta.review_prompt_dismissed_at) ||
            ''
          const lastMs = lastAtRaw ? new Date(String(lastAtRaw)).getTime() : 0
          const cooldownMs = 1000 * 60 * 30 // 30 minutes
          if (lastMs && !Number.isNaN(lastMs) && (Date.now() - lastMs) < cooldownMs) {
            reviewPromptTriggeredRef.current = true
            return
          }
        } catch {}

        const isProd = process.env.NODE_ENV === 'production'
        const minDays = isProd ? 14 : 0

        // Verify Stripe + subscription age
        let eligible = debug
        if (!eligible) {
          let sessionId = ''
          try {
            const sp = new URLSearchParams(window.location.search || '')
            sessionId = String(sp.get('session_id') || '')
          } catch {}

          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (user.email) headers['x-user-email'] = String(user.email)
          const r = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers,
            body: JSON.stringify({ email: user.email || '', session_id: sessionId || undefined }),
          }).catch(() => null as any)
          const j = r ? await r.json().catch(() => ({} as any)) : ({} as any)
          if (j?.active !== true) return
          if (minDays > 0) {
            const createdAt = j?.subscription_created_at ? new Date(String(j.subscription_created_at)).getTime() : 0
            if (!createdAt || Number.isNaN(createdAt)) return
            const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
            if (ageDays < minDays) {
              // Auto-trigger when maturity is reached (even if user stays logged in).
              try {
                const targetMs = createdAt + minDays * 24 * 60 * 60 * 1000
                const delayMs = Math.max(0, targetMs - Date.now() + 1500) // small buffer
                // Avoid setTimeout overflow (max ~24.8 days).
                const safeDelay = Math.min(delayMs, 2147483647)
                reviewPromptTimerRef.current = window.setTimeout(() => {
                  if (cancelled) return
                  setReviewPromptTick((t) => t + 1)
                }, safeDelay)
              } catch {}
              return
            }
          }
          eligible = true
        }

        if (!eligible) return
        if (cancelled) return

        reviewPromptTriggeredRef.current = true
        setReviewPromptOpen(true)

        // Mark as shown (attempt counter). We want to re-prompt on later visits if no submission.
        try {
          const t = new Date().toISOString()
          const prevCount = Number(meta?.review_prompt_shown_count || 0) || 0
          const nextCount = prevCount + 1
          await mod.supabase.auth.updateUser({
            data: {
              review_prompt_shown_at: t,
              review_prompt_shown_count: nextCount,
              review_prompt_last_action: 'shown',
              review_prompt_last_action_at: t,
              review_prompt_last_attempt: nextCount,
            }
          } as any)
          try { postGoal('review_prompt_shown', { ...(user.email ? { email: String(user.email) } : {}), attempt: String(nextCount) }) } catch {}
        } catch {
        }
      } catch {}
    })()

    return () => {
      cancelled = true
      try {
        if (reviewPromptTimerRef.current) window.clearTimeout(reviewPromptTimerRef.current)
        reviewPromptTimerRef.current = null
      } catch {}
    }
  }, [appPlan, checkoutSuccessActive, partnerSlug, reviewPromptOpen, showAffiliateCta, reviewPromptTick])

  // Bottom-right server country/currency badge for debugging currency decision

  return (
    <div>
      <CheckoutSuccessEffects
        active={checkoutSuccessActive}
        askSource={false}
        onAskSourceClose={() => {}}
        onConfettiDone={handleConfettiDone}
      />
      <ReviewPromptModal open={reviewPromptOpen} onClose={() => setReviewPromptOpen(false)} />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {showAffiliateCta ? (
          <div className="mb-4">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-[linear-gradient(180deg,rgba(149,65,224,0.08)_0%,rgba(124,48,199,0.08)_100%)] p-4 md:p-5 flex flex-col gap-4">
              <div className="text-white/90 text-sm md:text-base min-w-0">
                <span className="font-semibold text-white">Earn 30% for life</span> by helping entrepreneurs save thousands on their Spy, AI & SEO tools.
                {affiliateLinkStatus === "loading" ? (
                  <span className="block mt-2 text-xs text-gray-400">Preparing your personal affiliate link…</span>
                ) : null}
                {affiliateLinkStatus === "ready" && affiliateRefLink ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="font-semibold text-white text-sm">Your Affiliate Link</div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Share this unique link to track referrals and earn 30% recurring commission.
                      </p>
                    </div>
                    <div className="flex flex-row flex-nowrap items-stretch gap-2 min-w-0 overflow-x-auto">
                      <div className="flex min-h-[36px] min-w-0 flex-1 max-w-[12rem] sm:max-w-[16rem] md:max-w-[20rem] items-stretch overflow-hidden rounded-lg border border-white/10 bg-black/30">
                        <div
                          className="min-w-0 flex-1 px-2 py-2 text-xs leading-snug text-purple-200/90 font-mono truncate"
                          title={affiliateRefLink}
                        >
                          {affiliateRefLink}
                        </div>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => void copyAffiliateLink()}
                                className="flex shrink-0 items-center justify-center border-l border-white/10 px-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                                aria-label={affiliateCopied ? "Copied" : "Copy affiliate link"}
                              >
                                {affiliateCopied ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                                ) : (
                                  <Clipboard className="h-3.5 w-3.5" aria-hidden />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {affiliateCopied ? "Copied" : "Copy link"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <a
                        href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 self-center"
                      >
                        <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#9541e0] bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] px-3 py-2 text-xs font-medium text-white shadow-[0_2px_16px_0_rgba(149,65,224,0.45)] transition-[box-shadow] hover:shadow-[0_2px_20px_0_rgba(149,65,224,0.55)] group min-h-[36px]">
                          <span className="relative block h-4 min-w-[7.75rem] overflow-hidden text-center leading-4">
                            <span className="block whitespace-nowrap transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-4">
                              Affiliate dashboard
                            </span>
                            <span className="absolute left-1/2 top-4 w-max -translate-x-1/2 whitespace-nowrap transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:top-0">
                              Affiliate dashboard
                            </span>
                          </span>
                        </span>
                      </a>
                    </div>
                    {affiliateCoupon ? (
                      <div className="text-xs text-gray-400">
                        Promo code: <span className="text-white font-medium">{affiliateCoupon}</span>
                      </div>
                    ) : null}
                    {affiliateFpPasswordUrl ? (
                      <a
                        href={affiliateFpPasswordUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-block text-xs text-purple-300 hover:text-purple-200 underline"
                      >
                        Set your FirstPromoter password
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {affiliateLinkStatus === "ready" && !affiliateRefLink ? (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-xs text-gray-300 max-w-xl min-w-0 flex-1">
                      Your affiliate account is ready on FirstPromoter (including on the Free plan). Open your dashboard to
                      copy your referral link if it does not appear here yet.
                    </p>
                    <a
                      href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex shrink-0 self-start sm:self-center"
                    >
                      <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#9541e0] bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] px-3.5 py-2 text-xs font-medium text-white shadow-[0_2px_16px_0_rgba(149,65,224,0.45)] transition-[box-shadow] hover:shadow-[0_2px_20px_0_rgba(149,65,224,0.55)] group min-h-[36px]">
                        <span className="relative block h-4 min-w-[9rem] overflow-hidden text-center leading-4">
                          <span className="block whitespace-nowrap transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-4">
                            Open affiliate dashboard
                          </span>
                          <span className="absolute left-1/2 top-4 w-max -translate-x-1/2 whitespace-nowrap transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:top-0">
                            Open affiliate dashboard
                          </span>
                        </span>
                      </span>
                    </a>
                  </div>
                ) : null}
                {affiliateLinkStatus === "unavailable" && affiliateErrorHint ? (
                  <p className="mt-2 text-xs text-amber-200/90 max-w-xl whitespace-pre-wrap">{affiliateErrorHint}</p>
                ) : affiliateLinkStatus === "unavailable" ? (
                  <p className="mt-2 text-xs text-amber-200/90 max-w-xl">
                    We could not load your link automatically. Open FirstPromoter below to copy your referral link.
                  </p>
                ) : null}
                {affiliateLinkStatus === "ready" ? (
                  <AffiliateStatsRecap summary={affiliateSummary ?? ZERO_AFFILIATE_SUMMARY} />
                ) : null}
              </div>
              {affiliateLinkStatus === "unavailable" ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <a
                    href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border border-[#9541e0] text-white font-medium h-[48px] whitespace-nowrap"
                  >
                    Open affiliate dashboard
                  </a>
                  <a
                    href="https://www.ecomefficiency.com/affiliate"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-white/15 text-sm text-gray-200 hover:bg-white/5 h-[48px] whitespace-nowrap"
                  >
                    Program details
                  </a>
                </div>
              ) : affiliateLinkStatus === "idle" ? (
                <div className="min-h-[36px]" aria-hidden />
              ) : null}
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 bg-purple-600/20 blur-3xl" aria-hidden />
            </div>
          </div>
        ) : null}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">Tools</h2>
              <PlanBadgeInline whiteLabel={!showAffiliateCta} partnerSlug={partnerSlug} />
        </div>
      </div>
          <CredentialsPanel
            whiteLabel={!showAffiliateCta}
            partnerSlug={partnerSlug}
            brandColors={brandColors}
            preview={preview}
          />
        </div>
        
        {/* TrendTrack Status - Pro Only Feature - TEMPORARILY DISABLED */}
        {/* {appPlan === 'pro' && (
          <div className="mb-6">
            <TrendTrackStatus />
          </div>
        )} */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BrainCredsCard disabled={appPlan === 'free'} />
          <CanvaFlipCard inviteLink={canvaInvite || undefined} disabled={appPlan === 'free'} />
        </div>

        {/* Tool quick-open cards (proxy) - TEMPORARILY DISABLED */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <ElevenLabsCard disabled={appPlan === 'free'} />
          <PipiadsCard disabled={appPlan === 'free'} />
        </div> */}
        
      </div>
      <HowToAccess renderTrigger={false} />
    </div>
  );
};

export default App;

function appHostBase() {
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href)
      const qpLocal = url.searchParams.get('local')
      const qpProd = url.searchParams.get('prod')
      const ls = (window.localStorage && localStorage.getItem('__ee_force_local')) || ''
      const host = (url.hostname || '').toLowerCase()
      const isProdHost = host.endsWith('ecomefficiency.com') || host.endsWith('ecomefficeincy.com') || host.endsWith('ecomefficiency.site')
      // Explicit toggles first
      if (qpLocal === '1' || ls === '1') return 'http://localhost:5000'
      if (qpProd === '1' || ls === '0') return ''
      // Default: on production domains, stay on same origin (no localhost)
      if (isProdHost) return ''
    } catch {}
  }
  return ''
}

function PlanBadgeInline({ whiteLabel, partnerSlug }: { whiteLabel?: boolean; partnerSlug?: string }) {
  const [plan, setPlan] = React.useState<'starter'|'pro'|null>(null)
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const meta = (data.user?.user_metadata as any) || {}
        
        // ONLY trust Stripe verification, NEVER user_metadata alone
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (data.user?.email) headers['x-user-email'] = data.user.email
          if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id as string
          if (whiteLabel && partnerSlug && !isMainEcomEfficiencyWorkspaceHost())
            headers["x-partner-slug"] = String(partnerSlug)
          const r = await fetch('/api/stripe/verify', { method: 'POST', headers, body: JSON.stringify({ email: data.user?.email || '' }) })
          const j = await r.json().catch(() => ({}))
          const p = (j?.plan as string)?.toLowerCase()
          
          // CRITICAL: Only show badge if subscription is ACTIVE
          if (j?.ok && j?.active === true && (p === 'starter' || p === 'pro')) {
            setPlan(p as any)
          } else {
            // No active subscription = no badge (show Free implicitly)
            setPlan(null)
          }
        } catch {
          // On error, don't show badge
          setPlan(null)
        }
      } catch {}
    })()
  }, [whiteLabel, partnerSlug])
  if (!plan) return null
  return (
    <span className={`text-xs px-2 py-1 rounded capitalize ${plan==='pro' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-gray-400/20 text-gray-200'}`}>{plan}</span>
  )
}

function PricingCardsModal({ onSelect, onOpenSeoModal }: { onSelect: (tier: 'starter'|'pro', billing: 'monthly'|'yearly', currency: 'EUR'|'USD') => void, onOpenSeoModal?: () => void }) {
  const [billing, setBilling] = React.useState<'monthly'|'yearly'>('monthly')
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const toggleExpand = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }))

  // Initialize currency (Default USD to avoid hydration mismatch)
  const [currency, setCurrency] = React.useState<'EUR'|'USD'>('USD')
  
  // Effect to load from localStorage on client side only
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('ee_detected_currency')
      if (stored === 'EUR' || stored === 'USD') {
        setCurrency(stored)
      }
    } catch {}
  }, [])
  const [ready, setReady] = React.useState(false)
  const [loadingPlan, setLoadingPlan] = React.useState<null|'starter'|'pro'>(null)

  React.useEffect(() => {
    let cancelled = false
    // console.log('[PricingModal] 🔍 Starting currency detection...')
    ;(async () => {
      // Default to USD, will be updated if detection succeeds
      setReady(true) // Make buttons clickable immediately with stored/USD default
      // console.log('[PricingModal] ✅ Ready set to true, initial currency:', currency)
      
      // URL override like landing: ?currency=EUR|USD
      try {
        const url = new URL(window.location.href)
        const override = url.searchParams.get('currency')
        if (override === 'EUR' || override === 'USD') {
          if (!cancelled) {
            setCurrency(override)
            localStorage.setItem('ee_detected_currency', override)
            // console.log('[PricingModal] ✅ Currency set from URL:', override)
          }
          return
        }
      } catch (e) {
        // console.log('[PricingModal] ⚠️ URL check failed:', e)
      }
      
      // Prefer browser IP first for consistency with checkout
      // console.log('[PricingModal] 🌍 Fetching IP from ipapi.co...')
      try {
        const g = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const gj = await g.json().catch(() => ({} as any))
        // console.log('[PricingModal] 📡 ipapi.co response:', gj)
        const cc = String(gj?.country_code || gj?.country || '').toUpperCase()
        const eu = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
        if (cc) {
          const detectedCurrency = eu.has(cc) ? 'EUR' : 'USD'
          if (!cancelled) {
            setCurrency(detectedCurrency)
            localStorage.setItem('ee_detected_currency', detectedCurrency)
            // console.log('[PricingModal] ✅ Currency SET from IP:', detectedCurrency, 'country:', cc)
          }
          return
        } else {
          // console.log('[PricingModal] ⚠️ No country code from ipapi.co')
        }
      } catch (e) {
        // console.warn('[PricingModal] ❌ IP detection failed:', e)
      }
      
      // Fallback to server IP
      // console.log('[PricingModal] 🔄 Trying server IP...')
      try {
        const r = await fetch('/api/ip-region', { cache: 'no-store' })
        const j = await r.json().catch(() => ({} as any))
        // console.log('[PricingModal] 📡 /api/ip-region response:', j)
        if (!cancelled && j && (j.currency === 'EUR' || j.currency === 'USD')) {
          setCurrency(j.currency)
          localStorage.setItem('ee_detected_currency', j.currency)
          // console.log('[PricingModal] ✅ Currency SET from server:', j.currency)
          return
        }
      } catch (e) {
        // console.warn('[PricingModal] ❌ Server IP detection failed:', e)
      }
      
      // Fallback: locale
      // console.log('[PricingModal] 🔄 Trying locale...')
      try {
        const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase()
        const euRE = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/
        const detectedCurrency = euRE.test(loc) ? 'EUR' : 'USD'
        if (!cancelled) {
          setCurrency(detectedCurrency)
          localStorage.setItem('ee_detected_currency', detectedCurrency)
          // console.log('[PricingModal] ✅ Currency SET from locale:', detectedCurrency, 'locale:', loc)
        }
      } catch (e) {
        // console.warn('[PricingModal] ❌ Locale detection failed:', e)
      }
    })()
    return () => { 
      cancelled = true
      // console.log('[PricingModal] 🛑 Effect cleanup')
    }
  }, [])

  const isYearly = billing === 'yearly'
  const wlMain = normalizeHex(String((typeof window !== 'undefined' ? (window as any).__wl_main : '') || '#9541e0'), '#9541e0')
  const wlAccent = normalizeHex(String((typeof window !== 'undefined' ? (window as any).__wl_accent : '') || '#7c30c7'), '#7c30c7')
  const wlBtnText = bestTextColorOn(mixHex(wlMain, wlAccent, 0.5))
  const proExtras = [
    'Winning Hunter',
    'Pipiads',
    'Atria',
    'Claude',
    'Runway',
    'Heygen',
    'Freepik',
    'TurboScribe',
    'Flair AI',
    'Exploding topics',
    'Eleven labs',
    'Higgsfield',
    'Vmake',
    'Fotor',
    'Foreplay',
    'Kalodata',
  ]

  const formatPrice = (amount: number, c: 'USD' | 'EUR') => {
    if (c === 'EUR') {
      // EU formatting: show € on the RIGHT (e.g. 19,99€), not as a prefix.
      const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      return formatted.replace(/\s/g, '\u00A0') + '€';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const renderSpinner = () => (
    <span className="inline-flex items-center justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </span>
  )

  return (
    <section className="py-2 bg-transparent relative">
      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40 overflow-hidden">
          <button onClick={() => setBilling('monthly')} className={`px-3 py-1.5 text-xs rounded-full transition-colors cursor-pointer select-none ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Monthly</button>
          <button onClick={() => setBilling('yearly')} className={`px-3 py-1.5 text-xs rounded-full transition-colors cursor-pointer select-none ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300 hover:bg-purple-500/10'}`}>Annual</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-5xl mx-auto">
        {[{name:'Starter', baseMonthly:19.99, highlight:false}, {name:'Pro', baseMonthly:29.99, highlight:true, badge:'Most Popular'}].map((plan:any) => (
          <div key={plan.name} className={`relative rounded-xl border group/card ${plan.highlight ? 'bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] border-purple-500/25 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]' : 'bg-[#0d0e12] border-white/10'} flex flex-col`}>
            <div className="p-3 md:p-4 flex flex-col h-full">
              <h3 className="text-xl font-bold text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)] mb-1">{plan.name}{isYearly ? (<span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">-40%</span>) : null}</h3>
              <div>
                <div className="mb-1 flex items-end gap-2 md:gap-3">
                  {isYearly ? (
                    <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{formatPrice(plan.name==='Starter'?11.99:17.99, currency)}</span>
                  ) : (
                    <span className="text-3xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.15)]">{formatPrice(plan.baseMonthly, currency)}</span>
                  )}
                  <span className="text-[10px] text-gray-400 mb-0.5">/mo</span>
                </div>
                <div className="text-[11px] text-gray-300 mb-1">
                  {plan.name === 'Starter' && 'Access to 40 Ecom tools'}
                  {plan.name === 'Pro' && 'Access to +50 Ecom tools'}
                </div>
              </div>

              {plan.name === 'Starter' && (
                <div className="mb-4 md:mb-6 space-y-2">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-300">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Dropship.io</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Shophunter</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Helium 10</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>GPT</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Midjourney</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>SendShort</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Brain.fm</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Capcut</span></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Canva</span></li>
                    <li className="col-span-2 flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5" style={{ color: wlAccent }} />
                      <span className="text-[11px] text-gray-300">
                        +30 SEO tools (Ubersuggest, Semrush, Similarweb,...){" "}
                        <button
                          type="button"
                          onClick={()=>onOpenSeoModal?.()}
                          className="underline cursor-pointer hover:opacity-90"
                          style={{ color: wlAccent, textDecorationColor: hexWithAlpha(wlAccent, 0.5) }}
                        >
                          see all SEO tools
                        </button>
                      </span>
                    </li>
                  </ul>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {proExtras.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-gray-500 text-[11px]">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.name === 'Pro' && (
                <div className="mb-6 space-y-2 text-gray-300 text-[13px]">
                  <div className="flex items-center gap-2 text-[11px]"><Check className="w-3.5 h-3.5" style={{ color: wlAccent }} /><span>Includes everything in Starter, plus:</span></div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {proExtras.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-[11px]">
                        <Check className="w-3.5 h-3.5" style={{ color: wlAccent }} />
                        <span>{t}</span>
                        {t === 'Higgsfield' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white/95 border border-[#a78bfa]/40">NEW</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-1 md:pt-2 mt-auto">
                {(() => {
                  const planKey = (plan.name==='Starter' ? 'starter' : 'pro') as 'starter'|'pro'
                  const isLoading = loadingPlan === planKey
                  const isDisabled = !!loadingPlan
                  const onClick = () => { 
                    if (isDisabled || loadingPlan) return;
                    setLoadingPlan(planKey);
                    
                    // Ensure currency is always defined (fallback to USD)
                    const safeCurrency = currency || 'USD';
                    
                    try { onSelect(planKey, isYearly?'yearly':'monthly', safeCurrency) } catch (e) {
                      setLoadingPlan(null); // Reset on error
                    } 
                  }
                  return plan.highlight ? (
                    <button
                      onClick={onClick}
                      disabled={isDisabled}
                      className={`w-full h-9 md:h-10 rounded-full text-xs font-semibold transition-colors ${isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}`}
                      style={{
                        background: `linear-gradient(to bottom, ${wlMain}, ${wlAccent})`,
                        border: `1px solid ${wlMain}`,
                        color: wlBtnText,
                        boxShadow: `0 4px 24px ${hexWithAlpha(mixHex(wlMain, wlAccent, 0.5), 0.45)}`,
                      }}
                    >
                      {isLoading ? renderSpinner() : 'Subscribe'}
                    </button>
                  ) : (
                    <button
                      onClick={onClick}
                      disabled={isDisabled}
                      className={`group w-full h-9 md:h-10 rounded-full text-xs font-semibold ${isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'} text-white/90 border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-shadow`}
                      style={{ background: hexWithAlpha(wlMain, 0.12) }}
                    >
                      <span className="transition-colors text-white group-hover:text-white">{isLoading ? renderSpinner() : 'Subscribe'}</span>
                    </button>
                  )
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowToAccess({ renderTrigger = true }: { renderTrigger?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const wlMain = normalizeHex(String((typeof window !== 'undefined' ? (window as any).__wl_main : '') || '#9541e0'), '#9541e0')
  const wlAccent = normalizeHex(String((typeof window !== 'undefined' ? (window as any).__wl_accent : '') || '#7c30c7'), '#7c30c7')
  const wlText = bestTextColorOn(mixHex(wlMain, wlAccent, 0.5))
  const isEcomEfficiencyAppHost = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    try { return String(window.location.hostname || '').toLowerCase() === 'app.ecomefficiency.com' } catch { return false }
  }, [])
  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))
  React.useEffect(() => {
    const handler = () => { setOpen(true); setStep(1) }
    window.addEventListener('ee-open-howto', handler as any)
    ;(window as any).__eeOpenHowTo = () => { setOpen(true); setStep(1) }
    return () => window.removeEventListener('ee-open-howto', handler as any)
  }, [])
  return (
    <>
      {renderTrigger && (
        <div className="mt-6 text-sm text-gray-400 flex items-center gap-2">
          <span>How to access the tools?</span>
          <button
            onClick={() => { setOpen(true); setStep(1) }}
            className="underline cursor-pointer"
            style={{ color: isEcomEfficiencyAppHost ? "#9541e0" : wlAccent }}
          >
            Open the 3‑step demo
          </button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">How to access the tools</h3>
              <button className="text-white/70 hover:text-white" onClick={() => setOpen(false)}>✕</button>
            </div>
            {step === 1 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step1.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">
                  Download AdsPower (64-bit) from the official website and install it. Link:{" "}
                  <a className="underline" style={{ color: wlMain }} href="https://activity.adspower.com/" target="_blank" rel="noreferrer">
                    adspower.com
                  </a>
                  .
                </p>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step2.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">Sign in to AdsPower with the logins you see on the app.</p>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="h-48 rounded-lg overflow-hidden mb-3 border border-white/10 bg-black">
                  <video src="/adspower-step3.mp4" className="w-full h-full object-cover" autoPlay muted playsInline loop />
                </div>
                <p className="text-gray-300 text-sm">Open now the profile you want to access the tools hub.</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button onClick={prev} disabled={step===1} className={`px-3 py-2 rounded-md border border-white/20 ${step===1 ? 'text-gray-500 cursor-not-allowed' : 'text-white hover:bg-white/10 cursor-pointer'}`}>Prev</button>
              <div className="text-xs text-gray-400">Step {step}/3</div>
              <button
                onClick={next}
                disabled={step===3}
                className={`px-3 py-2 rounded-md ${step===3 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
                style={step===3 ? undefined : { background: wlMain, color: wlText }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CopyButton({ value, label, disabled = false, toolName, fieldType }: { value?: string; label: string; disabled?: boolean; toolName?: string; fieldType?: 'password' | 'email' | 'username' }) {
  const [copied, setCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const audioCtxRef = React.useRef<any>(null)

  const wl = React.useMemo(() => {
    try {
      if (typeof window === 'undefined') return null
      const mainRaw = String((window as any)?.__wl_main || '').trim()
      const accentRaw = String((window as any)?.__wl_accent || '').trim()
      if (!mainRaw || !accentRaw) return null
      const main = normalizeHex(mainRaw, '#9541e0')
      const accent = normalizeHex(accentRaw, main)
      return { main, accent }
    } catch {
      return null
    }
  }, [])

  const playClick = async () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx()
      const ctx = audioCtxRef.current as AudioContext
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.08
      osc.connect(gain)
      gain.connect(ctx.destination)
      const now = ctx.currentTime
      osc.start(now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.stop(now + 0.13)
    } catch {}
  }

  const onCopy = async () => {
    if (!value || disabled) return
    try {
      await navigator.clipboard.writeText(value)
      await playClick()
      setCopied(true)
      setOpen(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1200)

      const action = fieldType === 'password' ? 'copy_password' : fieldType === 'email' ? 'copy_email' : 'copy_username'
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        if (data.user) {
          fetch('/api/activity/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: data.user.id,
              email: data.user.email || null,
              action,
              tool_name: toolName || null,
            }),
          }).catch(() => {})
        }
      } catch {}
    } catch {}
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCopy}
            aria-label={label}
            disabled={disabled}
            className={`relative w-9 h-9 rounded-[10px] flex items-center justify-center border outline-none transition-colors ${
              disabled
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60 border-white/10'
                : wl
                  ? 'cursor-pointer bg-[color:var(--wl_copy_bg)] hover:bg-[color:var(--wl_copy_bg_hover)] border-[color:var(--wl_copy_border)] text-white'
                  : 'cursor-pointer bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-[#cfd3d8] border-[#8B5CF6]/40'
            } ${copied ? 'outline outline-1 outline-white border-white/60' : ''}`}
            style={
              wl
                ? ({
                    ['--wl_copy_bg' as any]: hexWithAlpha(wl.main, 0.18),
                    ['--wl_copy_bg_hover' as any]: hexWithAlpha(wl.main, 0.28),
                    ['--wl_copy_border' as any]: hexWithAlpha(wl.accent, 0.42),
                  } as any)
                : undefined
            }
          >
            <span className="sr-only">{label}</span>
            {!copied ? (
              <Clipboard className="w-4 h-4" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M9.707 19.121a.997.997 0 0 1-1.414 0l-5.646-5.647a1.5 1.5 0 0 1 0-2.121l.707-.707a1.5 1.5 0 0 1 2.121 0L9 14.171l9.525-9.525a1.5 1.5 0 0 1 2.121 0l.707.707a1.5 1.5 0 0 1 0 2.121z"/></svg>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white text-black border-white">
          {disabled ? 'Subscribe to copy' : (copied ? 'Copied!' : 'Copy to clipboard')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type ToolCredentials = {
  updatedAt?: string;
  // Legacy/starter
  adspower_email?: string;
  adspower_password?: string;
  // Explicit starter keys
  adspower_starter_email?: string;
  adspower_starter_password?: string;
  // Pro keys
  adspower_pro_email?: string;
  adspower_pro_password?: string;
  note?: string;
  brainfm_username?: string;
  brainfm_password?: string;
  canva_invite_url?: string;
};

function SafeSecret({ value, reveal }: { value?: string; reveal?: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = React.useState(false)
  const shown = reveal && hover
  React.useEffect(() => {
    if (!shown || !value) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.font = font
    ctx.fillStyle = '#fff'
    const text = value
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width) + 4
    canvas.height = 20
    ctx.font = font
    ctx.fillStyle = '#fff'
    ctx.fillText(text, 2, 14)
  }, [shown, value])
  return (
    <span className="inline-flex items-center">
      {!shown && <span className="select-none text-white">••••••••</span>}
      <canvas ref={canvasRef} style={{ display: shown ? 'inline-block' : 'none', verticalAlign: 'middle' }} />
    </span>
  )
}

function CredentialsPanel({
  whiteLabel,
  partnerSlug,
  brandColors,
  preview = false,
}: {
  whiteLabel: boolean;
  partnerSlug?: string;
  brandColors?: { main?: string; accent?: string };
  preview?: boolean;
}) {
  const wlMain = normalizeHex(String(brandColors?.main || (typeof window !== 'undefined' ? (window as any).__wl_main : '') || '#9541e0'), '#9541e0')
  const wlAccent = normalizeHex(String(brandColors?.accent || (typeof window !== 'undefined' ? (window as any).__wl_accent : '') || '#7c30c7'), '#7c30c7')
  const wlText = bestTextColorOn(mixHex(wlMain, wlAccent, 0.5))
  const isEcomEfficiencyAppHost = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    try { return String(window.location.hostname || '').toLowerCase() === 'app.ecomefficiency.com' } catch { return false }
  }, [])
  const [creds, setCreds] = useState<ToolCredentials | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wlMeta, setWlMeta] = React.useState<any>(null)
  const [debugAdsPowerLoading, setDebugAdsPowerLoading] = React.useState(false)

  // Declared before credentials fetch so we can refetch when verify() fills email / stripe_customer_id.
  const [plan, setPlan] = React.useState<'checking'|'inactive'|'starter'|'pro'>('checking')
  const [banner, setBanner] = React.useState<string | null>(null)
  const [showBilling, setShowBilling] = React.useState(false)
  const [partnerCheckoutPending, setPartnerCheckoutPending] = React.useState(false)
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [seoModalOpen, setSeoModalOpen] = React.useState(false)
  const [adspowerOtpBusy, setAdspowerOtpBusy] = React.useState(false)
  const [adspowerOtpCode, setAdspowerOtpCode] = React.useState<string | null>(null)
  const [adspowerOtpErr, setAdspowerOtpErr] = React.useState<string | null>(null)

  const fetchAdsPowerEmailCode = React.useCallback(async () => {
    if (!isEcomEfficiencyAppHost) return
    setAdspowerOtpErr(null)
    setAdspowerOtpCode(null)
    setAdspowerOtpBusy(true)
    try {
      const { data: sessionWrap } = await supabase.auth.getSession()
      const token = sessionWrap?.session?.access_token
      if (!token) {
        setAdspowerOtpErr("Sign in required.")
        return
      }
      const r = await fetch("/api/adspower/otp", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        const err = String((j as any)?.error || "")
        const msg =
          err === "subscription_required"
            ? "Active Starter or Pro subscription required."
            : err === "forbidden_host"
              ? "This action is only available on the main app."
              : err === "not_available"
                ? "Not available on this workspace."
                : String((j as any)?.error || "Could not fetch code")
        setAdspowerOtpErr(msg)
        return
      }
      const c = String((j as any)?.code || "").trim()
      if (c) setAdspowerOtpCode(c)
      else setAdspowerOtpErr("No code received in the last minute. Trigger a new AdsPower email, then try again.")
    } catch {
      setAdspowerOtpErr("Network error. Try again.")
    } finally {
      setAdspowerOtpBusy(false)
    }
  }, [isEcomEfficiencyAppHost])

  useEffect(() => {
    let active = true;
    let authUnsub: (() => void) | null = null;

    const fetchCreds = async () => {
      try {
        let simulateSlow = false
        try {
          if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            simulateSlow = url.searchParams.get('debug_adspower_loading') === '1'
          }
        } catch {}
        if (simulateSlow) {
          try { setDebugAdsPowerLoading(true) } catch {}
          try {
            let pulses = 0
            const id = window.setInterval(() => {
              pulses += 1
              try { setLoading(true) } catch {}
              if (pulses >= 16) {
                try { window.clearInterval(id) } catch {}
              }
            }, 250)
          } catch {}
        }

        const mod = await import("@/integrations/supabase/client");
        const { data: sessionWrap } = await mod.supabase.auth.getSession();
        let user = sessionWrap?.session?.user;
        if (!user) {
          const { data } = await mod.supabase.auth.getUser();
          user = data.user ?? undefined;
        }
        const sessionEmail = (user?.email || '').trim();
        const sessionCustomerId = String(((user?.user_metadata as any) || {}).stripe_customer_id || '').trim();
        const effectiveEmail = (email || sessionEmail || '').trim();
        const effectiveCustomerId = (customerId || sessionCustomerId || '').trim();

        let detectedPartnerSlug = partnerSlug;
        if (!detectedPartnerSlug && typeof window !== 'undefined') {
          detectedPartnerSlug = (window as any).__wl_partner_slug;
        }
        const headers: Record<string, string> = {};
        if (effectiveEmail) headers['x-user-email'] = effectiveEmail;
        if (effectiveCustomerId) headers['x-stripe-customer-id'] = effectiveCustomerId;
        if (whiteLabel && detectedPartnerSlug && !isMainEcomEfficiencyWorkspaceHost())
          headers["x-partner-slug"] = String(detectedPartnerSlug);

        if (!effectiveEmail && !effectiveCustomerId) {
          if (active) {
            setCreds(null);
            setError(null);
            setLoading(false);
          }
          return;
        }

        const res = await fetch('/api/credentials', { headers, cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load');
        }
        const json = await res.json();

        if (simulateSlow) {
          try { await new Promise((r) => setTimeout(r, 4500)) } catch {}
        }
        try {
          const wl = (json as any)?._wl
          console.log('[WL][credentials] fetch', {
            host: (typeof window !== 'undefined' ? window.location.host : ''),
            whiteLabel,
            detectedPartnerSlug,
            api_wl: wl || null,
            hasAdsPowerEmail: Boolean((json as any)?.adspower_email || (json as any)?.adspower_starter_email || (json as any)?.adspower_pro_email),
            updatedAt: (json as any)?.updatedAt || null,
          })
        } catch {}

        if (active) {
          try { setWlMeta((json as any)?._wl || null) } catch {}
          setCreds(json);
          setError(null);
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        try { setDebugAdsPowerLoading(false) } catch {}
        if (active) setLoading(false);
      }
    };

    fetchCreds();

    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!active) return;
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          if (!active) return;
          if (event === 'SIGNED_OUT') {
            setCreds(null);
            setLoading(false);
            return;
          }
          fetchCreds();
        }
      });
      authUnsub = () => {
        try { data.subscription.unsubscribe(); } catch {}
      };
    }).catch(() => {});

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchCreds();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const refreshMs = whiteLabel ? 30000 : 300000;
    const id = setInterval(fetchCreds, refreshMs);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      try { authUnsub?.(); } catch {}
    };
  }, [whiteLabel, partnerSlug, email, customerId, plan]);

  // Intentionally left empty: copying handled by CopyButton below

  // If user clicks "Manage billing" from /subscription while not subscribed, open the paywall in /app.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('billing') === '1') {
        if (!preview) setShowBilling(true)
        url.searchParams.delete('billing')
        window.history.replaceState({}, '', url.toString())
      }
    } catch {}
  }, [preview])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const tryVerify = async () => {
        try {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
          const checkoutSessionId = String(urlParams?.get('session_id') || '')

          const mod = await import("@/integrations/supabase/client")
          const { data: sw } = await mod.supabase.auth.getSession()
          let user = sw.session?.user
          if (!user) {
            const { data } = await mod.supabase.auth.getUser()
            user = data.user ?? undefined
          }
          const email = user?.email
          setEmail(email || null)
          setUserId(user?.id || null)
          const meta = (user?.user_metadata as any) || {}
          setCustomerId(meta.stripe_customer_id || null)
          const res = await fetch('/api/stripe/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(email ? { 'x-user-email': email } : {}),
              ...(meta.stripe_customer_id ? { 'x-stripe-customer-id': meta.stripe_customer_id } : {}),
              ...(whiteLabel &&
              partnerSlug &&
              typeof window !== "undefined" &&
              !isMainEcomEfficiencyWorkspaceHost()
                ? { "x-partner-slug": String(partnerSlug) }
                : {}),
            },
            body: JSON.stringify({ email, session_id: checkoutSessionId || undefined })
          })
          const json = await res.json().catch(() => ({}))
          if (json?.ok && json?.active) {
            const cid = (json as any).customer_id
            if (cid && typeof cid === 'string') setCustomerId(cid)
            const src = String((json as any).source || '').toLowerCase()
            const pl = String((json as any).plan || '').toLowerCase()
            const legacyOnly = src === 'legacy' || pl === 'legacy'
            if (legacyOnly) {
              setPlan('inactive')
              setBanner(
                'Legacy billing is not linked to current tool access. Subscribe on the current plans to use AdsPower and the hub.'
              )
              try { setShowBilling(true) } catch {}
              return true
            }
            setPlan(json.plan==='pro' ? 'pro' : 'starter')
            setBanner(null)
            try { setShowBilling(false) } catch {}
            return true
          }
        } catch {}
        return false
      }

      // If we just signed in, be patient and retry more times before showing billing
      let justSignedIn = false
      let justPaid = false
      try {
        const h = (typeof window !== 'undefined' ? window.location.hash : '') || ''
        const s = (typeof window !== 'undefined' ? new URL(window.location.href).searchParams : null)
        justSignedIn = (/just_signed_in=1/.test(h) || (s && s.get('just') === '1')) || false
        const hasStripeReturnParams = Boolean(s && (s.get('checkout') === 'success' || s.get('session_id') || s.get('payment_intent') || s.get('redirect_status')))
        let pendingFresh = false
        try {
          const pendingRaw = typeof window !== 'undefined' ? window.localStorage.getItem('__ee_pending_checkout') : null
          let pendingAt = 0
          if (pendingRaw) {
            try { pendingAt = Number(JSON.parse(pendingRaw)?.at || 0) } catch { pendingAt = Number(pendingRaw) || 0 }
          }
          pendingFresh = pendingAt > 0 && (Date.now() - pendingAt) < 1000 * 60 * 60 * 6
        } catch {}
        justPaid = Boolean(hasStripeReturnParams || pendingFresh)
      } catch {}

      const maxAttempts = (justSignedIn || justPaid) ? 15 : 3
      const delayMs = (justSignedIn || justPaid) ? 1200 : 800
      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        const ok = await tryVerify()
        if (ok) return
        await new Promise(r => setTimeout(r, delayMs))
      }

      if (!cancelled) {
        setPlan('inactive')
        setBanner('No active subscription. Go to Pricing to subscribe.')
        // In preview (partners dashboard), NEVER open fixed overlays (they escape the preview frame).
        if (!preview && !justPaid) setShowBilling(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // White-label: remember chosen billing interval from landing (/signup?plan=month|year or localStorage)
  const [wlBilling, setWlBilling] = React.useState<null | 'month' | 'year'>(null)
  const [wlPricing, setWlPricing] = React.useState<{
    currency?: string;
    offerTitle?: any;
    monthlyPrice?: any;
    yearlyPrice?: any;
    annualDiscountPercent?: any;
  } | null>(null)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!whiteLabel) return
    try {
      const url = new URL(window.location.href)
      const qp = String(url.searchParams.get('plan') || '').toLowerCase()
      const host = window.location.host
      const stored = host ? (window.localStorage.getItem(`__wl_billing:${host}`) || '') : ''
      const next = (qp === 'year' || qp === 'month') ? (qp as any) : (stored === 'year' || stored === 'month' ? (stored as any) : null)
      if (next) {
        setWlBilling(next)
        if (host) window.localStorage.setItem(`__wl_billing:${host}`, next)
      }
    } catch {}
  }, [whiteLabel])

  // White-label: fetch partner pricing for displaying the paywall
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!whiteLabel) return
    if (!partnerSlug) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/partners/config?slug=${encodeURIComponent(partnerSlug)}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        const cfg = json?.config || {}
        if (cancelled) return
        setWlPricing({
          currency: cfg?.currency,
          offerTitle: cfg?.offerTitle || cfg?.promoTitle,
          monthlyPrice: cfg?.monthlyPrice,
          yearlyPrice: cfg?.yearlyPrice,
          annualDiscountPercent: cfg?.annualDiscountPercent,
        })
      } catch {}
    })()
    return () => { cancelled = true }
  }, [whiteLabel, partnerSlug])

  const openPortal = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      try { e?.preventDefault() } catch {}
      try { e?.stopPropagation() } catch {}
      if (typeof window === 'undefined') return
      const mod = await import("@/integrations/supabase/client");
      const { data } = await mod.supabase.auth.getUser();
      const user = data?.user;
      const userEmail = user?.email || email || null;
      const userMeta = (user?.user_metadata as any) || {};
      const stripeCustomerFromMeta = (userMeta?.stripe_customer_id as string | undefined) || null;
      const resolvedCustomerId = customerId || stripeCustomerFromMeta;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (resolvedCustomerId) headers['x-stripe-customer-id'] = resolvedCustomerId;
      if (userEmail) headers['x-user-email'] = userEmail;
      if (user?.id || userId) headers['x-user-id'] = String(user?.id || userId);

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers,
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.url) {
        window.location.href = String(json.url);
        return;
      }

      // Keep old paywall/modal fallback for users without Stripe customer yet.
      try { setShowBilling(true) } catch {}
      try { setBanner('Unable to open billing portal right now. Please try again.') } catch {}
      return

    } catch {
      try { setShowBilling(true) } catch {}
      try { setBanner('Unable to open billing portal right now. Please try again.') } catch {}
    }
  }

  const startCheckout = async (tier: 'starter' | 'pro', billing: 'monthly' | 'yearly', currency?: 'EUR' | 'USD') => {
    // console.log('[App startCheckout] 📥 Received params:', { tier, billing, currency });
    
    // Use the currency detected by the pricing modal, fallback to USD if undefined
    const safeCurrency = currency || 'USD';
    // console.log('[App startCheckout] ✅ Safe currency:', safeCurrency);
    
    try {
      // Mark that a checkout was initiated so confetti can fire even if success URL loses `checkout=success`.
      try {
        localStorage.setItem('__ee_pending_checkout', JSON.stringify({ at: Date.now(), tier, billing, currency: safeCurrency }))
      } catch {}

      // Get user info for checkout
      const mod = await import("@/integrations/supabase/client");
      const { data } = await mod.supabase.auth.getUser();
      const email = data.user?.email;
      const userId = data.user?.id;
      const meta = (data.user?.user_metadata as any) || {};
      const stripeCustomerFromMeta = meta.stripe_customer_id as string | undefined;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (email) headers['x-user-email'] = email;
      if (userId) headers['x-user-id'] = userId;
      if (stripeCustomerFromMeta) headers['x-stripe-customer-id'] = stripeCustomerFromMeta;

      // Starter → Pro: Stripe prorates (credit unused Starter time toward Pro) instead of charging full Pro on a second checkout.
      if (tier === 'pro' && plan === 'starter' && email) {
        const upRes = await fetch('/api/stripe/upgrade', {
          method: 'POST',
          headers,
          body: JSON.stringify({ billing, currency: safeCurrency }),
        });
        const upJson = await upRes.json().catch(() => ({}));
        if (upRes.ok && upJson?.ok && upJson.portal_url) {
          window.location.href = String(upJson.portal_url);
          return;
        }
      }
      
      // Call Stripe checkout API directly
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tier, billing, currency: safeCurrency })
      });
      
      const json = await res.json();
      if (!res.ok || !json.url) {
        const errorMsg = json.message || json.error || 'Failed to start checkout';
        console.error('[App startCheckout] Error:', errorMsg);
        // Fallback to old checkout page if API fails
        window.location.href = `/checkout?tier=${tier}&billing=${billing}&currency=${safeCurrency}`;
        return;
      }
      
      // Redirect directly to Stripe Checkout
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (error: any) {
      console.error('[App startCheckout] Exception:', error);
      // Fallback to old checkout page on error
      window.location.href = `/checkout?tier=${tier}&billing=${billing}&currency=${safeCurrency}`;
    }
  }

  const startPartnerCheckout = async (interval: 'month' | 'year') => {
    if (!partnerSlug) return
    try {
      setPartnerCheckoutPending(true)
      // Prefill customer email in Stripe Checkout if logged in
      let userEmail = email
      try {
        if (!userEmail) {
          const mod = await import("@/integrations/supabase/client")
          const { data } = await mod.supabase.auth.getUser()
          userEmail = data.user?.email || null
        }
      } catch {}
      const res = await fetch('/api/partners/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: partnerSlug, interval, email: userEmail || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok || !json?.url) {
        const msg = String(json?.detail || json?.error || 'Checkout failed')
        setBanner(msg)
        setPartnerCheckoutPending(false)
        return
      }
      window.location.href = String(json.url)
    } catch (e: any) {
      setBanner(e?.message || 'Checkout failed')
      setPartnerCheckoutPending(false)
    }
  }

  if (plan === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <>
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          AdsPower Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {banner ? (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between gap-3">
            <span>{banner}</span>
            <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBilling(true)}
                        className="px-3 py-1 rounded-md text-sm font-semibold"
                        style={
                          isEcomEfficiencyAppHost
                            ? {
                                background: 'linear-gradient(to bottom, #9541e0, #7c30c7)',
                                border: '1px solid #9541e0',
                                color: '#ffffff',
                                boxShadow: '0 4px 24px rgba(149,65,224,0.45)',
                              }
                            : { background: "rgb(141, 7, 7)", color: "rgb(255, 255, 255)" }
                        }
                      >
                        Subscribe
                      </button>
              <button type="button" onClick={openPortal} className="px-3 py-1 rounded-md border border-white/20 text-white hover:bg-white/10">Manage billing</button>
            </div>
          </div>
        ) : null}
        {(() => {
          try {
            if (typeof window === 'undefined') return null
            const url = new URL(window.location.href)
            const debug = url.searchParams.get('debug') === '1'
            if (!debug) return null
            return (
              <div className="text-[11px] rounded-md border border-white/10 bg-black/40 text-gray-300 px-3 py-2">
                <div className="text-gray-400">WL debug</div>
                <div>host: <span className="text-white">{String(wlMeta?.host || window.location.host || '—')}</span></div>
                <div>partnerSlug: <span className="text-white">{String(wlMeta?.partnerSlug || '—')}</span></div>
                <div>partnerSlugSource: <span className="text-white">{String(wlMeta?.partnerSlugSource || '—')}</span></div>
                <div>partnerDomainMapped: <span className="text-white">{String(wlMeta?.partnerDomainMapped)}</span></div>
                <div>partnerCredsApplied: <span className="text-white">{String(wlMeta?.partnerCredsApplied)}</span></div>
                <div>updatedAt: <span className="text-white">{String((creds as any)?.updatedAt || '—')}</span></div>
              </div>
            )
          } catch {
            return null
          }
        })()}
        {debugAdsPowerLoading ? (
          <div className="text-xs text-yellow-200 border border-yellow-500/30 bg-yellow-500/10 rounded-md px-3 py-2">
            Debug: simulating AdsPower logs loading…
          </div>
        ) : null}
        {(() => {
          if (error) {
            return <p className="text-red-400 text-sm">{error}</p>;
          }
          
          if (!creds || loading) {
            return <p className="text-gray-400 text-sm">Loading…</p>;
          }
          
          if (plan === 'inactive') {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <div className="group flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`break-all text-white filter blur-sm select-none cursor-not-allowed`}>
                            ••••••••
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-white text-black border-white">Subscribe to reveal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <CopyButton value={undefined} label="Copy email" disabled={true} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Password</p>
                  <div className="group flex items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`break-all text-white filter blur-sm select-none cursor-not-allowed`}>
                            ••••••••
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-white text-black border-white">Subscribe to reveal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <CopyButton value={undefined} label="Copy password" disabled={true} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                    <span>How to access the tools?</span>
                    <button 
                      onClick={() => { 
                        try { 
                          if (typeof (window as any).__eeOpenHowTo === 'function') {
                            (window as any).__eeOpenHowTo();
                          } else {
                            window.dispatchEvent(new CustomEvent('ee-open-howto'));
                          }
                        } catch {} 
                      }} 
                      className="underline cursor-pointer"
                    style={{ color: isEcomEfficiencyAppHost ? "#9541e0" : wlAccent }}
                    >
                      Open the 3‑step demo
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          
          // Show credentials if we have them (checking, starter, or pro)
          const hasProCreds = !!(creds.adspower_pro_email || creds.adspower_pro_password);
          const hasStarterCreds = !!(creds.adspower_email || creds.adspower_password || creds.adspower_starter_email || creds.adspower_starter_password);
          const hasAnyCreds = !!(creds.adspower_email || creds.adspower_starter_email || creds.adspower_pro_email);

          /* console.log('[CREDENTIALS] Display check:', {
            plan,
            hasProCreds,
            hasStarterCreds,
            hasAnyCreds,
            credsKeys: Object.keys(creds || {})
          }); */

          const currentPlan = plan as string; // Type assertion to avoid flow narrowing issues

          if (
            (currentPlan === 'starter' || currentPlan === 'pro') &&
            !hasProCreds &&
            !hasStarterCreds &&
            !hasAnyCreds
          ) {
            return (
              <div className="space-y-3 text-sm">
                <p className="text-amber-100/90 leading-relaxed">
                  Your subscription looks active, but AdsPower credentials are not available yet. This often happens when a payment is{' '}
                  <span className="font-semibold text-amber-200">past due</span> on one account while access is still granted via the legacy
                  billing check — or when the app is still syncing.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setShowBilling(true);
                      } catch {}
                    }}
                    className="px-3 py-1.5 rounded-md text-sm font-semibold cursor-pointer hover:brightness-110"
                    style={
                      isEcomEfficiencyAppHost
                        ? {
                            background: 'linear-gradient(to bottom, #9541e0, #7c30c7)',
                            border: '1px solid #9541e0',
                            color: '#ffffff',
                            boxShadow: '0 4px 24px rgba(149,65,224,0.45)',
                          }
                        : { background: wlMain, color: wlText }
                    }
                  >
                    View plans
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        void openPortal();
                      } catch {}
                    }}
                    className="px-3 py-1.5 rounded-md text-sm border border-white/20 text-white hover:bg-white/10 cursor-pointer"
                  >
                    Update payment
                  </button>
                </div>
              </div>
            );
          }

          if ((currentPlan === 'pro' && hasProCreds) || (currentPlan === 'starter' && hasStarterCreds) || (currentPlan === 'checking' && hasAnyCreds)) {
            // Compute values once to avoid repeated type checks in JSX
            const displayEmail = currentPlan === 'pro' 
              ? (creds.adspower_pro_email || '') 
              : currentPlan === 'checking' 
                ? (creds.adspower_starter_email || creds.adspower_email || creds.adspower_pro_email || '') 
                : (creds.adspower_email || creds.adspower_starter_email || '');
                
            const displayPassword = currentPlan === 'pro'
              ? (creds.adspower_pro_password || '')
              : currentPlan === 'checking'
                ? (creds.adspower_starter_password || creds.adspower_password || creds.adspower_pro_password || '')
                : (creds.adspower_password || creds.adspower_starter_password || '');
                
            const emailValue = currentPlan === 'pro'
              ? creds.adspower_pro_email
              : currentPlan === 'checking'
                ? (creds.adspower_starter_email || creds.adspower_email || creds.adspower_pro_email)
                : (creds.adspower_email || creds.adspower_starter_email);
                
            const passwordValue = currentPlan === 'pro'
              ? creds.adspower_pro_password
              : currentPlan === 'checking'
                ? (creds.adspower_starter_password || creds.adspower_password || creds.adspower_pro_password)
                : (creds.adspower_password || creds.adspower_starter_password);

            const showAdsPowerOtpGetCode =
              !preview &&
              !whiteLabel &&
              isEcomEfficiencyAppHost &&
              (currentPlan === "starter" || currentPlan === "pro");
            const adGridCols = showAdsPowerOtpGetCode
              ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-start"
              : "grid grid-cols-1 md:grid-cols-2 gap-4";
            const adWideSpan = showAdsPowerOtpGetCode ? "md:col-span-3" : "md:col-span-2";
            
            return (
          <div className={adGridCols}>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {displayEmail}
                </span>
                <CopyButton value={emailValue} label="Copy email" toolName="adspower" fieldType="email" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Password</p>
              <div className="group flex items-center gap-2">
                <span className={`break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none`}>
                  {displayPassword}
                </span>
                <CopyButton value={passwordValue} label="Copy password" toolName="adspower" fieldType="password" />
              </div>
            </div>
            {showAdsPowerOtpGetCode ? (
              <div className="flex flex-col gap-2 md:justify-self-end md:border-l md:border-white/10 md:pl-4 pt-1 md:pt-0">
                <p className="text-xs text-gray-400">Email code</p>
                <button
                  type="button"
                  disabled={adspowerOtpBusy}
                  onClick={() => void fetchAdsPowerEmailCode()}
                  className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
                >
                  {adspowerOtpBusy ? "Fetching…" : "Get the code"}
                </button>
                {adspowerOtpCode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-emerald-300">{adspowerOtpCode}</span>
                    <CopyButton value={adspowerOtpCode} label="Copy code" toolName="adspower" fieldType="username" />
                  </div>
                ) : null}
                {adspowerOtpErr ? <p className="text-[11px] text-amber-200/90 max-w-[14rem] leading-snug">{adspowerOtpErr}</p> : null}
                <p className="text-[10px] text-gray-500 max-w-[14rem] leading-snug">
                  Uses the latest AdsPower email (about the last minute) from the shared mailboxes.
                </p>
              </div>
            ) : null}
            <p className={`text-xs text-gray-500 ${adWideSpan}`}>Last update: {creds?.updatedAt ? new Date(creds.updatedAt).toLocaleString() : '—'}</p>

            {/* Single AdsPower block: shows Starter creds for Starter, Pro creds for Pro */}

            {/* Brain.fm credentials */}
            {Boolean(creds?.brainfm_username || creds?.brainfm_password) && (
              <div className={adWideSpan}>
                <div className="text-white font-semibold mb-2 flex items-center gap-2">
                  <img src="/tools-logos/brain.png" alt="Brain.fm" className="w-6 h-6 object-contain" />
                  <span>Brain.fm</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Username</p>
                    <div className="group flex items-center gap-2">
                      <span className="break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none">{creds?.brainfm_username || '—'}</span>
                      <CopyButton value={creds?.brainfm_username} label="Copy username" toolName="brainfm" fieldType="username" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Password</p>
                    <div className="group flex items-center gap-2">
                      <span className="break-all text-white filter blur-sm transition ease-out duration-300 hover:blur-none group-hover:blur-none select-none">{creds?.brainfm_password || '—'}</span>
                      <CopyButton value={creds?.brainfm_password} label="Copy password" toolName="brainfm" fieldType="password" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Use these logins in your own browser to access Brain.fm.</p>
              </div>
            )}

            {/* How to access (also for subscribed users) */}
            <div className={adWideSpan}>
              <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                <span>How to access the tools?</span>
                <button 
                  onClick={() => { 
                    try { 
                      // Prefer direct function call to avoid event dispatching issues with workers
                      if (typeof (window as any).__eeOpenHowTo === 'function') {
                        (window as any).__eeOpenHowTo();
                      } else {
                        // Fallback only if function not found
                        window.dispatchEvent(new CustomEvent('ee-open-howto'));
                      }
                    } catch {} 
                  }} 
                  className="underline cursor-pointer"
                  style={{ color: isEcomEfficiencyAppHost ? "#9541e0" : wlAccent }}
                >
                  Open the 3‑step demo
                </button>
              </div>
            </div>
          </div>
            );
          }
          
          return <div className="text-gray-400 text-sm">Waiting for credentials…</div>;
        })()}
      </CardContent>
    </Card>
    <button id="howto-modal-open" className="hidden" />
    {showBilling && !preview ? (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2" onClick={() => setShowBilling(false)}>
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 w-full max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-white text-lg font-semibold mb-2 text-center">Choose a subscription</h3>
          {banner && <p className="text-red-300 text-xs mb-2 text-center">{banner}</p>}
          <p className="text-gray-400 text-xs mb-3 text-center">Subscribe to unlock all features.</p>

          {!whiteLabel ? (
            <PricingCardsModal onSelect={(tier, billing, currency)=>{ 
              try { trackDatafastGoal('subscribe_button_click', { plan: tier, billing }); } catch {}
              try { postGoal('pricing_cta_click', { plan: tier, billing }); } catch {}; 
              
              // Brevo Checkout Initiated
              if (email) {
                try {
                  const basePrice = tier === 'starter' ? 19.99 : 29.99;
                  const isYearly = billing === 'yearly';
                  const amount = isYearly ? (basePrice * 12 * 0.6) : basePrice;
                  
                  fetch('/api/brevo/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: email,
                      event: 'checkout_initiated',
                      data: { 
                        plan: tier, 
                        billing,
                        amount: Number(amount.toFixed(2)), 
                        currency: currency || 'USD',
                        name: email.split('@')[0] // Basic fallback name
                      }
                    })
                  }).catch(() => {});
                } catch {}
              }

              startCheckout(tier, billing, currency) 
            }} onOpenSeoModal={()=>setSeoModalOpen(true)} />
          ) : (
            <WhiteLabelPricingModal
              billing={wlBilling}
              onPick={(b) => {
                setWlBilling(b)
                try { if (typeof window !== 'undefined') localStorage.setItem(`__wl_billing:${window.location.host}`, b) } catch {}
              }}
              onContinue={() => {
                const b = wlBilling || 'month'
                startPartnerCheckout(b)
              }}
              loading={partnerCheckoutPending}
              pricing={wlPricing || undefined}
              colors={brandColors || undefined}
            />
          )}
          {!whiteLabel ? (
            <div className="flex items-center justify-end mt-1">
              <button type="button" className="text-white/80 underline cursor-pointer text-xs" onClick={() => {}}>
                Manage billing
              </button>
            </div>
          ) : null}
        </div>
      </div>
    ) : null}
    {seoModalOpen && !preview && (
      <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={()=>setSeoModalOpen(false)}>
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-3xl max-h-[80vh] overflow-auto" onClick={(e)=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">+30 SEO Tools</h3>
            <button onClick={()=>setSeoModalOpen(false)} className="text-white/70 hover:text-white">✕</button>
          </div>
          <p className="text-gray-400 text-sm mb-3">Included tools with short descriptions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { n: 'Semrush', d: 'All‑in‑one SEO & competitive research platform.' },
              { n: 'Ubersuggest', d: 'Keyword ideas and site SEO audits.' },
              { n: 'Academun', d: 'Academic writing and research helper.' },
              { n: 'WriteHuman', d: 'AI writing that preserves human tone.' },
              { n: 'SEObserver', d: 'Backlink and SERP monitoring insights.' },
              { n: 'SE Ranking', d: 'Rank tracking and site audit suite.' },
              { n: 'Flaticon', d: 'Millions of icons for web assets.' },
              { n: 'AnswerThePublic', d: 'Topic questions mined from searches.' },
              { n: '123RF', d: 'Stock photos and vectors for creatives.' },
              { n: 'Motion Array', d: 'Video templates, presets, and assets.' },
              { n: 'Artlist', d: 'Royalty‑free music and SFX library.' },
              { n: 'YourTextGuru', d: 'SEO briefs and content optimization.' },
              { n: 'Similarweb', d: 'Competitive traffic and audience data.' },
              { n: 'SurferLink', d: 'Internal linking recommendations.' },
              { n: 'Ahrefs', d: 'Backlinks, keywords, and site explorer.' },
              { n: 'Alura', d: 'Etsy SEO and product optimization.' },
              { n: 'SpyFu', d: 'Competitor PPC & SEO keyword intel.' },
              { n: 'AlsoAsked', d: 'SERP questions and topic clusters.' },
              { n: 'KeywordTool', d: 'Keyword ideas from multiple engines.' },
              { n: 'Wincher', d: 'Rank tracking with daily updates.' },
              { n: 'Serpstat', d: 'All‑in‑one SEO platform and audits.' },
              { n: 'Zonbase', d: 'Amazon product and keyword research.' },
              { n: 'QuillBot', d: 'Paraphrasing and grammar tools.' },
              { n: 'SEOptimer', d: 'On‑page audits and recommendations.' },
              { n: 'AMZScout', d: 'Amazon product validation and trends.' },
              { n: 'ZIKAnalytics', d: 'eBay product and market analysis.' },
              { n: 'Niche Scraper', d: 'Discover trending e‑commerce niches.' },
              { n: 'Dinorank', d: 'Keyword cannibalization and ranks.' },
              { n: 'SEOZoom', d: 'Italian SEO suite for rankings.' },
              { n: 'SmartScout', d: 'Amazon brand and category insights.' },
              { n: 'Freepik', d: 'Stock graphics for content creation.' },
              { n: 'SearchAtlas', d: 'SEO content and backlink tools.' },
              { n: 'Mangools', d: 'KWFinder, SERP, and backlink suite.' },
              { n: 'Sistrix', d: 'Visibility index and SEO modules.' },
              { n: 'PublicWWW', d: 'Source code search at scale.' },
              { n: 'Hunter', d: 'Email discovery and verification.' },
              { n: 'Pexda', d: 'Winning product research database.' },
              { n: 'XOVI', d: 'SEO and online marketing suite.' },
              { n: 'Smodin.io', d: 'AI writing and rewriting tools.' },
              { n: 'Ranxplorer', d: 'FR market keyword and SEO data.' },
              { n: 'BuzzSumo', d: 'Content research and influencer data.' },
              { n: 'Storyblocks', d: 'Stock videos and motion graphics.' },
              { n: 'WooRank', d: 'Website reviews and SEO checks.' },
              { n: 'Iconscout', d: 'Icons and illustrations library.' },
              { n: 'Babbar', d: 'Semantic SEO and internal meshing.' },
              { n: 'Moz', d: 'Authority metrics and SEO toolkit.' },
              { n: 'One Hour Indexing', d: 'Fast URL indexing service.' },
              { n: 'WordAI', d: 'AI rewriter for unique wording.' },
              { n: 'Jungle Scout', d: 'Amazon research and sales tracker.' },
              { n: 'Colinkri', d: 'Link prospecting and outreach.' },
              { n: 'Keysearch', d: 'Affordable keyword research suite.' },
              { n: 'TextOptimizer', d: 'Content optimization suggestions.' },
              { n: '1.fr', d: 'Semantic coverage and topic ideas.' },
              { n: 'DomCop', d: 'Expired domains with SEO metrics.' },
              { n: 'Envato Elements', d: 'Creative assets: stock, templates.' },
              { n: 'Quetext', d: 'Plagiarism checker and citations.' },
              { n: 'Majestic', d: 'Backlink index with TF/CF metrics.' },
              { n: 'Screaming Frog', d: 'Site crawler for technical SEO.' },
            ].map(t => (
              <div key={t.n} className="rounded-lg border border-white/10 p-3 bg-black/30">
                <div className="text-white font-medium text-sm">{t.n}</div>
                <div className="text-gray-400 text-xs">{t.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function PlanPicker({ onChoose }: { onChoose: (tier: 'starter'|'pro', billing: 'monthly'|'yearly') => void }) {
  const [isYearly, setIsYearly] = React.useState(true)
  const [currency, setCurrency] = React.useState<'EUR'|'USD'>(() => {
    try {
      const loc = Intl.DateTimeFormat().resolvedOptions().locale.toUpperCase()
      const eu = /(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)/
      return eu.test(loc) ? 'EUR' : 'USD'
    } catch { return 'EUR' } // Default to EUR for Europe-first approach
  })
  const fmt = (n: number) => {
    const v = currency === 'EUR' ? n : n * 1.07
    return currency === 'EUR' ? `€${v.toFixed(2)}`.replace('€', '') + '€' : `$${v.toFixed(2)}`
  }
  const price = (base: number) => {
    if (isYearly) return base * 12 * 0.6
    return base
  }
  const plans = [
    { key: 'starter' as const, name: 'Starter', baseMonthly: 19.99, features: ['Access to 40 Ecom tools'] },
    { key: 'pro' as const, name: 'Pro', baseMonthly: 29.99, features: ['All tools included in Starter', 'Info notes on unlimited credits'] },
  ]
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 text-xs text-gray-400">
          <span>Billing:</span>
          <button onClick={()=>setIsYearly(false)} className={`px-2 py-1 rounded-full ${!isYearly ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/10 cursor-pointer'}`}>Monthly</button>
          <button onClick={()=>setIsYearly(true)} className={`px-2 py-1 rounded-full ${isYearly ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/10 cursor-pointer'}`}>Annual -40%</button>
        </div>
        <div className="text-xs text-gray-500">Currency auto-detected</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map(p => (
          <button key={p.key} onClick={()=>onChoose(p.key, isYearly? 'yearly':'monthly')} className={`rounded-xl border border-white/10 hover:border-purple-400/50 p-4 text-left cursor-pointer bg-gray-900`}>
            <div className="text-white font-medium flex items-center gap-2">
              <span>{p.name}</span>
              {isYearly ? null : null}
              {/* Unlimited badge removed */}
            </div>
            <div className="text-gray-400 text-sm mt-1 mb-1">{isYearly ? 'Billed annually' : 'Monthly'}</div>
            <div className="text-white text-sm font-semibold mb-1 flex items-baseline gap-2">
              <span>{fmt(isYearly ? (p.key==='starter' ? 11.99 : 17.99) : p.baseMonthly)}</span>
            </div>
            <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
              {p.key==='starter' ? (
                <li>Access to 40 Ecom tools</li>
              ) : (
                <>
                  <li>Access +50 Ecom tools</li>
                </>
              )}
            </ul>
          </button>
        ))}
      </div>
    </div>
  )
}

function AccountSelector({ service }: { service: 'pipiads'|'elevenlabs' }) {
  if (service === 'pipiads') {
    const host = appHostBase()
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Accounts:</span>
        <a href={`${host}/pipiads/dashboard`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
        <a href={`${host}/pipiads/dashboard?acc=2`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      </div>
    )
  }
  const host = appHostBase()
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>Accounts:</span>
      <a href={`${host}/elevenlabs/reset?acc=1`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 1</a>
      <a href={`${host}/elevenlabs/reset?acc=2`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 2</a>
      <a href={`${host}/elevenlabs/reset?acc=3`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 3</a>
      <a href={`${host}/elevenlabs/reset?acc=4`} target="_blank" rel="noreferrer" className="underline hover:text-white">Account 4</a>
    </div>
  )
}

function ToolCard({ service, title, description }: { service: 'pipiads'|'elevenlabs'; title: string; description: string }) {
  const [unlocked, setUnlocked] = React.useState(false)
  React.useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/integrations/supabase/client")
        const { data } = await mod.supabase.auth.getUser()
        const meta = (data.user?.user_metadata as any) || {}
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (data.user?.email) headers['x-user-email'] = data.user.email
          if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id as string
          const r = await fetch('/api/stripe/verify', { method: 'POST', headers, body: JSON.stringify({ email: data.user?.email || '' }) })
          const j = await r.json().catch(() => ({}))
          const p = (j?.plan as string)?.toLowerCase()
          setUnlocked(Boolean(j?.ok && j?.active && p === 'pro'))
        } catch {
          const p = (meta.plan as string)?.toLowerCase()
          setUnlocked(p === 'pro')
        }
    } catch {}
    })()
  }, [])

  const logoPng = service === 'elevenlabs' ? '/tools-logos/elevenlabs.png' : '/tools-logos/pipiads.png'
  const logoSvg = service === 'elevenlabs' ? '/tools-logos/elevenlabs.svg' : '/tools-logos/pipiads.svg'
  const host = appHostBase()
  const baseLink = service === 'elevenlabs' ? `${host}/elevenlabs/reset` : `${host}/pipiads/dashboard`
  const accounts = service === 'elevenlabs' ? [1,2,3,4] : [1,2]

  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col ${unlocked ? '' : 'opacity-60'}`}>


      {/* Logo zone: full width, 3:2 aspect, rounded corners; enforce pure black background for square logos */}
      <div className="w-full aspect-[3/2] rounded-xl bg-[#000000] border border-white/10 overflow-hidden flex items-center justify-center">
        <picture>
          <source srcSet={logoPng} type="image/png" />
          <img src={logoSvg} alt={`${title} logo`} className="w-full h-full object-contain" />
        </picture>
      </div>
      {/* Info zone */}
      <div className="mt-4">
        <div className="text-white font-semibold text-lg">{title}</div>
        <div className="text-xs text-gray-400 mb-3">{description}</div>
        <div>
          <div className="text-xs text-gray-400 mb-2">Accounts</div>
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((n) => {
              const href = service === 'pipiads'
                ? (n === 1 ? baseLink : `${baseLink}?acc=${n}`)
                : `${baseLink}${baseLink.includes('?') ? '&' : '?'}acc=${n}`
  return (
                <a
                  key={n}
          href={href}
          target="_blank"
          rel="noreferrer"
                  className={`px-3 py-1.5 rounded-md text-sm border border-[#8B5CF6]/40 ${unlocked ? 'bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white' : 'bg-gray-800 text-gray-400 cursor-not-allowed pointer-events-none'}`}
                >
                  Account {n}
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoToolCard({ img, title, description, link, note, cover, disabled, small }: { img: string; title: string; description: string; link?: string; note?: string; cover?: boolean; disabled?: boolean; small?: boolean }) {
  return (
    <div className={`relative bg-gray-900 border border-white/10 rounded-2xl p-3 flex flex-col ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: small ? '16 / 9' : '3 / 2' }}>
        <Image src={img} alt={`${title} logo`} fill className={`${cover ? 'object-cover' : 'object-contain'}`} sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-4">
        <div className="text-white font-semibold text-base md:text-lg">{title}</div>
        <div className="text-xs text-gray-400 mb-3">{description}</div>
        <div className="flex items-center gap-3">
          {link && !disabled ? (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white w-max">{title === 'Canva' ? 'Join team' : 'Open'}</a>
          ) : disabled ? (
            <span className="text-xs text-gray-500">Available on paid plans</span>
          ) : (
            <span className="text-xs text-gray-500">Invite link not available yet</span>
          )}
          {note ? <span className="text-xs text-gray-400">{note}</span> : null}
        </div>
      </div>
    </div>
  )
}

function BrainCredsCard({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [wl, setWl] = React.useState<{ main: string; accent: string } | null>(null)
  React.useEffect(() => {
    let cancelled = false
    let attempts = 0
    const tryRead = () => {
      attempts++
      try {
        if (typeof window === 'undefined') return
        const mainRaw = String((window as any)?.__wl_main || '').trim()
        const accentRaw = String((window as any)?.__wl_accent || '').trim()
        if (!mainRaw || !accentRaw) return
        const main = normalizeHex(mainRaw, '#9541e0')
        const accent = normalizeHex(accentRaw, main)
        if (!cancelled) setWl({ main, accent })
      } catch {}
    }
    // WL globals are set client-side; they may arrive after first render.
    tryRead()
    const id = window.setInterval(() => {
      if (cancelled) return
      if (wl) return
      if (attempts >= 40) return window.clearInterval(id) // ~10s max
      tryRead()
    }, 250)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div onClick={() => { if (!disabled) setOpen(true) }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        {/* Keep default logo (same as ecomefficiency.com); no auto tinting */}
        <Image src="/tools-logos/brain.png" alt="Brain.fm logo" fill className="object-contain p-2" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Brain.fm</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Tap to reveal login credentials</div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={()=>setOpen(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Brain.fm credentials</h4>
              <button onClick={()=>setOpen(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm select-all">1spytools1@gmail.com</span>
                  <CopyButton value={'1spytools1@gmail.com'} label="Copy email" toolName="pipiads" fieldType="email" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm select-all">wdawdawdiajd08w@298</span>
                  <CopyButton value={'wdawdawdiajd08w@298'} label="Copy password" toolName="pipiads" fieldType="password" />
                </div>
              </div>
                  <div className="pt-1 text-[11px] text-gray-500">Use these on your own browser to sign in to Brain.fm</div>
                  <div className="pt-1">
                    <a
                      href="https://my.brain.fm/signin"
                      target="_blank"
                      rel="noreferrer noopener"
                      className={
                        wl
                          ? "inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border bg-[color:var(--wl_bfm_bg)] hover:bg-[color:var(--wl_bfm_bg_hover)] border-[color:var(--wl_bfm_border)] text-white"
                          : "inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#5c3dfa]/20 hover:bg-[#5c3dfa]/30 text-white"
                      }
                      style={
                        wl
                          ? ({
                              ['--wl_bfm_bg' as any]: hexWithAlpha(wl.main, 0.18),
                              ['--wl_bfm_bg_hover' as any]: hexWithAlpha(wl.main, 0.28),
                              ['--wl_bfm_border' as any]: hexWithAlpha(wl.accent, 0.42),
                            } as any)
                          : undefined
                      }
                    >
                      Open Brain.fm sign‑in
                    </a>
                  </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CanvaFlipCard({ inviteLink, disabled }: { inviteLink?: string | null; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const clickable = !disabled && Boolean(inviteLink)
  return (
    <div
      onClick={() => { if (clickable && inviteLink) window.open(inviteLink, '_blank', 'noreferrer') }}
      className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${
        disabled ? 'opacity-60' : clickable ? 'cursor-pointer hover:border-white/20' : 'opacity-80'
      }`}
    >
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        {/* Keep default logo (same as ecomefficiency.com); no auto tinting */}
        <Image src="/tools-logos/canva.png" alt="Canva logo" fill className="object-contain p-2" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Canva</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : inviteLink ? (
          <div className="text-[11px] text-gray-400">
            Click to open the invite and connect on your account
          </div>
        ) : (
          <div className="text-[11px] text-gray-500">
            Invite link not available yet (it will appear once credentials are loaded).
          </div>
        )}
        {!disabled && (
          <div className="mt-1 text-[10px] leading-snug text-gray-500">
            Invite link rotates monthly. If you lose access, click this card again to refresh.
          </div>
        )}
      </div>
    </div>
  )
}

function ElevenLabsCard({ disabled }: { disabled?: boolean }) {
  return (
    <div onClick={() => { if (!disabled) window.open('https://app.ecomefficiency.com/elevenlabs', '_blank', 'noreferrer') }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      {/* New Badge */}
      <div className="absolute -top-1 -right-1 z-20 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white/20 transform rotate-12 hover:rotate-0 transition-transform duration-200">
        New
      </div>
      
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/elevenlabs.png" alt="ElevenLabs logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">ElevenLabs</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Access to a 500k credits account</div>
        )}
      </div>
    </div>
  )
}

function PipiadsCard({ disabled }: { disabled?: boolean }) {
  return (
    <div onClick={() => { if (!disabled) window.open('/pipiads', '_blank', 'noreferrer') }} className={`relative bg-gray-900 border border-white/10 rounded-2xl p-2 md:p-3 flex flex-col ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-white/20'}`}>
      {/* New Badge */}
      <div className="absolute -top-1 -right-1 z-20 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white/20 transform rotate-12 hover:rotate-0 transition-transform duration-200">
        New
      </div>
      
      <div className="w-full rounded-xl bg-[#000000] border border-white/10 overflow-hidden relative" style={{ aspectRatio: '16 / 9' }}>
        <Image src="/tools-logos/pipiads.png" alt="Pipiads logo" fill className="object-contain p-2 bg-[#000000]" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="mt-2">
        <div className="text-white font-semibold text-sm md:text-base">Pipiads</div>
        {disabled ? (
          <div className="text-[11px] text-gray-400">Subscribe to access</div>
        ) : (
          <div className="text-[11px] text-gray-400">Access to a 100k credits account</div>
        )}
      </div>
    </div>
  )
}
