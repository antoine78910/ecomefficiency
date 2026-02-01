import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const atriaToc: TocItem[] = [
  { id: "atria-definition", label: "What is Atria?" },
  { id: "atria-use-cases", label: "What it’s used for (practically)" },
  { id: "atria-features", label: "Key features" },
  { id: "atria-method", label: "Fast method (improve creatives)" },
  { id: "atria-stack", label: "How it fits in an ad stack" },
  { id: "atria-pricing", label: "Pricing & bundles" },
  { id: "atria-limits", label: "Limits & common mistakes" },
  { id: "atria-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const atriaFaq = [
  {
    q: "Is Atria useful for beginners?",
    a: "Yes—especially to learn why ads work (hooks, angles, structure) and to improve briefs and iteration quality.",
  },
  {
    q: "Does Atria work for TikTok only?",
    a: "No. The insights (hooks, angles, messaging frameworks) apply across TikTok, Meta, Shorts, and other paid social formats.",
  },
  {
    q: "What matters most in Atria?",
    a: "Recurring creative patterns across winners—then rebuilding those patterns into your own offers and scripts.",
  },
  {
    q: "Is Atria worth it?",
    a: "If creative quality is your bottleneck, yes—Atria helps you iterate faster and reduce wasted ad spend.",
  },
] as const;

export default function AtriaChapters() {
  return (
    <div className="space-y-10">
      <section id="atria-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Atria?</h2>
        <p className="text-gray-300">
          <strong>Atria</strong> is a <strong>creative intelligence</strong> platform built to understand <strong>why ads work</strong>, not just which ads exist.
          Instead of focusing on volume, it focuses on <strong>patterns</strong>: angles, hooks, messaging frameworks, and creative structure across top performers.
          The goal is to scale without shady shortcuts and without hurting your credibility.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Turn winning ads into repeatable creative systems</li>
              <li>Rebuild patterns—don’t copy ads 1:1</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Atria review</li>
              <li>Atria pricing</li>
              <li>Creative intelligence tool</li>
              <li>Ad creative analysis</li>
              <li>Find winning ad angles</li>
              <li>Creative strategy for ads</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="atria-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Atria used for (practically)?</h2>
        <p className="text-gray-300">
          Atria is used to <strong>improve creative performance</strong>, not to hunt random products. It helps you:
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Build better ad briefs</strong> (clear hook + angle + proof)
          </li>
          <li>
            <strong>Generate stronger hooks & angles</strong> from real patterns
          </li>
          <li>
            <strong>Avoid creative fatigue</strong> with structured remixing
          </li>
          <li>
            <strong>Systemize testing</strong> (same offer, multiple angles)
          </li>
          <li>
            <strong>Scale without copying</strong> (structure {" > "} script)
          </li>
        </ul>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions Atria answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Why does this ad convert?</li>
            <li>What emotional trigger is used?</li>
            <li>Which angle is actually driving results?</li>
            <li>What pattern repeats across top ads?</li>
            <li>How can this creative be remixed safely?</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Typical use cases</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Paid ads (TikTok, Meta, Shorts)</li>
            <li>Creative strategy & iteration</li>
            <li>UGC briefing for creators</li>
            <li>Scaling ad accounts without burning budgets</li>
          </ul>
        </div>
      </section>

      <section id="atria-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Atria</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Creative pattern analysis</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Hook categorization</li>
              <li>Angle mapping</li>
              <li>Messaging frameworks</li>
              <li>Emotional trigger breakdown</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎥 Creative insights</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Video structure patterns</li>
              <li>Script & pacing logic</li>
              <li>Offer positioning</li>
              <li>CTA effectiveness (what’s shown + said)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔍 Search & inspiration engine</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Filter by angle, hook, emotion</li>
              <li>Cross‑niche inspiration</li>
              <li>Creative clustering (patterns)</li>
              <li>High‑signal examples (less noise)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🛠️ Workflow support</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Build swipe files</li>
              <li>Improve briefing quality</li>
              <li>Faster iteration cycles</li>
              <li>Reduce failed tests</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            creative intelligence, ad angles, hooks, creative strategy, UGC ads, paid ads optimization, creative testing, messaging frameworks, creative fatigue,
            iteration.
          </p>
        </div>
      </section>

      <section id="atria-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: improve your ads with Atria</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Identify top patterns</strong>: find angles repeated across different brands.
            </li>
            <li>
              <strong>Deconstruct the hook</strong>: problem, curiosity, proof, contrast—what stops the scroll?
            </li>
            <li>
              <strong>Extract the message</strong>: what promise is made, and how is it framed?
            </li>
            <li>
              <strong>Rebuild, don’t copy</strong>: apply the structure to your product—not the exact script.
            </li>
            <li>
              <strong>Test systematically</strong>: same offer, multiple hooks and angles.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick creative checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear hook (0–3s)</li>
            <li>One strong angle</li>
            <li>Visual proof or demo</li>
            <li>Credible promise</li>
            <li>Clean CTA</li>
            <li>No overclaim</li>
          </ul>
        </div>
      </section>

      <section id="atria-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Atria fits into a winning ad stack</h2>
        <p className="text-gray-300">
          Atria does not replace ad spy tools—it complements them. A strong workflow is:
        </p>
        <ol className="mt-3 list-decimal list-inside space-y-2 text-gray-300">
          <li>Use product/data tools to validate demand</li>
          <li>Use ad spy tools to see what’s running</li>
          <li>
            Use <strong>Atria</strong> to understand why it works
          </li>
          <li>Build original creatives with higher win rate</li>
        </ol>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          This reduces wasted spend because you’re not testing random messages—you’re testing proven patterns on your offer.
        </div>
      </section>

      <section id="atria-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Atria pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Atria is subscription‑based, typically around <strong>$79 to $149/month</strong>, depending on plan and access level.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Included value in Ecom Efficiency</div>
            <p className="mt-2 text-gray-300">
              In the Ecom Efficiency bundle, Atria is listed at <strong>$159/month value</strong> (as shown in the landing page billing receipt).
            </p>
          </div>
          <p className="mt-3">
            If you want Atria combined with ad spy, SEO, and AI tools in one place, you can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency stack
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="atria-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Not a product research tool</li>
              <li>No GMV or sales data</li>
              <li>Creative insights only</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Using Atria to “find products”</li>
              <li>Copying angles without adapting the offer</li>
              <li>Ignoring brand positioning</li>
              <li>Overloading creatives with too many messages</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="atria-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Atria alternatives (depending on your needs)</h2>
        <p className="text-gray-300">Atria shines when used after discovery and before scaling. Alternatives/complements:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <Link href="/tools/pipiads" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pipiads tool page">
              Pipiads
            </Link>
            : ad discovery & scaling signals
          </li>
          <li>
            <Link href="/tools/foreplay" className="text-purple-200 hover:text-white underline underline-offset-4" title="Foreplay tool page">
              Foreplay
            </Link>
            : swipe file & creative workflow
          </li>
          <li>
            <Link href="/tools/onlyads" className="text-purple-200 hover:text-white underline underline-offset-4" title="OnlyAds tool page">
              OnlyAds
            </Link>
            : ad monitoring
          </li>
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {atriaFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Atria is a creative multiplier. If you already have a validated product and traffic but inconsistent ad performance, Atria helps you scale creatively
            without burning budgets by turning ads into a system—not a gamble.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create an account">
              create an account
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

