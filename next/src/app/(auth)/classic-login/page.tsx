"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export default function ClassicLoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const canSubmit = email.trim().length > 3 && password.trim().length >= 6 && !pending;

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      setPending(true);
      await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/` } });
    } catch {
      setPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setPending(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setPending(false); return; }
      window.location.href = "/";
    } catch { setPending(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={56} height={56} className="h-14 w-auto object-contain" />
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Sign in to Ecom Efficiency</h1>
            <p className="text-center text-gray-400 mt-2 mb-5">Welcome back! Sign in to your account below.</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => handleOAuth("google")} className="cursor-pointer inline-flex items-center justify-center gap-2 border border-white/15 rounded-lg py-2.5 bg-white/5 hover:bg-white/10 transition-colors">
                <Image src="/google.svg" alt="Google" width={18} height={18} />
                <span className="text-sm">Google</span>
              </button>
              <button onClick={() => handleOAuth("apple")} className="cursor-pointer inline-flex items-center justify-center gap-2 border border-white/15 rounded-lg py-2.5 bg-white/5 hover:bg-white/10 transition-colors">
                <Image src="/apple.svg" alt="Apple" width={18} height={18} />
                <span className="text-sm">Apple</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="h-px w-full bg-white/10" />
              <span className="absolute bg-black px-3 text-xs text-gray-400">or sign in with email</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2.5 focus:outline-none focus:border-purple-500/60"
              />
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2.5 pr-10 focus:outline-none focus:border-purple-500/60"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2.5 font-medium border ${canSubmit ? 'cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110' : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'}`}
              >
                {pending ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-sm text-purple-300 hover:text-purple-200">Forgot your password?</Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-400">
          <span className="text-sm">New to Ecom Efficiency? </span>
          <Link href="/sign-up" className="text-sm text-purple-300 hover:text-purple-200">Create account</Link>
        </div>
      </div>
    </div>
  );
}


