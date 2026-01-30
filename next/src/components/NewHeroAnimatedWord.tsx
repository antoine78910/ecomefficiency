"use client";

import React, { useEffect, useRef } from "react";

/**
 * Client-only animated word cycle used in the homepage hero.
 * Isolated so the rest of the hero can be server-rendered (smaller initial JS + faster crawl).
 */
export default function NewHeroAnimatedWord() {
  const wordTrackRef = useRef<HTMLDivElement | null>(null);
  const wordWrapperRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<any>(null);

  useEffect(() => {
    const track = wordTrackRef.current;
    const wrapper = wordWrapperRef.current;
    if (!track || !wrapper) return;

    const margins = [
      { ml: 0, mr: 0 }, // Ecom
      { ml: -12, mr: -12 }, // SPY tighter
      { ml: -12, mr: -12 }, // SEO tighter
      { ml: -36, mr: -36 }, // AI even tighter spacing
      { ml: 0, mr: 0 }, // Ecom
    ];
    const widthBuffer = 8; // prevent clipping due to subpixel rounding

    const build = () => {
      try {
        const firstChild = track.children[0] as HTMLElement | undefined;
        if (!firstChild) return;

        const rect = firstChild.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) return;

        const itemHeight = rect.height || 0;
        const children = Array.from(track.children) as HTMLElement[];
        const widths = children.map((el) => {
          try {
            return el.offsetWidth || 0;
          } catch {
            return 0;
          }
        });

        wrapper.style.display = "inline-block";
        wrapper.style.height = `${itemHeight}px`;
        wrapper.style.width = `${Math.ceil(widths[0]) + widthBuffer}px`;
        wrapper.style.marginLeft = `${margins[0].ml}px`;
        wrapper.style.marginRight = `${margins[0].mr}px`;

        if (itemHeight === 0 || widths.length === 0 || widths.every((w) => w === 0)) return;
        if (!(window as any).__ee_gsap) return;

        const gsap = (window as any).__ee_gsap;
        gsap.set(track, { y: 0, willChange: "transform" });

        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }

        const tl = gsap.timeline({ repeat: -1 });
        tl
          // Ecom hold ~3s, then SPY/SEO/AI with ~0.5s display each
          .to(track, { y: -itemHeight * 1, duration: 0.6, ease: "power2.inOut", delay: 3 })
          .to(
            wrapper,
            { width: (Math.ceil(widths[1]) + widthBuffer) || 0, marginLeft: `${margins[1].ml}px`, marginRight: `${margins[1].mr}px`, duration: 0.6, ease: "power2.inOut" },
            "<"
          )
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 2, duration: 0.6, ease: "power2.inOut" })
          .to(
            wrapper,
            { width: (Math.ceil(widths[2]) + widthBuffer) || 0, marginLeft: `${margins[2].ml}px`, marginRight: `${margins[2].mr}px`, duration: 0.6, ease: "power2.inOut" },
            "<"
          )
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 3, duration: 0.6, ease: "power2.inOut" })
          .to(
            wrapper,
            { width: (Math.ceil(widths[3]) + widthBuffer) || 0, marginLeft: `${margins[3].ml}px`, marginRight: `${margins[3].mr}px`, duration: 0.6, ease: "power2.inOut" },
            "<"
          )
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 4, duration: 0.6, ease: "power2.inOut" })
          .to(
            wrapper,
            { width: (Math.ceil(widths[4]) + widthBuffer) || 0, marginLeft: `${margins[4].ml}px`, marginRight: `${margins[4].mr}px`, duration: 0.6, ease: "power2.inOut" },
            "<"
          )
          .set(track, { y: 0 })
          .set(wrapper, { width: (Math.ceil(widths[0]) + widthBuffer) || 0, marginLeft: `${margins[0].ml}px`, marginRight: `${margins[0].mr}px` });

        tlRef.current = tl;
      } catch {
        // Silently ignore; animation is non-critical.
      }
    };

    let cancelled = false;
    let rafId1: number | undefined;
    let rafId2: number | undefined;

    (async () => {
      try {
        const mod: any = await import("gsap");
        if (cancelled) return;
        (window as any).__ee_gsap = mod?.default ?? mod;
        try {
          build();
        } catch {}
      } catch {
        // If GSAP fails to load, skip animation.
      }
    })();

    try {
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(build);
      });
    } catch {}

    const onResize = () => {
      try {
        build();
      } catch {}
    };
    try {
      window.addEventListener("resize", onResize);
    } catch {}

    return () => {
      cancelled = true;
      try {
        window.removeEventListener("resize", onResize);
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
    <span
      ref={wordWrapperRef}
      className="relative inline-block align-text-bottom h-[1.1em] overflow-hidden whitespace-nowrap text-purple-400 -translate-y-[7px] pr-[4px]"
    >
      <div ref={wordTrackRef} className="leading-[1]">
        <span className="block">Ecom</span>
        <span className="block">SPY</span>
        <span className="block">SEO</span>
        <span className="block">AI</span>
        <span className="block">Ecom</span>
      </div>
    </span>
  );
}

