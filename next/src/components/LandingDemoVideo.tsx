"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type LandingDemoVideoProps = {
  /** Place file at `next/public/landing/demo.mp4` (or set another public path). */
  src?: string;
  poster?: string;
  title?: string;
};

const shineStyle: CSSProperties = {
  padding: "1px",
  backgroundImage:
    "radial-gradient(transparent, transparent, #c084fc, #9541e0, #ab63ff, #7c30c7, transparent, transparent)",
  backgroundSize: "300% 300%",
  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
};

function AutoplayLandingVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) return;

    const tryPlay = () => {
      video.muted = true;
      video.defaultMuted = true;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const onCanPlay = () => tryPlay();
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onCanPlay);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = Boolean(entries[0]?.isIntersecting);
        if (visible) tryPlay();
        else video.pause();
      },
      { threshold: 0.15, rootMargin: "120px 0px" }
    );
    io.observe(wrap);

    tryPlay();
    const retry = window.setInterval(() => {
      if (video.paused && wrap.getBoundingClientRect().bottom > 0) tryPlay();
    }, 800);
    const stopRetry = window.setTimeout(() => window.clearInterval(retry), 6000);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadeddata", onCanPlay);
      io.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
    };
  }, [src]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
        title={title}
        muted
        defaultMuted
        playsInline
        autoPlay
        loop
        preload="auto"
        controls={false}
      />
    </div>
  );
}

export default function LandingDemoVideo({
  src = "/landing/demo.mp4",
  poster,
  title = "Ecom Efficiency product demo",
}: LandingDemoVideoProps) {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -inset-y-3 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(149,65,224,0.38)_0%,rgba(124,48,199,0.2)_42%,rgba(124,48,199,0)_74%)] blur-3xl sm:inset-x-8"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl border border-purple-300/25 shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_30px_rgba(149,65,224,0.22),0_0_80px_rgba(124,48,199,0.14)]"
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0812]/80 p-2 shadow-2xl backdrop-blur-sm md:p-3">
        <div
          className="animate-ee-landing-shine pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]"
          style={shineStyle}
          aria-hidden
        />

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner">
          <AutoplayLandingVideo src={src} poster={poster} title={title} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/4 bg-purple-950/30 blur-xl"
        />
      </div>
    </div>
  );
}
