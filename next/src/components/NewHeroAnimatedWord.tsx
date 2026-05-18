"use client";

import React, { useEffect, useRef } from "react";

/**
 * Client-only animated word cycle used in the homepage hero.
 * Fixed slot width so surrounding text does not shift between Ecom / SPY / SEO / AI.
 */
export default function NewHeroAnimatedWord() {
  const wordTrackRef = useRef<HTMLDivElement | null>(null);
  const wordWrapperRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<any>(null);

  useEffect(() => {
    const track = wordTrackRef.current;
    const wrapper = wordWrapperRef.current;
    if (!track || !wrapper) return;

    const widthBuffer = 6;

    const build = () => {
      try {
        const firstChild = track.children[0] as HTMLElement | undefined;
        if (!firstChild) return;

        const rect = firstChild.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) return;

        const itemHeight = rect.height || 0;
        const children = Array.from(track.children) as HTMLElement[];
        const widths = children.map((el) => el.offsetWidth || 0);

        const slotWidth = Math.max(
          ...widths.map((w) => Math.ceil(w) + widthBuffer),
          56
        );

        wrapper.style.display = "inline-block";
        wrapper.style.height = `${itemHeight}px`;
        wrapper.style.width = `${slotWidth}px`;
        wrapper.style.marginLeft = "0";
        wrapper.style.marginRight = "0";
        wrapper.style.verticalAlign = "middle";

        if (itemHeight === 0 || widths.every((w) => w === 0)) return;
        if (!(window as any).__ee_gsap) return;

        const gsap = (window as any).__ee_gsap;
        gsap.set(track, { y: 0, willChange: "transform" });

        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }

        const tl = gsap.timeline({ repeat: -1 });
        tl
          .to(track, { y: -itemHeight * 1, duration: 0.6, ease: "power2.inOut", delay: 3 })
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 2, duration: 0.6, ease: "power2.inOut" })
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 3, duration: 0.6, ease: "power2.inOut" })
          .to({}, { duration: 0.5 })
          .to(track, { y: -itemHeight * 4, duration: 0.6, ease: "power2.inOut" })
          .set(track, { y: 0 });

        tlRef.current = tl;
      } catch {
        // Animation is non-critical.
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
        build();
      } catch {}
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
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (rafId1) cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  return (
    <span
      ref={wordWrapperRef}
      className="relative inline-block align-middle h-[1.1em] w-[3.6rem] sm:w-[4.75rem] overflow-hidden whitespace-nowrap text-purple-400 translate-y-[0.03em] mx-0.5 shrink-0"
    >
      <div ref={wordTrackRef} className="leading-[1] text-center w-full">
        <span className="block w-full text-center">Ecom</span>
        <span className="block w-full text-center">SPY</span>
        <span className="block w-full text-center">SEO</span>
        <span className="block w-full text-center">AI</span>
        <span className="block w-full text-center">Ecom</span>
      </div>
    </span>
  );
}
