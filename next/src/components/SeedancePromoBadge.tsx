"use client";

import React from "react";
import {
  SEEDANCE_PROMO_END,
  getCountdownParts,
  padCountdown,
  type CountdownParts,
} from "@/lib/seedancePromo";

const violetBadgeClass =
  "rounded-full bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white border border-[#9541e0]/50 font-bold shadow-[0_2px_12px_rgba(149,65,224,0.45)]";

const newBadgeClass = `text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 ${violetBadgeClass}`;

const countdownBadgeClass = `px-1.5 sm:px-2 py-0.5 ${violetBadgeClass}`;
const countdownBadgeCompactClass = `px-1 sm:px-1.5 py-0.5 ${violetBadgeClass}`;

function CountdownEtiquette({
  parts,
  compact = false,
}: {
  parts: CountdownParts;
  compact?: boolean;
}) {
  const units = [
    { value: String(parts.days), label: "d" },
    { value: padCountdown(parts.hours), label: "h" },
    { value: padCountdown(parts.minutes), label: "m" },
    { value: padCountdown(parts.seconds), label: "s" },
  ];

  return (
    <span
      className={`absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 inline-flex items-center justify-center gap-0.5 sm:gap-1 tabular-nums ${
        compact ? countdownBadgeCompactClass : countdownBadgeClass
      }`}
      aria-live="polite"
      aria-label="Time remaining until August 14"
    >
      {units.map((unit, i) => (
        <span key={unit.label} className="inline-flex items-center gap-0.5">
          {i > 0 ? <span className="text-[7px] text-white/50 font-normal">·</span> : null}
          <span className="inline-flex flex-col items-center leading-none">
            <span className={compact ? "text-[8px] sm:text-[9px]" : "text-[8px] sm:text-[9px]"}>{unit.value}</span>
            <span className={compact ? "text-[6px] sm:text-[7px] font-semibold text-white/80" : "text-[6px] sm:text-[7px] font-semibold text-white/80"}>
              {unit.label}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

type SeedancePromoBadgeProps = {
  showNewBadge?: boolean;
  showDecorations?: boolean;
  compact?: boolean;
};

export default function SeedancePromoBadge({
  showNewBadge = true,
  showDecorations = true,
  compact = false,
}: SeedancePromoBadgeProps) {
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setRemaining(SEEDANCE_PROMO_END.getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = remaining !== null ? getCountdownParts(remaining) : null;

  return (
    <div
      className={
        compact
            ? "relative isolate inline-block mb-3.5"
            : "relative isolate mt-2.5 sm:mt-3 mb-5 inline-block sm:mb-7"
      }
    >
      {showDecorations ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-16 top-[35%] flex h-16 w-16 -translate-y-1/2 -rotate-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[1px] sm:-left-[5.5rem] sm:h-20 sm:w-20">
            <img src="/seedance-mark.svg" alt="" className="w-10 brightness-0 invert opacity-25 blur-[0.2px] sm:w-14" />
          </div>
          <div className="absolute -right-16 bottom-[-2rem] flex h-20 w-20 rotate-[14deg] items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-[48px] font-normal leading-none tracking-tighter text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[1px] sm:-right-[5.5rem] sm:h-24 sm:w-24 sm:text-[58px]">
            ∞
          </div>
          <div className="absolute -right-4 -top-10 flex h-12 w-12 rotate-[10deg] items-center justify-center rounded-lg border border-white/25 bg-white/[0.09] text-[15px] font-black leading-none tracking-[-0.08em] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[1px] sm:-right-8 sm:-top-12 sm:h-16 sm:w-16 sm:text-[20px]">
            4K
          </div>
        </div>
      ) : null}
      <div
        className={
          compact
            ? "relative z-10 inline-flex flex-col items-center gap-0.5 px-2.5 pb-3 pt-2 rounded-lg bg-[linear-gradient(to_bottom,rgba(149,65,224,0.24),rgba(124,48,199,0.14))] border border-[#9541e0]/40 shadow-[0_0_14px_rgba(149,65,224,0.2)] backdrop-blur-sm overflow-visible max-w-[13rem]"
            : "relative z-10 inline-flex flex-col items-center gap-1 px-2.5 pb-3 pt-2.5 sm:px-4 sm:py-2 sm:pb-3.5 sm:pt-3 rounded-md sm:rounded-xl bg-[linear-gradient(to_bottom,rgba(149,65,224,0.24),rgba(124,48,199,0.14))] border border-[#9541e0]/40 shadow-[0_0_16px_rgba(149,65,224,0.2)] sm:shadow-[0_0_32px_rgba(149,65,224,0.28)] backdrop-blur-sm overflow-visible max-w-[14rem] sm:max-w-none"
        }
      >
        {showNewBadge ? (
          <span className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 ${newBadgeClass}`}>
            NEW !
          </span>
        ) : null}
        <span
          className={
            compact
              ? "relative z-10 text-white text-[11px] sm:text-xs font-semibold tracking-wide leading-tight text-center px-0.5"
              : "relative z-10 text-white text-xs sm:text-sm font-semibold tracking-wide leading-tight text-center px-1"
          }
        >
          Unlimited Seedance 2.0 4K generation
        </span>
        <span
          className={
            compact
              ? "relative z-10 text-[8px] sm:text-[9px] text-white/65 uppercase tracking-wider font-medium"
              : "relative z-10 text-[9px] sm:text-[10px] text-white/65 uppercase tracking-wider font-medium"
          }
        >
          Available until 14th August
        </span>
        {parts ? <CountdownEtiquette parts={parts} compact={compact} /> : null}
      </div>
    </div>
  );
}
