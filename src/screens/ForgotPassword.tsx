"use client";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!SUPABASE_CONFIG_OK) {
        toast({
          title: "Configuration requise",
          description: "Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans next/.env.local",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email envoyé", description: "Vérifie ta boîte mail pour réinitialiser le mot de passe." });
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
          <img src="/ecomefficiency.png" alt="Ecom Efficiency Logo" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Forgot password</h1>
          <p className="text-gray-400 mt-2">Receive a link to reset your password</p>
        </div>
        <Card className="bg-gray-900/50 border border-purple-500/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Reset password</CardTitle>
            <CardDescription className="text-gray-400">Enter your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white">Email</label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-purple-500" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-[#9541e0] hover:bg-[#8636d2] text-white font-medium py-3 rounded-lg transition-colors">
                {isLoading ? "Sending..." : "Send reset link"}
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

export default ForgotPassword;


