"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_CONFIG_OK } from "@/integrations/supabase/client";
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

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
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email sent", description: "Check your inbox to reset your password." });
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
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
        </div>
        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Reset password</h1>
            <p className="text-center text-gray-400 mt-2 mb-6">Receive a link to reset your password</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <InputWithHalo>
                <input id="email" type="email" placeholder="Email Address" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 focus:outline-none focus:border-white/20 transition-colors text-sm" />
              </InputWithHalo>
              <button type="submit" disabled={isLoading} className={`w-full rounded-lg py-2 font-medium border ${!isLoading ? 'cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white hover:brightness-110' : 'bg-white/5 border-white/10 text-white/60 cursor-not-allowed'}`}>{isLoading ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <div className="text-center mt-4 text-gray-400 text-sm">
              <Link href="/signin" className="text-purple-300 hover:text-purple-200">← Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
 
function InputWithHalo({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const radius = useMotionValue(160);
  const [visible, setVisible] = React.useState(false);
  const bg = useMotionTemplate`radial-gradient(${visible ? radius.get() + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px, #7c30c7, transparent 75%)`;
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left); mouseY.set(e.clientY - rect.top); radius.set(Math.max(rect.width, rect.height) * 0.45);
  };
  return (
    <motion.div style={{ background: bg }} onMouseMove={onMove} onMouseEnter={()=>setVisible(true)} onMouseLeave={()=>setVisible(false)} className='group/input rounded-lg p-[2px] transition duration-300'>
      <div className='rounded-[inherit] bg-black'>{children}</div>
    </motion.div>
  );
}


