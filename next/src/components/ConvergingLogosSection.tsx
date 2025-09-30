"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type LogoData = {
  src: string;
  alt: string;
  initialX: number; // percentage of container width (-50 to 50)
  initialY: number; // percentage of container height (-50 to 50)
  size: number; // px
  delay: number; // 0..1 to stagger subtly
};

const LOGOS: LogoData[] = [
  { src: "/tools-logos/semrush.png", alt: "Semrush", initialX: -40, initialY: -20, size: 56, delay: 0.0 },
  { src: "/tools-logos/ubersuggest.png", alt: "Ubersuggest", initialX: 42, initialY: -18, size: 52, delay: 0.05 },
  { src: "/tools-logos/gemini.png", alt: "Gemini", initialX: -28, initialY: 10, size: 54, delay: 0.1 },
  { src: "/tools-logos/midjourney.png", alt: "Midjourney", initialX: 35, initialY: 22, size: 58, delay: 0.15 },
  { src: "/tools-logos/runway.png", alt: "Runway", initialX: -10, initialY: -30, size: 54, delay: 0.2 },
  { src: "/tools-logos/elevenlabs.png", alt: "ElevenLabs", initialX: -46, initialY: 28, size: 52, delay: 0.25 },
  { src: "/tools-logos/pipiads.png", alt: "Pipiads", initialX: 48, initialY: 30, size: 52, delay: 0.3 },
  { src: "/tools-logos/trendtrack.png", alt: "TrendTrack", initialX: 8, initialY: 36, size: 56, delay: 0.35 },
  { src: "/tools-logos/veo3.png", alt: "Veo 3", initialX: -6, initialY: 36, size: 56, delay: 0.4 },
  { src: "/tools-logos/heygen.png", alt: "HeyGen", initialX: 28, initialY: -32, size: 52, delay: 0.45 },
  { src: "/tools-logos/exploding.png", alt: "Exploding Topics", initialX: -22, initialY: -36, size: 52, delay: 0.5 },
  { src: "/tools-logos/fotor.png", alt: "Fotor", initialX: 22, initialY: 8, size: 52, delay: 0.55 },
];

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-linked convergence animation: squares float in from distributed positions
 * toward center. As the user scrolls through this section, progress goes 0 -> 1.
 */
const ConvergingLogosSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const squaresRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const squares = squaresRef.current;
    if (!container || !squares) return;

    const items = Array.from(squares.children) as HTMLElement[];
    const centerX = 0; // translate to center
    const centerY = 0;

    // set initial transforms randomly around the canvas
    items.forEach((el, idx) => {
      const initX = (Math.random() * 100 - 50);
      const initY = (Math.random() * 100 - 50);
      const rot = Math.random() * 25 * (idx % 2 ? 1 : -1);
      gsap.set(el, {
        xPercent: initX,
        yPercent: initY,
        rotate: rot,
        scale: 1,
        opacity: 0.65,
      });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top bottom-=10%",
        end: "bottom top+=25%",
        scrub: 0.6,
      },
      defaults: { ease: "power2.out" },
    });

    items.forEach((el, idx) => {
      tl.to(el, {
        xPercent: centerX,
        yPercent: centerY,
        rotate: (idx % 2 ? -10 : 10),
        scale: 0.55,
        opacity: 1,
      }, 0);
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return (
    <section className="relative bg-black py-24 overflow-hidden">
      {/* Arc gradient below, subtle */}
      <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 h-72 w-[90%] sm:w-[44rem] md:w-[56rem] lg:w-[64rem] bg-gradient-to-b from-purple-600/15 to-transparent blur-3xl rounded-full" aria-hidden />

      <div ref={containerRef} className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="relative h-[520px] md:h-[600px] flex items-center justify-center">
          {/* Center target (app) */}
          <div className="absolute z-10 w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-[#1f1f2e] border border-white/10 shadow-[0_0_60px_rgba(139,92,246,0.25)] flex items-center justify-center">
            <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="w-2/3 h-2/3 object-contain" />
          </div>

          {/* Squares that converge */}
          <div ref={squaresRef} className="absolute inset-0">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="size-10 md:size-12 rounded-lg border border-white/10 bg-gray-900/70 shadow-[0_6px_24px_rgba(0,0,0,0.35)]" />
              </div>
            ))}
          </div>
        </div>

        
      </div>
    </section>
  );
};

export default ConvergingLogosSection;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}


