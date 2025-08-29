
"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const NewNavbar = () => {
  const handlePricingClick = () => {
    // Si on est sur la page d'accueil, scroll vers la section pricing
    if (window.location.pathname === '/') {
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Si on est sur une autre page, rediriger vers la page d'accueil avec l'ancre pricing
      window.location.href = '/#pricing';
    }
  };

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
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="rounded-xl overflow-hidden">
              <Image 
                src="/ecomefficiency.png" 
                alt="Ecom Efficiency Logo" 
                width={140}
                height={56}
                className="h-14 w-auto rounded-xl mix-blend-screen"
                priority
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-center space-x-8">
            <Link href="/" className="text-white hover:text-purple-400 transition-colors">Home</Link>
            <button 
              onClick={handlePricingClick}
              className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Pricing
            </button>
            <button 
              onClick={handleFaqClick}
              className="text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center space-x-4">
            {/* Discord Community Button with new design */}
            <button 
              onClick={handleDiscordClick}
              className="group relative px-4 py-2 rounded-xl backdrop-blur-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-black-900/60 to-black/80 shadow-lg hover:shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 ease-out cursor-pointer hover:border-indigo-400/60 overflow-hidden whitespace-nowrap shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                <div className="p-1.5 rounded-md bg-gradient-to-br from-indigo-500/30 to-indigo-600/10 backdrop-blur-sm group-hover:from-indigo-400/40 group-hover:to-indigo-500/20 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="w-4 h-4 fill-current text-indigo-400 group-hover:text-indigo-300 transition-all duration-300 group-hover:scale-110">
                    <path d="M524.531 69.836a1.5 1.5 0 0 0-.764-.7A485.065 485.065 0 0 0 404.081 32.03a1.816 1.816 0 0 0-1.923.91 337.461 337.461 0 0 0-14.9 30.6 447.848 447.848 0 0 0-134.426 0 309.541 309.541 0 0 0-15.135-30.6 1.89 1.89 0 0 0-1.924-.91 483.689 483.689 0 0 0-119.688 37.107 1.712 1.712 0 0 0-.788.676C39.068 183.651 18.186 294.69 28.43 404.354a2.016 2.016 0 0 0 .765 1.375 487.666 487.666 0 0 0 146.825 74.189 1.9 1.9 0 0 0 2.063-.676A348.2 348.2 0 0 0 208.12 430.4a1.86 1.86 0 0 0-1.019-2.588 321.173 321.173 0 0 1-45.868-21.853 1.885 1.885 0 0 1-.185-3.126 251.047 251.047 0 0 0 9.109-7.137 1.819 1.819 0 0 1 1.9-.256c96.229 43.917 200.41 43.917 295.5 0a1.812 1.812 0 0 1 1.924.233 234.533 234.533 0 0 0 9.132 7.16 1.884 1.884 0 0 1-.162 3.126 301.407 301.407 0 0 1-45.89 21.83 1.875 1.875 0 0 0-1 2.611 391.055 391.055 0 0 0 30.014 48.815 1.864 1.864 0 0 0 2.063.7A486.048 486.048 0 0 0 610.7 405.729a1.882 1.882 0 0 0 .765-1.352c12.264-126.783-20.532-236.912-86.934-334.541zM222.491 337.58c-28.972 0-52.844-26.587-52.844-59.239s23.409-59.241 52.844-59.241c29.665 0 53.306 26.82 52.843 59.239 0 32.654-23.41 59.241-52.843 59.241zm195.38 0c-28.971 0-52.843-26.587-52.843-59.239s23.409-59.241 52.843-59.241c29.667 0 53.307 26.820 52.844 59.239 0 32.654-23.177 59.241-52.844 59.241z" />
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
              <Button 
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NewNavbar;
