
"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

export default function SignIn() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();

  // Check for OAuth error in URL
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const error = url.searchParams.get('error');
      if (error === 'oauth_cancelled') {
        toast({
          title: "Sign in cancelled",
          description: "You cancelled the sign in process. Please try again if you'd like to continue.",
          variant: "destructive",
        });
        // Clean URL
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('error');
          history.replaceState(null, '', cleanUrl.toString());
        } catch {}
      }
    } catch {}
  }, [toast]);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSubmit = isValidEmail(email) && password.trim().length >= 6 && !pending;

  const getAppBaseUrl = () => {
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      // Only include port if it's not the default port for the protocol
      const shouldIncludePort = port && 
        !((protocol === 'https:' && port === '443') || 
          (protocol === 'http:' && port === '80'));

      if (hostname.startsWith('app.')) {
        const url = `${protocol}//${hostname}${shouldIncludePort ? `:${port}` : ''}/`;
        // Validate URL
        try {
          new URL(url);
          return url;
        } catch {
          return '/';
        }
      }
      // Force the app service on :5000 when developing locally
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://app.localhost:5000/`;
      }
      const cleanHost = hostname.replace(/^www\./, '');
      const url = `${protocol}//app.${cleanHost}${shouldIncludePort ? `:${port}` : ''}/`;
      // Validate URL
      try {
        new URL(url);
        return url;
      } catch {
        return '/';
      }
    } catch {
      return '/';
    }
  };

  const oauth = async (provider: 'google'|'apple') => {
    try {
      setPending(true);
      
      if (!SUPABASE_CONFIG_OK) {
        toast({ 
          title: "Configuration required", 
          description: "Set Supabase environment variables before continuing", 
          variant: "destructive" 
        });
        setPending(false);
        return;
      }
      
      // Build redirect URL with proper validation
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      // Only include port if it's not the default port for the protocol
      const shouldIncludePort = port && 
        !((protocol === 'https:' && port === '443') || 
          (protocol === 'http:' && port === '80'));
      
      let redirectUrl: string;
      try {
        if (hostname.startsWith('app.')) {
          // Already on app subdomain
          redirectUrl = `${protocol}//${hostname}${shouldIncludePort ? `:${port}` : ''}/`;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // For localhost dev, redirect to localhost root (Google OAuth doesn't support app.localhost)
          redirectUrl = `${protocol}//${hostname}${shouldIncludePort ? `:${port}` : ''}/`;
        } else {
          // For production, redirect to app subdomain
          const cleanHost = hostname.replace(/^www\./, '');
          redirectUrl = `${protocol}//app.${cleanHost}${shouldIncludePort ? `:${port}` : ''}/`;
        }
        
        // Validate the URL before using it
        const testUrl = new URL(redirectUrl);
        if (!testUrl.hostname || !testUrl.protocol) {
          throw new Error('Invalid redirect URL constructed');
        }
      } catch (urlError) {
        // Fallback to current origin if URL construction fails
        console.error('[SignIn] Failed to construct redirect URL:', urlError);
        redirectUrl = `${window.location.origin}/`;
      }

      // Final validation of the complete redirect URL
      try {
        new URL(redirectUrl);
      } catch {
        toast({
          title: "Error",
          description: "Invalid redirect URL. Please contact support.",
          variant: "destructive",
        });
        setPending(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({ 
        provider, 
        options: { redirectTo: redirectUrl } 
      });

      if (error) {
        toast({
          title: "Sign in error",
          description: error.message || "Failed to initiate sign in. Please try again.",
          variant: "destructive",
        });
        setPending(false);
      }
    } catch (error: any) {
      console.error('[SignIn] OAuth error:', error);
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setPending(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      const reason = !isValidEmail(email)
        ? "Invalid email."
        : password.trim().length < 6
          ? "Password must be at least 6 characters."
          : "Incomplete fields.";
      toast({ title: "Cannot continue", description: reason, variant: "destructive" });
      return;
    }

    try {
      setPending(true);
      try { await supabase.auth.signOut(); } catch {}

      if (!SUPABASE_CONFIG_OK) {
        toast({ title: "Configuration required", description: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY", variant: "destructive" });
        setPending(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const status: any = (error as any)?.status;
        const msg = (error?.message || "");
        let description = msg;
        if (status === 400 || /invalid login credentials/i.test(msg)) {
          description = "Incorrect email or password.";
        } else if (/email not confirmed/i.test(msg) || status === 401) {
          description = "Email address not confirmed. Please check your inbox.";
        } else if (/rate|too many|over quota/i.test(msg)) {
          description = "Too many attempts. Please try again later.";
        } else if (/network|fetch/i.test(msg)) {
          description = "Network issue. Check your internet connection.";
        }
        toast({ title: "Sign-in failed", description, variant: "destructive" });
        setPending(false);
        return;
      }

      if (!data.user) {
        toast({ title: "Sign-in failed", description: "Could not retrieve user session.", variant: "destructive" });
        setPending(false);
        return;
      }

      toast({ title: "Signed in", description: "Welcome to Ecom Efficiency" });
      // Redirect to the app subdomain with tokens so the app can set the session cross-subdomain
      try {
        const at = data.session?.access_token;
        const rt = data.session?.refresh_token;
        const appBase = getAppBaseUrl();
        if (at && rt) {
          window.location.href = `${appBase}#access_token=${encodeURIComponent(at)}&refresh_token=${encodeURIComponent(rt)}&just_signed_in=1`;
        } else {
          window.location.href = appBase;
        }
      } catch {
        window.location.href = getAppBaseUrl();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "An unexpected error occurred", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  // Bottom gradient component for Google button
  const BottomGradient = () => (
    <>
      <span className='group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-[#7c30c7] to-transparent' />
      <span className='group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-[#7c30c7] to-transparent' />
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
        </div>
        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <style>{`
              @keyframes buttonPulse { 0%,100%{opacity:.35} 50%{opacity:.6} }
              .glow-input:focus { box-shadow: 0 0 0 3px rgba(149,65,224,0.25), 0 0 24px rgba(149,65,224,0.28); }
              .glow-input:hover { border-color: rgba(149,65,224,0.45); }
            `}</style>
            <h1 className="text-center text-2xl font-semibold">Sign in to Ecom Efficiency</h1>
            <p className="text-center text-gray-400 mt-2 mb-5">Welcome back! Sign in to your account below.</p>

            <div className="mb-6">
              <button
                type='button'
                className='relative group/btn bg-transparent w-full rounded-md border border-neutral-300 h-10 font-medium outline-hidden hover:cursor-pointer dark:border-neutral-700'
                onClick={() => oauth('google')}
              >
                <span className='flex items-center justify-center w-full h-full gap-3'>
                  <Image
                    src='https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png'
                    width={26}
                    height={26}
                    alt='Google Icon'
                  />
                  Login with Google
                </span>
                <BottomGradient />
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="h-px w-full bg-white/10" />
              <span className="absolute bg-black px-3 text-xs text-gray-400">or sign in with email</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email with blue radial halo on hover */}
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

              {/* Password with blue radial halo on hover */}
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
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </InputWithHalo>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2 font-medium border ${canSubmit ? 'cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110' : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'}`}
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

function InputWithHalo({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const radius = useMotionValue(160);
  const [visible, setVisible] = React.useState(false);

  const bg = useMotionTemplate`radial-gradient(${visible ? radius.get() + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px, #7c30c7, transparent 75%)`;

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
      className='group/input rounded-lg p-[2px] transition duration-300'
    >
      <div className='rounded-[inherit] bg-black'>
        {children}
      </div>
    </motion.div>
  );
}
