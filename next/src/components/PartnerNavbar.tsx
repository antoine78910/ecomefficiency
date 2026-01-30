"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { bestTextColorOn, hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

export default function PartnerNavbar({
  logoUrl,
  title,
  preview,
  onPreviewNavigate,
  colors,
}: {
  logoUrl?: string;
  title: string;
  preview?: boolean;
  onPreviewNavigate?: (path: "/signup" | "/signin" | "/app" | "/") => void;
  colors?: { main?: string; secondary?: string; accent?: string };
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const preventNav = (e: any) => {
    if (!preview) return;
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch {}
  };

  const previewNav = (path: "/signup" | "/signin" | "/app" | "/") => {
    if (!preview) return;
    onPreviewNavigate?.(path);
  };

  const main = normalizeHex(colors?.main || "#9541e0", "#9541e0");
  const secondary = normalizeHex(colors?.secondary || "#7c30c7", "#7c30c7");
  const avg = mixHex(main, secondary, 0.5);
  const ctaText = bestTextColorOn(avg);
  const ctaShadow = `0 4px 24px ${hexWithAlpha(avg, 0.55)}`;

  return (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className="w-full mx-auto px-0 relative">
        <div className="grid grid-cols-[auto_1fr] md:grid-cols-3 items-center h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center justify-start space-x-3 pl-2 md:pl-3">
            <div className="flex items-center">
              <Link
                href="/"
                onClick={(e) => {
                  preventNav(e);
                  previewNav("/");
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${title} Logo`}
                    title={`${title} Logo`}
                    className="h-12 md:h-14 w-auto object-contain cursor-pointer"
                  />
                ) : (
                  <Image
                    src="/ecomefficiency.png"
                    alt="Ecom Efficiency Logo"
                    title="Ecom Efficiency Logo"
                    width={160}
                    height={64}
                    className="h-14 w-auto object-contain mix-blend-screen cursor-pointer"
                    priority
                  />
                )}
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center" />

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 md:gap-3 pr-0">
            <Link
              href="/signin"
              className="hidden md:flex"
              onClick={(e) => {
                preventNav(e);
                previewNav("/signin");
              }}
            >
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link
              href="/signup"
              onClick={(e) => {
                preventNav(e);
                previewNav("/signup");
              }}
              className="cursor-pointer px-5 py-2 rounded-xl border font-medium md:px-6 md:py-2 md:text-base hover:brightness-110 group overflow-hidden"
              style={{
                background: `linear-gradient(to bottom, ${main}, ${secondary})`,
                borderColor: main,
                color: ctaText,
                boxShadow: ctaShadow,
              }}
            >
              <div className="relative overflow-hidden w-full text-center">
                <span className="inline-block whitespace-nowrap transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                  Get Started
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-7 whitespace-nowrap group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                  Get Started
                </span>
              </div>
            </Link>

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
            <Link
              href="/signin"
              className="block px-4 py-3 text-base text-white hover:bg-white/10"
              onClick={(e) => {
                preventNav(e);
                previewNav("/signin");
                setMenuOpen(false);
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block px-4 py-3 text-base text-white hover:bg-white/10"
              onClick={(e) => {
                preventNav(e);
                previewNav("/signup");
                setMenuOpen(false);
              }}
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

