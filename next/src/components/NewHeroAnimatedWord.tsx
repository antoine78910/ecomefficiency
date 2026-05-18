"use client";

import React, { useEffect, useRef } from "react";

/** Per-word slot tuning: width + horizontal margins pull neighbors closer on short words. */
const WORD_SLOT = [
  { ml: 0, mr: 0 },
  { ml: -12, mr: -12 },
  { ml: -12, mr: -12 },
  { ml: -36, mr: -36 },
  { ml: 0, mr: 0 },
] as const;

/** AI needs looser side spacing on narrow screens (less negative pull). */
const WORD_SLOT_AI_MOBILE = { ml: -10, mr: -10 } as const;

const isMobileViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

const WIDTH_BUFFER = 8;

/**
 * Client-only animated word cycle used in the homepage hero.
 * Width and margins animate per word so short labels (e.g. AI) stay tight in the line.
 */
export default function NewHeroAnimatedWord() {
  const wordTrackRef = useRef<HTMLDivElement | null>(null);
  const wordWrapperRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<{ kill: () => void } | null>(null);

  useEffect(() => {
    const track = wordTrackRef.current;
    const wrapper = wordWrapperRef.current;
    if (!track || !wrapper) return;

    const marginScale = (widths: number[]) => {
      const base = Math.ceil(widths[0] ?? 0) + WIDTH_BUFFER;
      return Math.min(1.15, Math.max(0.55, base / 76));
    };

    const scaledMargin = (index: number, scale: number) => {
      const mobile = isMobileViewport();
      const m =
        index === 3 && mobile ? WORD_SLOT_AI_MOBILE : (WORD_SLOT[index] ?? WORD_SLOT[0]);
      return {
        ml: Math.round(m.ml * scale),
        mr: Math.round(m.mr * scale),
      };
    };

    const applySlot = (index: number, widths: number[], itemHeight: number, scale: number) => {
      const w = Math.ceil(widths[index] ?? 0) + WIDTH_BUFFER;
      const m = scaledMargin(index, scale);
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${itemHeight}px`;
      wrapper.style.marginLeft = `${m.ml}px`;
      wrapper.style.marginRight = `${m.mr}px`;
    };

    const build = () => {
      try {
        const firstChild = track.children[0] as HTMLElement | undefined;
        if (!firstChild) return;

        wrapper.style.display = "inline-block";
        wrapper.style.verticalAlign = "middle";
        wrapper.style.width = "auto";
        wrapper.style.minWidth = "0";

        const children = Array.from(track.children) as HTMLElement[];
        const widths = children.map((el) => el.offsetWidth || el.getBoundingClientRect().width || 0);
        const itemHeight =
          Math.max(
            ...children.map((el) => el.offsetHeight || el.getBoundingClientRect().height || 0),
            firstChild.getBoundingClientRect().height
          ) || 0;

        if (itemHeight === 0 || widths.every((w) => w === 0)) return;

        const scale = marginScale(widths);
        applySlot(0, widths, itemHeight, scale);

        if (!(window as any).__ee_gsap) return;

        const gsap = (window as any).__ee_gsap;
        gsap.set(track, { y: 0, willChange: "transform" });

        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }

        const slide = 0.6;
        const pause = 0.5;
        const ease = "power2.inOut";

        const slotTween = (index: number) => {
          const m = scaledMargin(index, scale);
          return {
            width: Math.ceil(widths[index] ?? 0) + WIDTH_BUFFER,
            marginLeft: `${m.ml}px`,
            marginRight: `${m.mr}px`,
            duration: slide,
            ease,
          };
        };

        const tl = gsap.timeline({ repeat: -1 });
        tl
          .to(track, { y: -itemHeight * 1, duration: slide, ease, delay: 3 })
          .to(wrapper, slotTween(1), "<")
          .to({}, { duration: pause })
          .to(track, { y: -itemHeight * 2, duration: slide, ease })
          .to(wrapper, slotTween(2), "<")
          .to({}, { duration: pause })
          .to(track, { y: -itemHeight * 3, duration: slide, ease })
          .to(wrapper, slotTween(3), "<")
          .to({}, { duration: pause })
          .to(track, { y: -itemHeight * 4, duration: slide, ease })
          .to(wrapper, slotTween(4), "<")
          .set(track, { y: 0 })
          .set(wrapper, {
            width: Math.ceil(widths[0] ?? 0) + WIDTH_BUFFER,
            marginLeft: `${scaledMargin(0, scale).ml}px`,
            marginRight: `${scaledMargin(0, scale).mr}px`,
          });

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
        const mod: { default?: unknown } = await import("gsap");
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
    document.fonts?.ready?.then(() => {
      if (!cancelled) build();
    });

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
      className="relative inline-block align-middle h-[1.1em] min-w-0 overflow-hidden whitespace-nowrap text-purple-400 translate-y-[0.03em] shrink-0"
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
