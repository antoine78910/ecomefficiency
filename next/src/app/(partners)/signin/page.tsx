"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

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

export default function PartnersSignInPage() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const ready = useAuthCallbackRedirect("/configuration");

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSubmit = isValidEmail(email) && password.trim().length >= 6 && !pending;

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
      window.location.href = "/configuration";
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
          <div className="mt-2 text-xs text-gray-400">Partners Portal</div>
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
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
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="h-px w-full bg-white/10" />
              <span className="absolute bg-black px-3 text-xs text-gray-400">or sign in with email</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 focus:outline-none focus:border-white/20 transition-colors text-sm"
              />
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 pr-10 focus:outline-none focus:border-white/20 transition-colors text-sm"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2 font-medium border ${
                  canSubmit
                    ? "cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110"
                    : "bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                }`}
              >
                {pending ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-5 text-center text-gray-400 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-purple-300 hover:text-purple-200">
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


