"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { bestTextColorOn, hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

function useAuthCallbackRedirect(targetPath: string) {
  const [ready, setReady] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined") return;

        const resolvePartnersNext = async (): Promise<string> => {
          try {
            const { data } = await supabase.auth.getUser();
            const email = String(data.user?.email || "").trim();
            if (!email) return "/signin";
            const res = await fetch("/api/partners/me", { cache: "no-store", headers: { "x-user-email": email } });
            const json = await res.json().catch(() => ({}));
            const slugs: string[] = Array.isArray(json?.slugs) ? json.slugs : [];
            if (!slugs.length) {
              // New user: go to onboarding (configuration)
              try { localStorage.removeItem("partners_current_slug"); } catch {}
              return "/configuration";
            }
            const stored = (() => {
              try { return String(localStorage.getItem("partners_current_slug") || "").trim().toLowerCase(); } catch { return ""; }
            })();
            const chosen = (stored && slugs.includes(stored)) ? stored : slugs[0];
            try { localStorage.setItem("partners_current_slug", chosen); } catch {}
            return `/dashboard?slug=${encodeURIComponent(chosen)}`;
          } catch {
            return targetPath;
          }
        };

        // OAuth error handling (e.g. user cancelled)
        try {
          const url = new URL(window.location.href);
          const oauthError = url.searchParams.get("error");
          if (oauthError) {
            toast({
              title: "Sign in cancelled",
              description: "You cancelled the sign in process. Please try again if you'd like to continue.",
              variant: "destructive",
            });
            try {
              url.searchParams.delete("error");
              url.searchParams.delete("error_description");
              url.hash = "";
              history.replaceState(null, "", url.toString());
            } catch {}
          }
        } catch {}

        const hash = window.location.hash || "";
        const m = hash.match(/access_token=([^&]+).*refresh_token=([^&]+)/);
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

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
          if (!cancelled) window.location.href = await resolvePartnersNext();
          return;
        }

        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch {}
          try {
            history.replaceState(null, "", window.location.pathname);
          } catch {}
          if (!cancelled) window.location.href = await resolvePartnersNext();
          return;
        }

        // Already authed?
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user && !cancelled) {
            window.location.href = await resolvePartnersNext();
            return;
          }
        } catch {}
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetPath, toast]);

  return ready;
}

