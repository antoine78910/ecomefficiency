"use client";

import React from "react";
import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useAuthCallbackRedirect(targetPath: string) {
  const [ready, setReady] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined") return;

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
          if (!cancelled) window.location.href = targetPath;
          return;
        }

        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch {}
          try {
            history.replaceState(null, "", window.location.pathname);
          } catch {}
          if (!cancelled) window.location.href = targetPath;
          return;
        }

        // Already authed?
        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user && !cancelled) {
            window.location.href = targetPath;
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

export default function DomainSignInClient({
  title,
  subtitle,
  logoUrl,
  preview,
}: {
  title: string;
  subtitle: string;
  logoUrl?: string;
  preview?: boolean;
}) {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const ready = preview ? true : useAuthCallbackRedirect("/app");

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSubmit = isValidEmail(email) && !pending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      if (preview) {
        toast({ title: "Preview only", description: "Magic link is disabled in preview.", variant: "destructive" });
        return;
      }
      setPending(true);

      const res = await fetch("/api/domains/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.detail || json?.error || "Failed to send link");

      toast({
        title: "Check your inbox",
        description: "We sent you a sign-in link. Click it to access the app.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Unexpected error", variant: "destructive" });
    } finally {
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={title} className="h-16 w-auto object-contain" />
          ) : (
            <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
          )}
          <div className="mt-2 text-xs text-gray-400">{subtitle}</div>
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Sign in</h1>
            <p className="text-center text-gray-400 mt-2 mb-5">We’ll email you a magic link (no password).</p>

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
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2 font-medium border ${
                  canSubmit
                    ? "cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110"
                    : "bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                }`}
              >
                {pending ? "Sending…" : "Send magic link"}
              </button>
            </form>

            <div className="mt-4 text-center text-gray-500 text-xs">By continuing, you agree to receive an email with a sign-in link.</div>
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

  const bg = useMotionTemplate`radial-gradient(${visible ? radius.get() + "px" : "0px"} circle at ${mouseX}px ${mouseY}px, #7c30c7, transparent 75%)`;

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

