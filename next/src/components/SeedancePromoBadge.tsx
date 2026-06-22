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
      aria-label="Time remaining until July 17"
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
    <div className="relative mt-2.5 sm:mt-3 inline-flex flex-col items-center gap-1 px-2.5 pb-3 pt-2.5 sm:px-4 sm:py-2 sm:pb-3.5 sm:pt-3 rounded-md sm:rounded-xl bg-[linear-gradient(to_bottom,rgba(149,65,224,0.18),rgba(124,48,199,0.12))] border border-[#9541e0]/40 shadow-[0_0_16px_rgba(149,65,224,0.18)] sm:shadow-[0_0_32px_rgba(149,65,224,0.25)] backdrop-blur-sm mb-5 sm:mb-7 overflow-visible max-w-[14rem] sm:max-w-none">
      <span className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 ${newBadgeClass}`}>
        NEW !
      </span>
      <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
        <span className="group relative inline-flex">
          <span className="inline-flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/10 text-white/80 text-[8px] sm:text-[9px] border border-white/30 cursor-help">
            !
          </span>
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 hidden w-[13.5rem] group-hover:block rounded border border-white/20 bg-black/90 px-2 py-1.5 text-left text-[9px] leading-snug text-gray-200 shadow-lg sm:left-[calc(100%+6px)] sm:right-auto sm:top-1/2 sm:w-[14.5rem] sm:-translate-y-1/2 sm:text-[10px] sm:text-center">
            Unlimited Seedance 2.0 Mini &amp; Fast — up to 15s generations until July 17.
          </div>
        </span>
      </span>
      <span className="text-white text-xs sm:text-sm font-semibold tracking-wide leading-tight text-center px-1">
        Unlimited Seedance 2.0 generation
      </span>
      <span className="text-[10px] sm:text-[11px] text-purple-200/90 leading-snug text-center max-w-[13rem] sm:max-w-none px-1">
        Access now inside our Higgsfield subscription
      </span>
      <span className="text-[9px] sm:text-[10px] text-purple-300/80 uppercase tracking-wider font-medium">
        Available until 17th July
      </span>
      {parts ? <CountdownEtiquette parts={parts} /> : null}
    </div>
  );
}
