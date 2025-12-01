
"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import GoogleButton from "@/components/GoogleButton";

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const { toast } = useToast();
  const { trackSession } = useSessionTracking();

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const canSubmit = isValidEmail(email) && password.trim().length >= 6 && !isLoading;

  const submitSignIn = async () => {
    if (!canSubmit) {
      const reason = !isValidEmail(email)
        ? "Email invalide."
        : password.trim().length < 6
          ? "Le mot de passe doit contenir au moins 6 caractères."
          : "Champs incomplets.";
      toast({ title: "Impossible de continuer", description: reason, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Ensure we start from a clean state
      try { await supabase.auth.signOut(); } catch {}

      if (!SUPABASE_CONFIG_OK) {
        toast({
          title: "Configuration required",
          description: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in next/.env.local",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const status: any = (error as any)?.status;
        const msg = (error?.message || "");
        let description = msg;
        if (status === 400 || /invalid login credentials/i.test(msg)) {
          description = "Email ou mot de passe incorrect.";
        } else if (/email not confirmed/i.test(msg) || status === 401) {
          description = "Adresse e-mail non confirmée. Vérifie ta boîte mail.";
        } else if (/rate|too many|over quota/i.test(msg)) {
          description = "Trop de tentatives. Réessaie dans quelques minutes.";
        } else if (/network|fetch/i.test(msg)) {
          description = "Problème réseau. Vérifie ta connexion internet.";
        }
        toast({ title: "Connexion échouée", description, variant: "destructive" });
        return;
      } else {
        // Track session with IP and geolocation
        if (data.user) {
          const meta: any = data.user.user_metadata || {};
          await trackSession(
            data.user.id,
            'signin',
            data.user.email || undefined,
            meta.first_name || undefined,
            meta.last_name || undefined,
          );
        }

        if (!data.user) {
          toast({ title: "Connexion échouée", description: "Impossible de récupérer la session utilisateur.", variant: "destructive" });
          return;
        }

        // Mark auth for middleware across domains/subdomains
        try {
          const host = window.location.hostname.split(':')[0];
          // Host-only cookie for current origin
          document.cookie = `ee-auth=1; path=/;`;
          const parts = host.split('.');
          if (host === 'localhost' || parts.length === 1) {
            // Try setting for localhost explicitly
            document.cookie = `ee-auth=1; path=/; domain=localhost`;
          } else {
            const base = parts.slice(-2).join('.');
            // Cookie for apex domain (covers subdomains)
            document.cookie = `ee-auth=1; path=/; domain=.${base}`;
            // Cookie for current full host (belt-and-braces)
            document.cookie = `ee-auth=1; path=/; domain=.${host}`;
          }
        } catch {}

        // If a callback param exists, redirect to it (used by pricing Get Started flow)
        try {
          const url = new URL(window.location.href);
          const cb = url.searchParams.get('callback');
          if (cb) {
            window.location.href = cb;
            return;
          }
        } catch {}

        toast({ title: "Sign in successful!", description: "Welcome to Ecom Efficiency" });
        // Simple, reliable redirect to in-app area
        window.location.href = "/app";
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAppBaseUrl = () => {
    try {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';

      // If already on app subdomain, keep it
      if (hostname.startsWith('app.')) {
        return `${protocol}//${hostname}${port}/`;
      }

      // For localhost dev, redirect to app.localhost subdomain
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//app.localhost${port}/`;
      }

      // For production domains, remove www and add app prefix
      const cleanHost = hostname.replace(/^www\./, '');
      return `${protocol}//app.${cleanHost}${port}/`;
    } catch {
      return '/';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitSignIn();
  };

  const handleSocialSignIn = async (provider: 'google' | 'discord') => {
    setIsSocialLoading(true);
    
    try {
      if (!SUPABASE_CONFIG_OK) {
        toast({
          title: "Configuration required",
          description: "Set Supabase environment variables before continuing",
          variant: "destructive",
        });
        setIsSocialLoading(false);
        return;
      }
      
      // Build redirect URL based on environment with proper validation
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

      const redirectTo = `${redirectUrl}?just=1`;
      
      // Final validation of the complete redirect URL
      try {
        new URL(redirectTo);
      } catch {
        throw new Error('Invalid redirect URL. Please contact support.');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo
        }
      });

      if (error) {
        toast({
          title: "Sign in error",
          description: error.message || "Failed to initiate sign in. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('[SignIn] OAuth error:', error);
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/ecomefficiency.png" 
            alt="Ecom Efficiency Logo" 
            className="h-12 w-auto mx-auto mb-4"
          />
        </div>

        <Card className="bg-gray-900/50 border border-purple-500/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                onClick={(e) => { e.preventDefault(); submitSignIn(); }}
                className="w-full bg-[#9541e0] hover:bg-[#8636d2] text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
                Forgot password?
              </Link>
            </div>

      <div className="text-center mt-6">
        <p className="text-gray-400">
          Don't have an account?{" "}
          <Link href="/sign-up" className="text-purple-400 hover:text-purple-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
