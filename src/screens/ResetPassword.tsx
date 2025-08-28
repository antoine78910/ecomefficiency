"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // When the user arrives from magic link, Supabase sets a recovery session
    // Nothing to do here in client SDK v2; updating password below is enough
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit comporter au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (!SUPABASE_CONFIG_OK) {
        toast({ title: "Configuration requise", description: "Variables Supabase manquantes", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Mot de passe mis à jour", description: "Tu peux maintenant te connecter." });
        window.location.href = "/sign-in";
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message ?? "Une erreur inattendue est survenue", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/4df3c2ff-c349-471e-bd38-1b3a1d95b2c2.png" alt="Ecom Efficiency Logo" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
          <p className="text-gray-400 mt-2">Choose a strong password to secure your account</p>
        </div>
        <Card className="bg-gray-900/50 border border-purple-500/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white">New password</CardTitle>
            <CardDescription className="text-gray-400">Enter and confirm your new password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">Password</label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium text-white">Confirm password</label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-[#9541e0] hover:bg-[#8636d2] text-white font-medium py-3 rounded-lg transition-colors">
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
            <div className="text-center mt-6">
              <Link href="/sign-in" className="text-gray-400 hover:text-white transition-colors">← Back to sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;