export default function PartnersSignInPage() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  // Dynamic theming (white-label if globals exist, otherwise fall back to violet)
  const main = normalizeHex(String((typeof window !== "undefined" ? (window as any).__wl_main : "") || "#9541e0"), "#9541e0");
  const accent = normalizeHex(String((typeof window !== "undefined" ? (window as any).__wl_accent : "") || "#7c30c7"), "#7c30c7");
  const btnText = bestTextColorOn(mixHex(main, accent, 0.5));

  // Returning users should land on /dashboard; /configuration is only for the signup/onboarding flow.
  const ready = useAuthCallbackRedirect("/dashboard");

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSubmit = isValidEmail(email) && password.trim().length >= 6 && !pending;

  // Prefill email when redirected from /signup?email=...
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const e = String(url.searchParams.get("email") || "").trim();
      if (e) setEmail(e);
    } catch {}
  }, []);

  // Bottom gradient component for Google button (same as legacy /sign-in)
  const BottomGradient = () => (
    <>
      <span
        className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
      />
      <span
        className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
      />
    </>
  );

  const oauth = async () => {
    try {
      setPending(true);
      if (!SUPABASE_CONFIG_OK) {
        toast({ title: "Configuration required", description: "Supabase env vars missing", variant: "destructive" });
        setPending(false);
        return;
      }
      const redirectTo = `${window.location.origin}/signin`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        toast({ title: "Sign in error", description: error.message || "Failed to initiate sign in.", variant: "destructive" });
        setPending(false);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Unexpected error", variant: "destructive" });
      setPending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setPending(true);
      try {
        await supabase.auth.signOut();
      } catch {}
      if (!SUPABASE_CONFIG_OK) {
        toast({ title: "Configuration required", description: "Supabase env vars missing", variant: "destructive" });
        setPending(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        toast({
          title: "Sign-in failed",
          description: error?.message || "Incorrect email or password.",
          variant: "destructive",
        });
        setPending(false);
        return;
      }
      // Decide destination: existing partner -> /dashboard?slug=..., new user -> /configuration
      try {
        const me = await fetch("/api/partners/me", { cache: "no-store", headers: { "x-user-email": data.user.email || "" } });
        const mj = await me.json().catch(() => ({}));
        const slugs: string[] = Array.isArray(mj?.slugs) ? mj.slugs : [];
        if (!slugs.length) {
          try { localStorage.removeItem("partners_current_slug"); } catch {}
          window.location.href = "/configuration";
          return;
        }
        const stored = (() => {
          try { return String(localStorage.getItem("partners_current_slug") || "").trim().toLowerCase(); } catch { return ""; }
        })();
        const chosen = (stored && slugs.includes(stored)) ? stored : slugs[0];
        try { localStorage.setItem("partners_current_slug", chosen); } catch {}
        window.location.href = `/dashboard?slug=${encodeURIComponent(chosen)}`;
      } catch {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Unexpected error", variant: "destructive" });
      setPending(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="text-gray-300 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-white flex items-center justify-center px-4"
      style={{ ['--wl-main' as any]: main, ['--wl-accent' as any]: accent }}
    >
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
          <div className="mt-2 text-xs text-gray-400">Partners Portal</div>
        </div>

        <div
          className="bg-black/60 border border-white/10 rounded-2xl"
          style={{ boxShadow: `0 20px 80px ${hexWithAlpha(accent, 0.15)}` }}
        >
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Sign in</h1>
            <p className="text-center text-gray-400 mt-2 mb-5">Access your white-label onboarding</p>

            <div className="mb-6">
              <button
                type="button"
                className="relative group/btn bg-transparent w-full rounded-md border border-neutral-300 h-10 font-medium outline-hidden hover:cursor-pointer dark:border-neutral-700"
                onClick={oauth}
                disabled={pending}
              >
                <span className="flex items-center justify-center w-full h-full gap-3">
                  <Image
                    src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
                    width={26}
                    height={26}
                    alt="Google Icon"
                  />
                  Continue with Google
                </span>
                <BottomGradient />
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="h-px w-full bg-white/10" />
              <span className="absolute bg-black px-3 text-xs text-gray-400">or sign in with email</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <InputWithHalo>
                <input
                  type="email"
                  placeholder="Email Address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 focus:outline-none focus:border-white/20 transition-colors text-sm"
                />
              </InputWithHalo>
              <InputWithHalo>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 pr-10 focus:outline-none focus:border-white/20 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </InputWithHalo>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2 font-medium border ${
                  canSubmit
                    ? "cursor-pointer hover:brightness-110"
                    : "bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                }`}
                style={
                  canSubmit
                    ? {
                        background: `linear-gradient(to bottom, ${main}, ${accent})`,
                        borderColor: main,
                        color: btnText,
                        boxShadow: `0 8px 40px ${hexWithAlpha(mixHex(main, accent, 0.5), 0.35)}`,
                      }
                    : undefined
                }
              >
                {pending ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-5 text-center text-gray-400 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline hover:opacity-90" style={{ color: accent }}>
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputWithHalo({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const radius = useMotionValue(160);
  const [visible, setVisible] = React.useState(false);

  const bg = useMotionTemplate`radial-gradient(${visible ? radius.get() + "px" : "0px"} circle at ${mouseX}px ${mouseY}px, var(--wl-accent, #7c30c7), transparent 75%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    radius.set(Math.max(rect.width, rect.height) * 0.45);
  };

  return (
    <motion.div
      style={{ background: bg }}
      onMouseMove={onMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="group/input rounded-lg p-[2px] transition duration-300"
    >
      <div className="rounded-[inherit] bg-black">{children}</div>
    </motion.div>
  );
}


