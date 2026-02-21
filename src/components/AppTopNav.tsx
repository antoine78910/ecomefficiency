"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { hexWithAlpha, normalizeHex } from "@/lib/color";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function AppTopNav({
  brand,
}: {
  brand?: {
    title?: string;
    logoUrl?: string;
    hideAffiliate?: boolean;
    signInPath?: string;
  };
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<'free'|'starter'|'pro'|null>(null);

  // White-label theming (fallback keeps current look for ecomefficiency.com)
  const wlMain = normalizeHex(String((typeof window !== "undefined" ? (window as any).__wl_main : "") || "#9541e0"), "#9541e0");
  const wlAccent = normalizeHex(String((typeof window !== "undefined" ? (window as any).__wl_accent : "") || "#5c3dfa"), "#5c3dfa");

  const refreshPlan = React.useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user ?? null;
      const meta = (user?.user_metadata as any) || {};
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.email) headers['x-user-email'] = user.email;
      if (meta.stripe_customer_id) headers['x-stripe-customer-id'] = meta.stripe_customer_id as string;
      
      // White-label: detect partnerSlug from global variable (set by DomainAppClient)
      let partnerSlug: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        partnerSlug = (window as any).__wl_partner_slug;
      }
      if (partnerSlug) headers['x-partner-slug'] = String(partnerSlug);
      
      // CRITICAL: ONLY trust Stripe verification, NEVER user_metadata
      try {
        const r = await fetch('/api/stripe/verify', { method: 'POST', headers, body: JSON.stringify({ email: user?.email || '' }) });
        const j = await r.json().catch(() => ({}));
        const p = (j?.plan as string)?.toLowerCase();
        
        // Only show starter/pro if subscription is ACTIVE
        if (j?.ok && j?.active === true && (p === 'starter' || p === 'pro')) {
          setPlan(p as any);
        } else {
          // No active subscription = Free plan
          setPlan('free');
        }
      } catch {
        // On error, default to free
        setPlan('free');
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const user = data.user ?? null;
        setEmail(user?.email ?? null);
        const meta = (user?.user_metadata as any) || {};
        setFirstName((meta.first_name as string) || null);
        setAvatarUrl(meta.avatar_url || null);

        // Silent affiliate provisioning (FirstPromoter) after email verification/login.
        // This is triggered only when signup stored a pending flag (e.g. /sign-up?affiliates=1).
        try {
          if (user && typeof window !== "undefined") {
            const pending = localStorage.getItem("ee_affiliate_pending") === "1";
            if (pending) {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token;
              if (token) {
                const r = await fetch("/api/firstpromoter/promoter", {
                  method: "GET",
                  headers: { Authorization: `Bearer ${token}` },
                  cache: "no-store",
                });
                if (r.ok) {
                  try { localStorage.removeItem("ee_affiliate_pending"); } catch {}
                }
              }
            }
          }
        } catch {}
      } catch {}
      await refreshPlan();
    })();
    const onVisible = () => { if (document.visibilityState === 'visible') { refreshPlan(); } };
    try { document.addEventListener('visibilitychange', onVisible); } catch {}
    const onPlanUpdated = (e: any) => {
      const p = (e?.detail?.plan as string | undefined)?.toLowerCase();
      if (p === 'starter' || p === 'pro') setPlan(p as any);
      else if (p === 'free') setPlan('free');
    };
    try { window.addEventListener('ee-plan-updated', onPlanUpdated as any); } catch {}
    return () => {
      mounted = false;
      try { document.removeEventListener('visibilitychange', onVisible); } catch {}
      try { window.removeEventListener('ee-plan-updated', onPlanUpdated as any); } catch {}
    };
  }, [refreshPlan]);

  useEffect(() => {
    // React to user metadata changes and custom profile-updated event
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const meta = (user?.user_metadata as any) || {};
      setEmail(user?.email ?? null);
      setFirstName((meta.first_name as string) || null);
    }) as any;
    const handler = (e: any) => {
      const fn = e?.detail?.first_name as string | undefined;
      if (typeof fn !== 'undefined') setFirstName(fn || null);
    };
    try { window.addEventListener('ee-profile-updated', handler); } catch {}
    return () => {
      try { window.removeEventListener('ee-profile-updated', handler); } catch {}
      try { sub?.data?.subscription?.unsubscribe?.(); } catch {}
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = brand?.signInPath || "/sign-in";
    }
  };

  return (
    <div
      className="sticky top-0 z-50 w-full h-16 border-b bg-black/50 backdrop-blur flex items-center justify-between pl-5 pr-3 gap-4"
      style={{ borderBottomColor: hexWithAlpha(wlAccent, 0.2) }}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-xl overflow-hidden">
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand?.title ? `${brand.title} Logo` : "Logo"} className="h-14 w-auto rounded-xl object-contain mix-blend-screen" />
          ) : (
            <Image src="/ecomefficiency.png" alt="Ecom Efficiency Logo" width={160} height={64} className="h-14 w-auto rounded-xl mix-blend-screen" />
          )}
        </div>
      </div>
      {email ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mt-2 focus:outline-none">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                {plan ? (
                  <span className="relative group">
                    <Crown className={`w-4 h-4 ${plan==='pro' ? 'text-yellow-400' : plan==='starter' ? 'text-gray-300' : 'text-gray-500'}`} />
                    <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white px-2 py-1 rounded bg-[#202031] border border-white/10 whitespace-nowrap">
                      {plan==='pro' ? 'Pro' : plan==='starter' ? 'Starter' : 'Free'}
                    </span>
                  </span>
                ) : null}
                <span className="text-sm text-[#cfd3d8]">{email || firstName || ''}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-[#202031]/95 backdrop-blur-xl text-white border"
            style={
              {
                borderColor: hexWithAlpha(wlAccent, 0.4),
                ["--wl-menu-hover" as any]: hexWithAlpha(wlAccent, 0.18),
              } as any
            }
          >
            <div className="px-3 py-2 text-sm border-b" style={{ borderBottomColor: hexWithAlpha(wlAccent, 0.2) }}>
              Signed in as<br />
              <span className="font-medium">{email || ''}</span>
            </div>
            <DropdownMenuItem className="hover:bg-[color:var(--wl-menu-hover)] focus:bg-[color:var(--wl-menu-hover)] cursor-pointer">
              <Link href="/account" className="w-full">Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[color:var(--wl-menu-hover)] focus:bg-[color:var(--wl-menu-hover)] cursor-pointer">
              <Link href="/subscription" className="w-full">Subscription</Link>
            </DropdownMenuItem>
            {/* Affiliate removed from account menu (requested) */}
            <DropdownMenuItem onClick={handleLogout} className="hover:bg-[color:var(--wl-menu-hover)] focus:bg-[color:var(--wl-menu-hover)] cursor-pointer text-red-400">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/sign-in" className="text-sm text-[#cfd3d8] hover:text-white">Sign in</Link>
      )}
    </div>
  );
}
