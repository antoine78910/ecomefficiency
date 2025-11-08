"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { postGoal } from "@/lib/analytics";

export default function VerifyEmailPage() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const email = params.get('email') || ''

  useEffect(() => {
    try {
      const meta: Record<string, string> = {};
      if (email) meta.email = email;
      postGoal('verify_email', meta);
    } catch {}
  }, [email]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
        </div>
        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8 text-center">
            <h1 className="text-2xl font-semibold">Check your inbox</h1>
            <p className="text-gray-400 mt-2">
              We've sent a verification link{email ? <> to <span className="text-white font-medium">{email}</span></> : ' to your email address'}.
            </p>
            <p className="text-xs text-gray-500 mt-5">If you don't see it, check your spam/promotions folder.</p>
            <div className="mt-8">
              <Link href="/sign-in" className="text-sm text-purple-300 hover:text-purple-200">Already verified? Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
