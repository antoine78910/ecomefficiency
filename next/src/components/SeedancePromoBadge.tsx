"use client";

import React from "react";
import {
  SEEDANCE_PROMO_END,
  getCountdownParts,
  padCountdown,
  type CountdownParts,
} from "@/lib/seedancePromo";

const neutralBadgeClass =
  "rounded-full bg-[linear-gradient(to_bottom,#494949,#242424)] text-white border border-white/20 font-bold shadow-[0_2px_12px_rgba(0,0,0,0.45)]";

const newBadgeClass = `text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 ${neutralBadgeClass}`;

const countdownBadgeClass = `px-1.5 sm:px-2 py-0.5 ${neutralBadgeClass}`;

function CountdownEtiquette({ parts }: { parts: CountdownParts }) {
  const units = [
    { value: String(parts.days), label: "d" },
    { value: padCountdown(parts.hours), label: "h" },
    { value: padCountdown(parts.minutes), label: "m" },
    { value: padCountdown(parts.seconds), label: "s" },
  ];

  return (
    <span
      className={`absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 inline-flex items-center justify-center gap-0.5 sm:gap-1 tabular-nums ${countdownBadgeClass}`}
      aria-live="polite"
      aria-label="Time remaining until August 14"
    >
      {units.map((unit, i) => (
        <span key={unit.label} className="inline-flex items-center gap-0.5">
          {i > 0 ? <span className="text-[7px] text-white/50 font-normal">·</span> : null}
          <span className="inline-flex flex-col items-center leading-none">
            <span className="text-[8px] sm:text-[9px]">{unit.value}</span>
            <span className="text-[6px] sm:text-[7px] font-semibold text-white/80">{unit.label}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

export default function SeedancePromoBadge() {
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setRemaining(SEEDANCE_PROMO_END.getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = remaining !== null ? getCountdownParts(remaining) : null;

  return (
    <div className="relative isolate mt-2.5 sm:mt-3 inline-flex flex-col items-center gap-1 px-2.5 pb-3 pt-2.5 sm:px-4 sm:py-2 sm:pb-3.5 sm:pt-3 rounded-md sm:rounded-xl bg-[linear-gradient(135deg,rgba(38,38,38,0.94),rgba(12,12,12,0.96))] border border-white/15 shadow-[0_0_16px_rgba(0,0,0,0.4)] sm:shadow-[0_0_32px_rgba(0,0,0,0.5)] backdrop-blur-sm mb-5 sm:mb-7 overflow-visible max-w-[14rem] sm:max-w-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <div className="absolute -left-7 bottom-[-1.9rem] flex h-16 w-16 rotate-[-14deg] items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[19px] font-light text-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] blur-[0.15px]">
          ∞
        </div>
        <div className="absolute left-1/2 top-[-1.3rem] flex h-12 w-12 -translate-x-1/2 rotate-[10deg] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-black tracking-tight text-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          4K
        </div>
        <div className="absolute -right-4 bottom-[-1.35rem] flex h-[3.75rem] w-[4.75rem] rotate-[13deg] items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[7px] font-semibold tracking-[0.14em] text-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          SEEDANCE
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_130%,rgba(255,255,255,0.08),transparent_42%)]" />
      </div>
      <span className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 ${newBadgeClass}`}>
        NEW !
      </span>
      <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
        <span className="group relative inline-flex">
          <span className="inline-flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/10 text-white/80 text-[8px] sm:text-[9px] border border-white/30 cursor-help">
            !
          </span>
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 hidden w-[13.5rem] group-hover:block rounded border border-white/20 bg-black/90 px-2 py-1.5 text-left text-[9px] leading-snug text-gray-200 shadow-lg sm:left-[calc(100%+6px)] sm:right-auto sm:top-1/2 sm:w-[14.5rem] sm:-translate-y-1/2 sm:text-[10px] sm:text-center">
            Unlimited Seedance 2.0 Mini &amp; Fast — up to 15s, 4K-quality generations until August 14.
          </div>
        </span>
      </span>
      <span className="relative z-10 text-white text-xs sm:text-sm font-semibold tracking-wide leading-tight text-center px-1">
        Unlimited Seedance 2.0 generation
      </span>
      <span className="relative z-10 text-[9px] sm:text-[10px] text-white/65 uppercase tracking-wider font-medium">
        Available until 14th August
      </span>
      {parts ? <CountdownEtiquette parts={parts} /> : null}
    </div>
  );
}
