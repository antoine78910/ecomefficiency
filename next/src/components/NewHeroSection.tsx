'use client'

import React, { useEffect, useRef } from 'react';
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import gsap from 'gsap';

const NewHeroSection = () => {
  

  const wordTrackRef = useRef<HTMLDivElement | null>(null);
  const wordWrapperRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const track = wordTrackRef.current;
    const wrapper = wordWrapperRef.current;
    if (!track || !wrapper) return;

    const build = () => {
      try {
        const firstChild = track.children[0] as HTMLElement | undefined;
        if (!firstChild) return;

        // Check if element is actually rendered and has dimensions
        const rect = firstChild.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) {
          // Element not yet rendered, retry later
          return;
        }

        const itemHeight = rect.height || 0;
        const children = Array.from(track.children) as HTMLElement[];
        const widths = children.map((el) => {
          try {
            return el.offsetWidth || 0;
          } catch {
            return 0;
          }
        });
      const margins = [
        { ml: 0, mr: 0 },    // Ecom
        { ml: -12, mr: -12 },  // SPY tighter
        { ml: -12, mr: -12 },  // SEO tighter
        { ml: -36, mr: -36 },  // AI even tighter spacing
        { ml: 0, mr: 0 },    // Ecom
      ];
      const widthBuffer = 8; // extra buffer to prevent clipping due to subpixel rounding

      // Apply base wrapper styles
      wrapper.style.display = 'inline-block';
      wrapper.style.height = `${itemHeight}px`;
      wrapper.style.width = `${Math.ceil(widths[0]) + widthBuffer}px`;
      wrapper.style.marginLeft = `${margins[0].ml}px`;
      wrapper.style.marginRight = `${margins[0].mr}px`;

        // Validate that we have valid dimensions before proceeding
        if (itemHeight === 0 || widths.length === 0 || widths.every(w => w === 0)) {
          return;
        }

        try {
          gsap.set(track, { y: 0, willChange: 'transform' });

          // Cleanup old timeline if exists
          if (tlRef.current) {
            tlRef.current.kill();
            tlRef.current = null;
          }

          const tl = gsap.timeline({ repeat: -1 });
          tl
            // Ecom hold ~3s, then SPY/SEO/IA with ~0.5s display each
            .to(track, { y: -itemHeight * 1, duration: 0.6, ease: 'power2.inOut', delay: 3 })
            .to(wrapper, { width: (Math.ceil(widths[1]) + widthBuffer) || 0, marginLeft: `${margins[1].ml}px`, marginRight: `${margins[1].mr}px`, duration: 0.6, ease: 'power2.inOut' }, '<')
            .to({}, { duration: 0.5 })
            .to(track, { y: -itemHeight * 2, duration: 0.6, ease: 'power2.inOut' })
            .to(wrapper, { width: (Math.ceil(widths[2]) + widthBuffer) || 0, marginLeft: `${margins[2].ml}px`, marginRight: `${margins[2].mr}px`, duration: 0.6, ease: 'power2.inOut' }, '<')
            .to({}, { duration: 0.5 })
            .to(track, { y: -itemHeight * 3, duration: 0.6, ease: 'power2.inOut' })
            .to(wrapper, { width: (Math.ceil(widths[3]) + widthBuffer) || 0, marginLeft: `${margins[3].ml}px`, marginRight: `${margins[3].mr}px`, duration: 0.6, ease: 'power2.inOut' }, '<')
            .to({}, { duration: 0.5 })
            .to(track, { y: -itemHeight * 4, duration: 0.6, ease: 'power2.inOut' })
            .to(wrapper, { width: (Math.ceil(widths[4]) + widthBuffer) || 0, marginLeft: `${margins[4].ml}px`, marginRight: `${margins[4].mr}px`, duration: 0.6, ease: 'power2.inOut' }, '<')
            .set(track, { y: 0 })
            .set(wrapper, { width: (Math.ceil(widths[0]) + widthBuffer) || 0, marginLeft: `${margins[0].ml}px`, marginRight: `${margins[0].mr}px` });

          tlRef.current = tl;
        } catch (gsapError) {
          // Silently handle GSAP errors to prevent console errors
          console.warn('[NewHeroSection] GSAP animation error:', gsapError);
        }
      } catch (error) {
        // Silently handle any errors during build
        console.warn('[NewHeroSection] Build error:', error);
      }
    };

    // Measure after layout; doing two rAFs helps if fonts/layout shift on first frame
    let rafId1: number;
    let rafId2: number;
    
    try {
      rafId1 = requestAnimationFrame(() => {
        try {
          rafId2 = requestAnimationFrame(build);
        } catch (error) {
          console.warn('[NewHeroSection] RAF error:', error);
        }
      });
    } catch (error) {
      console.warn('[NewHeroSection] Initial RAF error:', error);
    }

    const onResize = () => {
      try {
        build();
      } catch (error) {
        console.warn('[NewHeroSection] Resize error:', error);
      }
    };
    
    try {
      window.addEventListener('resize', onResize);
    } catch (error) {
      console.warn('[NewHeroSection] AddEventListener error:', error);
    }

    return () => {
      try {
        window.removeEventListener('resize', onResize);
      } catch {}
      try {
        if (rafId1) cancelAnimationFrame(rafId1);
      } catch {}
      try {
        if (rafId2) cancelAnimationFrame(rafId2);
      } catch {}
      try {
        if (tlRef.current) tlRef.current.kill();
      } catch {}
    };
  }, []);

  return (
    <div className="bg-black min-h-screen flex items-center relative overflow-visible">
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
      
      {/* Gradient fades to black to seamlessly meet the next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
      
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="text-center">
          {/* Announcement badge - smooth and on-brand */}
          <div className="relative inline-flex flex-col items-center px-4 py-2 rounded-xl bg-[linear-gradient(to_bottom,rgba(149,65,224,0.18),rgba(124,48,199,0.12))] border border-[#9541e0]/40 shadow-[0_0_32px_rgba(149,65,224,0.25)] backdrop-blur-sm mb-5 overflow-visible">
            <span className="absolute -top-2 -left-2 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white border border-[#a78bfa]/40 shadow-[0_0_10px_rgba(167,139,250,0.5)]">NEW !</span>
            <span className="absolute -top-2 -right-2 z-10">
              <span className="group relative inline-flex">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white/10 text-white/80 text-[9px] border border-white/30 cursor-help">!</span>
                <div className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 hidden group-hover:flex bg-black/80 text-gray-200 text-[10px] px-2 py-1 rounded-md border border-white/20 shadow-lg whitespace-nowrap">
                  $250 Higgsfield Creator Plan added by monthly vote in the discord community
                </div>
              </span>
            </span>
            <span className="text-white text-sm font-semibold tracking-wide inline-flex items-center gap-2">
              Higgsfield added
            </span>
            <span className="text-[11px] text-purple-200/90 leading-tight">Unlimited Nanobanana & Seedream 4.0 generation</span>
          </div>

          {/* Removed redundant ECOM EFFICIENCY TOOLS badge per request */}

          {/* Main Heading with animated word cycle */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.06] tracking-normal">
            <span className="block">Access the</span>
            <span className="block">
              Most Powerful{' '}
              <span ref={wordWrapperRef} className="relative inline-block align-text-bottom h-[1.1em] overflow-hidden whitespace-nowrap text-purple-400 -translate-y-[7px] pr-[4px]">
                <div ref={wordTrackRef} className="leading-[1]">
                  <span className="block">Ecom</span>
                  <span className="block">SPY</span>
                  <span className="block">SEO</span>
                  <span className="block">AI</span>
                  <span className="block">Ecom</span>
                </div>
              </span>{' '}
              Tools
            </span>
            <span className="block">for <span className="text-purple-400">99% OFF</span> in one click</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-gray-400 mb-6 md:mb-8 max-w-3xl mx-auto">
            Boost your productivity while minimizing your costs
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row flex-wrap gap-4 justify-center mb-6">
            <Link href="/sign-up">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]">
                <div className="relative overflow-hidden w-full text-center">
                  <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                  <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                </div>
              </button>
            </Link>
            <Link href="/tools">
              <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border-[1px] border-white/20 text-white font-medium group w-[160px] h-[48px]">
                <div className="flex items-center justify-center gap-2">
                  <span>See tools</span>
                  <ArrowRight className="w-4 h-4" />
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
