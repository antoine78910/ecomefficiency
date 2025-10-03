
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast({
          title: "Sign in error",
          description: error.message,
          variant: "destructive",
        });
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
        // Default: send to app root on current base domain (no /app path)
        const baseHost = window.location.hostname.split(':')[0];
        if (!baseHost.startsWith('app.')) {
          window.location.href = `http://app.${baseHost}:5000/`;
        } else {
          window.location.href = '/';
        }
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Sign in error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
            {/* Social Login temporarily disabled (re-enable later)
            <div className="flex flex-col items-center space-y-3">
              <GoogleButton 
                onClick={() => handleSocialSignIn('google')}
                disabled={isSocialLoading}
                isLoading={isSocialLoading}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-400">Or</span>
              </div>
            </div>
            */}

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
                disabled={isLoading}
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
