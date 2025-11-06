// @ts-nocheck
/// <reference types="react" />
'use client'

import React from 'react';
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

// Fallback typings for isolated build in src/* (keeps JSX and imports typed)
declare global {
  namespace JSX {
    interface IntrinsicElements { [elemName: string]: any }
  }
}
declare module 'next/link' { const Link: any; export default Link }
declare module 'lucide-react' { export const Check: any; export const ArrowRight: any }

const NewHeroSection = () => {
  

  return (
    <div className="bg-black min-h-screen flex items-center relative overflow-hidden">
      {/* Grid Background - White lines with fade to bottom */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, white 0%, white 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 60%, transparent 100%)'
        }}
      />
      
      {/* Purple gradient - more subtle towards bottom to continue in next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-70% to-purple-900/20" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-8">
            <span className="text-purple-400 text-sm font-medium flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              ECOM EFFICIENCY TOOLS
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="block">Access the</span>
            <span className="block">Most Powerful <span className="text-purple-400">Ecom Tools</span></span>
            <span className="block">for <span className="text-purple-400">99% OFF</span> in one click.</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Boost your productivity while minimizing your costs
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/sign-up">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group w-[160px] h-[48px]">
                <div className="relative overflow-hidden">
                  <p className="group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    Get Started
                  </p>
                  <p className="absolute top-7 left-0 group-hover:top-0 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    Get Started
                  </p>
                </div>
              </button>
            </Link>
          </div>

          {/* Features */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-12">
            <div className="flex items-center text-gray-300">
              <Check className="w-5 h-5 text-purple-400 mr-2" />
              <span>Access +50 SEO / SPY / AI tools</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Check className="w-5 h-5 text-purple-400 mr-2" />
              <span>Save $4000+ every month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewHeroSection;
