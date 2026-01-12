"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { postGoal } from "@/lib/analytics";

export default function DomainVerifyEmailClient({
  email,
  title,
  logoUrl,
}: {
  email?: string;
  title: string;
  logoUrl?: string;
}) {
  const e = String(email || "");

  useEffect(() => {
    try {
      const meta: Record<string, string> = {};
      if (e) meta.email = e;
      postGoal("verify_email", meta);
    } catch {}
  }, [e]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={title} className="h-16 w-auto object-contain" />
          ) : (
            <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={200} height={64} priority quality={100} className="h-16 w-auto object-contain" />
          )}
        </div>
        <div className="bg-black/60 border border-white/10 rounded-2xl shadow-[0_20px_80px_rgba(149,65,224,0.15)]">
          <div className="p-6 md:p-8 text-center">
            <h1 className="text-2xl font-semibold">Check your inbox</h1>
            <p className="text-gray-400 mt-2">
              We&apos;ve sent a verification link
              {e ? (
                <>
                  {" "}
                  to <span className="text-white font-medium">{e}</span>
                </>
              ) : (
                " to your email address"
              )}
              .
            </p>
            <p className="text-xs text-gray-500 mt-5">If you don&apos;t see it, check your spam/promotions folder.</p>
            <div className="mt-8">
              <Link href="/signin" className="text-sm text-purple-300 hover:text-purple-200">
                Already verified? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

