import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const pipiadsToc: TocItem[] = [
  { id: "pipiads-definition", label: "What is Pipiads?" },
  { id: "pipiads-use-cases", label: "What it’s for (practical)" },
  { id: "pipiads-features", label: "Key features" },
  { id: "pipiads-method", label: "Fast method (winner research)" },
  { id: "pipiads-creatives", label: "How to analyze TikTok creatives" },
  { id: "pipiads-pricing", label: "Pricing & bundles" },
  { id: "pipiads-limits", label: "Limits & common mistakes" },
  { id: "pipiads-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const pipiadsFaq = [
  {
    q: "Is Pipiads reliable for finding winning products?",
    a: "Yes—if you filter by ad longevity (ads active for 7–14+ days) and validate with a second signal (e.g., TikTok Shop/product data).",
  },
  {
    q: "Does Pipiads work for platforms other than TikTok?",
    a: "The core value is TikTok Ads. For true multi‑platform spying, a dedicated multi‑network tool is usually a better fit.",
  },
  {
    q: "Which metric should I prioritize?",
    a: "Ad longevity + repeated variations. Likes/shares can be misleading (viral ≠ profitable).",
  },
  {
    q: "How do I avoid copying an ad 1:1?",
    a: "Copy the “why it works” (hook, angle, proof, structure), then rebuild it with your offer, script, and assets.",
  },
  {
    q: "Is Pipiads worth it if I’m new to TikTok Ads?",
    a: "Yes—if you use it as a pattern library (hooks, angles, formats), not as a “magic recipe” machine.",
  },
  {
    q: "How much does Pipiads cost?",
    a: "Standalone pricing varies. In the Ecom Efficiency bundle, Pipiads is included with a displayed value of $280/month.",
  },
] as const;

export default function PipiadsChapters() {
  return (
    <div className="space-y-10">
      <section id="pipiads-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Pipiads?</h2>
        <p className="text-gray-300">
          <strong>Pipiads</strong> is a <strong>TikTok Ads spy tool</strong> that helps you analyze active and past ads, spot winning patterns, and speed up product
          research. The goal is to scale without shady shortcuts and without hurting your credibility.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can spot fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Products that keep running</li>
              <li>Creatives / hooks that convert</li>
              <li>Angles, proof, and script structure</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Pipiads review</li>
              <li>Pipiads pricing</li>
              <li>TikTok ad spy tool / TikTok ad library</li>
              <li>Find winning TikTok products</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Pipiads used for (practically)?</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Stop guessing</strong>: start from ads that already run, not intuition.
          </li>
          <li>
            <strong>Read market signals</strong>: country, longevity, repeated creative variations, engagement.
          </li>
          <li>
            <strong>Build a swipe file</strong>: hooks, angles, formats, proof, UGC scripts.
          </li>
          <li>
            <strong>Understand competitors</strong>: testing cadence, variations, relaunches, offer patterns.
          </li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions (use in briefs)</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Why does this ad keep running for 10+ days: offer, creative, or targeting?</li>
            <li>What’s the hook in the first 3 seconds?</li>
            <li>What proof is shown (before/after, demo, UGC, reviews)?</li>
          </ul>
        </div>
      </section>

      <section id="pipiads-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Pipiads</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔎 Advanced search</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Keywords / niche / promise</li>
              <li>Country</li>
              <li>Launch date</li>
              <li>Ad duration</li>
              <li>Engagement (likes, comments, shares)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📊 “Profit” signals</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ad longevity (strong signal)</li>
              <li>Relaunches / variations</li>
              <li>Access to ad videos (edit + script analysis)</li>
              <li>Store/page preview</li>
              <li>Save + organize winning ads</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (no keyword stuffing)</div>
          <p className="mt-2 text-gray-300">
            ad longevity, ad library, TikTok creatives, hook, angle, UGC, scaling, active ads, competitor, swipe file, creative strategy.
          </p>
        </div>
      </section>

      <section id="pipiads-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: find a winning product with Pipiads</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Filter by longevity</strong>: target ads active for 7–14+ days (often a better signal than likes).
            </li>
            <li>
              <strong>Group by offer</strong>: same product, different angles → you see what scales.
            </li>
            <li>
              <strong>Deconstruct the creative</strong>: hook (0–3s), demo, proof, CTA, pacing.
            </li>
            <li>
              <strong>Validate</strong>: demand (TikTok Shop/trends), margins, shipping, support constraints.
            </li>
            <li>
              <strong>Brief</strong>: 3 hooks + 2 angles + 1 proof → for your UGC creator/editor.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Ad active 7–14+ days</li>
            <li>Multiple variations</li>
            <li>Clear promise</li>
            <li>Visual demo</li>
            <li>Credible offer</li>
            <li>Shippable product</li>
          </ul>
        </div>
      </section>

      <section id="pipiads-creatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How to analyze TikTok creatives that convert</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">The “3–30–3” framework</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>
                <strong>3s</strong>: hook (problem/curiosity/proof)
              </li>
              <li>
                <strong>30s</strong>: demo + benefits + proof
              </li>
              <li>
                <strong>3s</strong>: offer + action (no overpromising)
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Questions to extract</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>What “problem” is shown on screen?</li>
              <li>What’s the strongest proof (before/after, measurement, reviews, demo)?</li>
              <li>What makes the offer credible (guarantee, bundle, real scarcity)?</li>
              <li>Which words keep showing up in comments?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Pipiads pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            If you buy Pipiads standalone, pricing depends on the plan. In the <strong>Ecom Efficiency</strong> bundle, we display Pipiads at{" "}
            <strong>$280/month</strong> of tool value.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-semibold">Included value (example)</div>
              <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                <li>
                  <strong>Pipiads</strong>: $280/month value
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-semibold">Credits</div>
              <p className="mt-2 text-gray-300">
                You get <strong>near‑unlimited credits</strong> for day‑to‑day usage (fair‑use), so you can research continuously without constantly hitting a hard
                cap.
              </p>
            </div>
          </div>
          <p className="mt-2">
            If you want access to it alongside SEO/SPY/AI tools in one place, you can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="pipiads-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Primary focus: TikTok Ads (less useful if you don’t buy that traffic)</li>
              <li>A viral ad isn’t necessarily profitable</li>
              <li>Creative + offer still matter most</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Mistakes that cost money</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Filtering on engagement only (you follow noise)</li>
              <li>Copying an edit/script 1:1 (credibility drop + creative fatigue)</li>
              <li>Testing without checking margins, logistics, support constraints</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Alternatives to Pipiads (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>
            <Link href="/tools/onlyads" className="text-purple-200 hover:text-white underline underline-offset-4" title="OnlyAds tool page">
              OnlyAds
            </Link>{" "}
            : ad monitoring + market signals (simple SPY complement).
          </li>
          <li>
            <Link href="/tools/atria" className="text-purple-200 hover:text-white underline underline-offset-4" title="Atria tool page">
              Atria
            </Link>{" "}
            : creative insights and angles (great for briefs + iteration).
          </li>
          <li>
            <Link href="/tools/kalodata" className="text-purple-200 hover:text-white underline underline-offset-4" title="Kalodata tool page">
              Kalodata
            </Link>{" "}
            : TikTok Shop/product data, useful to confirm demand.
          </li>
          <li>
            <Link href="/tools/foreplay" className="text-purple-200 hover:text-white underline underline-offset-4" title="Foreplay tool page">
              Foreplay
            </Link>{" "}
            : swipe file organization and creative workflow (perfect complement).
          </li>
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {pipiadsFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            If you run TikTok Ads, Pipiads is an accelerator: you spend more time executing (creative/offer) and less time guessing.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Try Ecom Efficiency now">
              create an account
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

