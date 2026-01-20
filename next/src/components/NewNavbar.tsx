
"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const NewNavbar = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const handlePricingClick = () => { window.location.href = '/pricing'; };

  const handleDiscordClick = () => {
    // Open Discord community link
    window.open('https://discord.gg/bKg7J625Sm', '_blank');
  };

  const handleFaqClick = () => {
    if (window.location.pathname === '/') {
      const faqSection = document.getElementById('faq');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = '/#faq';
    }
  };

  return (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className="w-full mx-auto px-0 relative">
        <div className="grid grid-cols-[auto_1fr] md:grid-cols-3 items-center h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center justify-start space-x-3 pl-2 md:pl-3">
            <div className="flex items-center">
              <Link href="/">
                <Image 
                  src="/ecomefficiency.png" 
                  alt="Ecom Efficiency Logo" 
                  width={160}
                  height={64}
                  className="h-14 w-auto object-contain mix-blend-screen cursor-pointer"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-center space-x-8">
            <Link href="/tools" className="text-gray-400 hover:text-white transition-colors">Tools</Link>
            <Link href="/affiliate" className="text-gray-400 hover:text-white transition-colors">Affiliate</Link>
            <button 
              onClick={handlePricingClick}
              className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Pricing
            </button>
            <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 md:gap-3 pr-0">
            {/* Discord Community Button - desktop only */}
            <button 
              onClick={handleDiscordClick}
              className="hidden md:inline-flex group relative px-4 py-2 rounded-xl backdrop-blur-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-black-900/60 to-black/80 shadow-lg hover:shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 ease-out cursor-pointer hover:border-indigo-400/60 overflow-hidden whitespace-nowrap shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-indigo-500/30 to-indigo-600/10 backdrop-blur-sm group-hover:from-indigo-400/40 group-hover:to-indigo-500/20 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current text-indigo-400 group-hover:text-indigo-300 transition-all duration-300 group-hover:scale-110">
                    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 8.82 8.82 0 0 0-.608 1.25 15.99 15.99 0 0 0-5.487 0 8.67 8.67 0 0 0-.618-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.028C.533 9.046-.319 13.58.099 18.058a.082.082 0 0 0 .031.056 17.73 17.73 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.1 13.1 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 12.06 12.06 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.1.246.199.373.293a.077.077 0 0 1-.007.128c-.59.343-1.211.645-1.873.891a.077.077 0 0 0-.04.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 17.975 17.975 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.955 2.419-2.157 2.419Z" />
                  </svg>
                </div>
                <span className="text-indigo-400 font-medium text-sm group-hover:text-indigo-300 transition-colors duration-300">
                  Join Community
                </span>
              </div>
            </button>

            <Link href="/sign-in" className="hidden md:flex">
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.55)] px-5 py-2 rounded-xl border border-[#9541e0] text-white font-medium md:px-6 md:py-2 md:text-base hover:brightness-110 group overflow-hidden">
                <div className="relative overflow-hidden w-full text-center">
                  <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    Get Started
                  </span>
                  <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    Get Started
                  </span>
                </div>
              </Button>
            </Link>

            <button
              className="md:hidden p-2 rounded-md border border-white/15 text-white/90 hover:bg-white/10"
              aria-label="Open menu"
              onClick={() => setMenuOpen(v => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute right-0 top-14 w-56 bg-[#0d0e12] border border-white/10 rounded-lg shadow-xl z-[60]">
            <Link href="/tools" className="block px-4 py-3 text-base text-white hover:bg-white/10">Tools</Link>
            <Link href="/affiliate" className="block px-4 py-3 text-base text-white hover:bg-white/10">Affiliate</Link>
            <button onClick={handlePricingClick} className="w-full text-left px-4 py-3 text-base text-white hover:bg-white/10 cursor-pointer">Pricing</button>
            <Link href="/blog" className="block px-4 py-3 text-base text-white hover:bg-white/10">Blog</Link>
            <button onClick={handleDiscordClick} className="w-full text-left px-4 py-3 text-base text-white hover:bg-white/10 cursor-pointer">Join Community</button>
            <Link href="/sign-in" className="block px-4 py-3 text-base text-white hover:bg-white/10">Sign In</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NewNavbar;

