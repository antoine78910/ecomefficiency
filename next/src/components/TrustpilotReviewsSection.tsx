"use client";

import React from "react";
import Link from "next/link";

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/ecomefficiency.com";

type Review = {
  title: string;
  text: string;
  author: string;
  date: string;
  rating: 1 | 2 | 3 | 4 | 5;
};

const FAKE_REVIEWS: Review[] = [
  {
    title: "Huge savings, everything works",
    text: "I replaced 6 subscriptions with EcomEfficiency. Setup was smooth and the tools are available in one place. Support answered quickly.",
    author: "S. Martin",
    date: "Apr 2026",
    rating: 5,
  },
  {
    title: "Best value for ecommerce tools",
    text: "Great for product research and creatives. The dashboard is clean and the pricing is fair compared to paying each tool separately.",
    author: "N. Dubois",
    date: "Apr 2026",
    rating: 5,
  },
  {
    title: "Fast access and good support",
    text: "Had an issue with a login once and it was fixed fast. Overall, it saves a lot of money every month.",
    author: "Alex",
    date: "Mar 2026",
    rating: 4,
  },
  {
    title: "Everything centralized",
    text: "I like having everything in one browser profile. Works well for my workflow and the community is helpful.",
    author: "Claire",
    date: "Mar 2026",
    rating: 5,
  },
  {
    title: "Recommended",
    text: "Simple onboarding, stable access and a lot of tools. Makes a difference if you need several apps for your store.",
    author: "J. Rossi",
    date: "Feb 2026",
    rating: 5,
  },
];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      style={{ opacity: filled ? 1 : 0.15, fill: "white" }}
      focusable="false"
    >
      <path d="M12 17.27l-5.18 3.12 1.4-5.95L3 9.24l6.06-.52L12 3l2.94 5.72 6.06.52-5.22 5.2 1.4 5.95z" />
    </svg>
  );
}

function RatingStars({ rating, size = 18 }: { rating: number; size?: number }) {
  const stars = [1, 2, 3, 4, 5].map((n) => n <= rating);
  return (
    <div className="flex items-center gap-1">
      {stars.map((filled, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center rounded"
          style={{
            width: size,
            height: size,
            background: "rgba(0,184,126,1)",
            borderRadius: 4,
          }}
        >
          <StarIcon filled={filled} />
        </span>
      ))}
    </div>
  );
}

function useSlidesPerView() {
  const [spv, setSpv] = React.useState(1);
  React.useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1024) return 3;
      return 1;
    };
    const on = () => setSpv(compute());
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return spv;
}

export default function TrustpilotReviewsSection() {
  const spv = useSlidesPerView();
  const [idx, setIdx] = React.useState(0);

  const maxIdx = Math.max(0, FAKE_REVIEWS.length - spv);
  const clampedIdx = Math.min(idx, maxIdx);
  const canPrev = clampedIdx > 0;
  const canNext = clampedIdx < maxIdx;

  React.useEffect(() => {
    // Keep index valid when resizing spv
    setIdx((v) => Math.min(v, Math.max(0, FAKE_REVIEWS.length - spv)));
  }, [spv]);

  return (
    <section className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[22%_1fr] gap-6 lg:gap-10 items-start">
          <div className="text-center lg:text-left">
            <div className="text-white font-bold text-xl md:text-2xl leading-tight">
              Loved by ecommerce founders
            </div>

            <div className="mt-3 flex flex-col items-center lg:items-start gap-2">
              <RatingStars rating={5} size={30} />
              <div className="text-sm text-gray-300">
                Based on{" "}
                <Link
                  href={TRUSTPILOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 text-white"
                >
                  1700+ reviews
                </Link>
              </div>
              <div className="text-xs text-gray-500">Fictitious reviews (temporary)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={!canPrev}
              className="hidden lg:inline-flex w-8 h-8 rounded-full border border-white/15 bg-white/5 text-white/80 items-center justify-center hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg leading-none">‹</span>
            </button>

            <div className="relative flex-1 overflow-hidden">
              <div
                className="flex gap-4 transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(calc(-${clampedIdx} * (100% / ${spv}) - ${clampedIdx} * 16px / ${spv}))`,
                }}
              >
                {FAKE_REVIEWS.map((r, i) => (
                  <article
                    key={i}
                    className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 hover:bg-white/7 transition-colors"
                    style={{
                      width: `calc((100% - ${(spv - 1) * 16}px) / ${spv})`,
                    }}
                  >
                    <RatingStars rating={r.rating} size={19} />
                    <h3 className="mt-3 text-white font-semibold text-sm md:text-base leading-snug">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-gray-300 text-sm leading-relaxed">
                      {r.text}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2 text-xs text-gray-400">
                      <span className="font-semibold text-gray-200">{r.author}</span>
                      <span>·</span>
                      <span>{r.date}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-label="Next reviews"
              onClick={() => setIdx((v) => Math.min(maxIdx, v + 1))}
              disabled={!canNext}
              className="hidden lg:inline-flex w-8 h-8 rounded-full border border-white/15 bg-white/5 text-white/80 items-center justify-center hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg leading-none">›</span>
            </button>
          </div>

          {/* Mobile navigation */}
          <div className="lg:hidden flex items-center justify-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIdx((v) => Math.max(0, v - 1))}
              disabled={!canPrev}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setIdx((v) => Math.min(maxIdx, v + 1))}
              disabled={!canNext}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

