"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from "@/integrations/supabase/client";
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignUp() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();

  const canSubmit = name.trim().length > 1 && email.trim().length > 3 && password.length >= 6 && !pending;

  const oauth = async () => {
    try { 
      setPending(true); 
      // Ensure we use a valid redirection URL authorized in Supabase
      const origin = window.location.origin;
      const redirectUrl = origin.includes('localhost') 
        ? `${origin}/` 
        : 'https://app.ecomefficiency.com/'; // Force canonical production URL
        
      await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        } 
      }); 
    } catch { 
      setPending(false); 
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setPending(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect email verification back to the app workspace route
          emailRedirectTo: (() => {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const port = window.location.port ? `:${window.location.port}` : '';
            if (hostname.startsWith('app.')) return `${protocol}//${hostname}${port}/`;
            if (hostname === 'localhost' || hostname === '127.0.0.1') return `http://app.localhost${port}/`;
            const clean = hostname.replace(/^www\./, '');
            return `${protocol}//app.${clean}${port}/`;
          })(),
          data: { name }
        }
      });
      if (error) {
        const raw = String(error.message || '').toLowerCase();
        const already = /already\s*(registered|exists)/i.test(raw) || /duplicate/i.test(raw);
        toast({
          title: already ? 'Account already exists' : 'Sign up error',
          description: already ? 'This email is already registered. Please sign in instead.' : (error.message || 'Unexpected error'),
          variant: 'destructive'
        });
        setPending(false);
        return;
      }

      // Some Supabase setups return user.identities:[] when email exists
      const identities = (data as any)?.user?.identities as any[] | undefined;
      if (Array.isArray(identities) && identities.length === 0) {
        toast({
          title: 'Account already exists',
          description: 'This email is already registered. Please sign in instead.',
          variant: 'destructive'
        });
        setPending(false);
        return;
      }

      // Track referral with FirstPromoter (best effort)
      try { (window as any).fpr && (window as any).fpr('referral', { email }); } catch {}

      // Safety: ensure we have a user (required for signup flow that sends verification)
      if (!data || !data.user) {
        toast({
          title: 'Sign up issue',
          description: 'Could not start verification for this email. Please try again or sign in if you already have an account.',
          variant: 'destructive'
        });
        setPending(false);
        return;
      }

      // Redirect the user to a lightweight verify screen
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';

      let verifyUrl: string;
      if (hostname.startsWith('app.') || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.localhost') {
        verifyUrl = `/verify-email?email=${encodeURIComponent(email)}`;
      } else {
        const cleanHost = hostname.replace(/^www\./, '');
        verifyUrl = `${protocol}//app.${cleanHost}${port}/verify-email?email=${encodeURIComponent(email)}`;
      }

      // Let the loader render for a brief moment before navigating
      setTimeout(() => { window.location.href = verifyUrl; }, 200);
    } catch { setPending(false); }
  };

  const BottomGradient = () => (
    <>
      <span className='group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-[#7c30c7] to-transparent' />
      <span className='group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-[#7c30c7] to-transparent' />
    </>
  );

  // Static narrower bottom halo (no mouse tracking)
  const NarrowGradient = () => (
    <span className='group-hover/btn:opacity-100 block transition duration-300 opacity-0 absolute h-[3px] w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-[#7c30c7] to-transparent' />
  );

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
        </div>
        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8">
            <h1 className="text-center text-2xl font-semibold">Create your account</h1>
            <p className="text-center text-gray-400 mt-2 mb-6">Join Ecom Efficiency today</p>

            <div className="mb-6">
              <button
                type='button'
                onClick={oauth}
                className='relative group/btn bg-transparent w-full rounded-md border border-neutral-300 h-10 font-medium outline-hidden hover:cursor-pointer dark:border-neutral-700 overflow-hidden'
              >
                <span className='flex items-center justify-center w-full h-full gap-3'>
                  <Image src='https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' width={26} height={26} alt='Google Icon' />
                  Sign up with Google
                </span>
                <NarrowGradient />
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="h-px w-full bg-white/10" />
              <span className="absolute bg-black px-3 text-xs text-gray-400">or sign up with email</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" suppressHydrationWarning>
              <InputWithHalo>
                <input type="text" placeholder="Full name" autoComplete="name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 focus:outline-none focus:border-white/20 transition-colors text-sm" suppressHydrationWarning />
              </InputWithHalo>
              <InputWithHalo>
                <input type="email" placeholder="Email Address" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 focus:outline-none focus:border-white/20 transition-colors text-sm" suppressHydrationWarning />
              </InputWithHalo>
              <InputWithHalo>
                <div className="relative">
                  <input type={show? 'text':'password'} placeholder="Password" autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 placeholder:text-gray-500 text-white px-3 py-2 pr-10 focus:outline-none focus:border-white/20 transition-colors text-sm" suppressHydrationWarning />
                  <button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </InputWithHalo>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-lg py-2 font-medium border flex items-center justify-center ${canSubmit ? 'cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border-[#9541e0] text-white shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110' : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'}`}
              >
                {pending ? (
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/90 border-b-transparent animate-spin" />
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-gray-400 text-sm">
              Already have an account? <Link href="/sign-in" className="text-purple-300 hover:text-purple-200">Sign in</Link>
            </div>
          </div>
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
  const rectRef = React.useRef<DOMRect | null>(null);

  // Use plain motion value references where possible to avoid unnecessary JS re-execution
  const bg = useMotionTemplate`radial-gradient(${visible ? radius : '0'}px circle at ${mouseX}px ${mouseY}px, #7c30c7, transparent 75%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Optimized: Use cached rect to avoid layout thrashing (reflow) on every mouse move
    if (rectRef.current) {
      const rect = rectRef.current;
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rectRef.current = rect;
    // Calculate radius once on enter
    radius.set(Math.max(rect.width, rect.height) * 0.45);
    setVisible(true);
  };

  const onLeave = () => {
    setVisible(false);
    // We don't nullify rectRef immediately to allow fading out or last frame updates if needed, 
    // but practically it's fine.
  };

  return (
    <motion.div 
      style={{ background: bg }} 
      onMouseMove={onMove} 
      onMouseEnter={onEnter} 
      onMouseLeave={onLeave} 
      className='group/input rounded-lg p-[2px] transition duration-300'
    >
      <div className='rounded-[inherit] bg-black'>{children}</div>
    </motion.div>
  );
}
