
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
// Discord removed per request

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { toast } = useToast();
  const { trackSession } = useSessionTracking();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Clear any existing session to avoid being logged into a previous account
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

      // Build redirect URL for email verification callback
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      let emailRedirectUrl;
      if (hostname.startsWith('app.')) {
        emailRedirectUrl = `${protocol}//${hostname}${port}/`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        emailRedirectUrl = `${protocol}//${hostname}${port}/`;
      } else {
        const cleanHost = hostname.replace(/^www\./, '');
        emailRedirectUrl = `${protocol}//app.${cleanHost}${port}/`;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Specify emailRedirectTo to ensure email verification link points to the app, not auth domain
          emailRedirectTo: emailRedirectUrl,
          data: { first_name: firstName, last_name: lastName, plan: 'free' }
        }
      });

      if (error) {
        const rawMsg = String((error as any)?.message || '').toLowerCase();
        const status = (error as any)?.status ?? (error as any)?.code;
        const emailTaken = (
          status === 409 || status === 422 ||
          /already\s*(registered|exists)/i.test(rawMsg) ||
          /duplicate/i.test(rawMsg)
        );
        toast({
          title: emailTaken ? "Email already used" : "Sign up error",
          description: emailTaken ? "This email is already taken. Please try another one." : ((error as any)?.message || "Unexpected error"),
          variant: "destructive",
        });
      } else {
        // Some Supabase instances return 200 with identities:[] when email is already registered
        const identities = (data as any)?.user?.identities as any[] | undefined;
        if (Array.isArray(identities) && identities.length === 0) {
          toast({
            title: "Email already used",
            description: "This email is already taken. Please try another one.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Check if user was created and if email verification is required
        const user = data.user;
        const session = data.session;
        
        // If session exists, user was auto-confirmed (email verification disabled)
        // If no session, email verification is required and email was sent
        if (session) {
          // Email verification is disabled - user is already logged in
          toast({
            title: "Account created!",
            description: "Welcome to Ecom Efficiency",
          });
          // Redirect to app
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          const port = window.location.port ? `:${window.location.port}` : '';
          let appOrigin;
          if (hostname.startsWith('app.')) {
            appOrigin = `${protocol}//${hostname}${port}`;
          } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            appOrigin = `${protocol}//app.localhost${port}`;
          } else {
            const cleanHost = hostname.replace(/^www\./, '');
            appOrigin = `${protocol}//app.${cleanHost}${port}`;
          }
          window.location.href = appOrigin;
          return;
        }

        // Email verification required - email was sent
        if (user) {
          await trackSession(
            user.id,
            'signup',
            user.email || undefined,
            firstName || undefined,
            lastName || undefined,
          );
        }
        // Send lead to FirstPromoter for referral attribution (if available)
        try { (window as any).fpr && (window as any).fpr('referral', { email }); } catch {}

        // Show success message
        toast({
          title: "Check your email",
          description: "We sent a verification link to your email address",
        });

        // Redirect to verification page on app subdomain
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        
        let appOrigin;
        if (hostname.startsWith('app.')) {
          appOrigin = `${protocol}//${hostname}${port}`;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          appOrigin = `${protocol}//app.localhost${port}`;
        } else {
          const cleanHost = hostname.replace(/^www\./, '');
          appOrigin = `${protocol}//app.${cleanHost}${port}`;
        }
        
        window.location.href = `${appOrigin}/verify-email?email=${encodeURIComponent(email)}`;
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

  const handleSocialSignUp = async (provider: 'google' | 'discord') => {
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
      // Build redirect URL based on environment
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      let redirectUrl;
      if (hostname.startsWith('app.')) {
        // Already on app subdomain
        redirectUrl = `${protocol}//${hostname}${port}/`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // For localhost dev, redirect to localhost root first (Google OAuth doesn't support app.localhost)
        redirectUrl = `${protocol}//${hostname}${port}/`;
      } else {
        // For production, redirect to app subdomain
        const cleanHost = hostname.replace(/^www\./, '');
        redirectUrl = `${protocol}//app.${cleanHost}${port}/`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${redirectUrl}?just=1`
        }
      });

      if (error) {
        toast({
          title: "Sign up error",
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
            <CardTitle className="text-white">Sign Up</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your information to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-white">First name</label>
                  <Input id="firstName" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-white">Last name</label>
                  <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500" />
                </div>
              </div>
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
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-400">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-medium">
                  Sign in
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

export default SignUp;
