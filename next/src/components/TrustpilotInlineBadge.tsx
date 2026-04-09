"use client";

import Link from "next/link";

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/ecomefficiency.com";

function Star({ filled }: { filled: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded"
      style={{
        width: 19,
        height: 19,
        background: filled ? "#00b87e" : "rgba(0,184,126,0.35)",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: "white", opacity: filled ? 1 : 0.35 }}>
        <path d="M12 17.27l-5.18 3.12 1.4-5.95L3 9.24l6.06-.52L12 3l2.94 5.72 6.06.52-5.22 5.2 1.4 5.95z" />
      </svg>
    </span>
  );
}

export default function TrustpilotInlineBadge() {
  return (
    <Link
      href={TRUSTPILOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 hover:bg-black/45 transition-colors"
    >
      <span className="inline-flex items-center gap-1" style={{ zoom: 0.95 } as any}>
        <Star filled />
        <Star filled />
        <Star filled />
        <Star filled />
        <Star filled={false} />
      </span>
      <span className="text-[15px] text-white/90">
        EXCELLENT <strong>4.8/5</strong> <span className="text-white/50">|</span>{" "}
        <span className="text-white/70">1734 Avis</span>
      </span>
    </Link>
  );
}

