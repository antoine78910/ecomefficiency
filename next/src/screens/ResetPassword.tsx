"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // When the user arrives from magic link, Supabase sets a recovery session
    // Nothing to do here in client SDK v2; updating password below is enough
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (!SUPABASE_CONFIG_OK) {
        toast({ title: "Configuration required", description: "Missing Supabase variables", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password updated", description: "You can now sign in." });
        window.location.href = "/sign-in";
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message ?? "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-16 w-auto object-contain" />
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Reset your password</h1>
            <p className="text-center text-gray-400 mt-2 mb-5">Choose a strong password to secure your account.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">New password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 pr-10 focus:outline-none focus:border-white/20 transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-white mb-2">Confirm password</label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 pr-10 focus:outline-none focus:border-white/20 transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-lg py-2 font-medium border ${isLoading ? 'opacity-80 cursor-not-allowed bg-white/5 border-white/10 text-white/70' : 'cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110'}`}
              >
                {isLoading ? 'Updating…' : 'Update password'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/sign-in" className="text-sm text-purple-300 hover:text-purple-200">Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


