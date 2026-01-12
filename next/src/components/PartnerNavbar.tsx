"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function PartnerNavbar({
  logoUrl,
  title,
}: {
  logoUrl?: string;
  title: string;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const scrollTo = (id: string) => {
    try {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  return (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className="w-full mx-auto px-0 relative">
        <div className="grid grid-cols-[auto_1fr] md:grid-cols-3 items-center h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center justify-start space-x-3 pl-2 md:pl-3">
            <div className="flex items-center">
              <Link href="/">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={`${title} Logo`} className="h-12 md:h-14 w-auto object-contain cursor-pointer" />
                ) : (
                  <Image
                    src="/ecomefficiency.png"
                    alt="Ecom Efficiency Logo"
                    width={160}
                    height={64}
                    className="h-14 w-auto object-contain mix-blend-screen cursor-pointer"
                    priority
                  />
                )}
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-center space-x-8">
            <button onClick={() => scrollTo("tools")} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
              Tools
            </button>
            <button onClick={() => scrollTo("pricing")} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
              Pricing
            </button>
            <button onClick={() => scrollTo("faq")} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
              FAQ
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 md:gap-3 pr-0">
            <Link href="/signin" className="hidden md:flex">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => scrollTo("pricing")}
              className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.55)] px-5 py-2 rounded-xl border border-[#9541e0] text-white font-medium md:px-6 md:py-2 md:text-base hover:brightness-110 group overflow-hidden"
            >
              <div className="relative overflow-hidden w-full text-center">
                <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                  Get Started
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                  Get Started
                </span>
              </div>
            </button>

            <button
              className="md:hidden p-2 rounded-md border border-white/15 text-white/90 hover:bg-white/10"
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute right-0 top-14 w-56 bg-[#0d0e12] border border-white/10 rounded-lg shadow-xl z-[60]">
            <button onClick={() => scrollTo("tools")} className="w-full text-left px-4 py-3 text-base text-white hover:bg-white/10 cursor-pointer">
              Tools
            </button>
            <button onClick={() => scrollTo("pricing")} className="w-full text-left px-4 py-3 text-base text-white hover:bg-white/10 cursor-pointer">
              Pricing
            </button>
            <button onClick={() => scrollTo("faq")} className="w-full text-left px-4 py-3 text-base text-white hover:bg-white/10 cursor-pointer">
              FAQ
            </button>
            <Link href="/signin" className="block px-4 py-3 text-base text-white hover:bg-white/10">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

