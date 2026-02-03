import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const helium10Toc: TocItem[] = [
  { id: "helium10-definition", label: "What is Helium 10?" },
  { id: "helium10-use-cases", label: "What it’s for (practical)" },
  { id: "helium10-features", label: "Key features" },
  { id: "helium10-method", label: "Fast method (product research)" },
  { id: "helium10-stack", label: "How it fits in your stack" },
  { id: "helium10-pricing", label: "Pricing & bundles" },
  { id: "helium10-limits", label: "Limits & common mistakes" },
  { id: "helium10-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const helium10Faq = [
  { q: "Is Helium 10 accurate?", a: "Yes — it’s one of the most trusted Amazon data toolsets. Treat data as estimates and validate with multiple signals." },
  { q: "Is Helium 10 good for beginners?", a: "Yes, but expect a learning curve. Start with one workflow (product research + keywords) before using every module." },
  { q: "Does Helium 10 replace Jungle Scout?", a: "For many sellers, yes. Helium 10 covers a broader end-to-end workflow, but pick based on your habits and team." },
  { q: "Is Helium 10 worth it?", a: "If you sell on Amazon seriously, yes. It reduces guesswork and helps you make better product, keyword, and listing decisions." },
] as const;

export default function Helium10Chapters() {
  return (
    <div className="space-y-10">
      <section id="helium10-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Helium 10?</h2>
        <p className="text-gray-300">
          <strong>Helium 10</strong> is an <strong>all-in-one Amazon FBA software suite</strong> designed to help sellers find products, optimize listings, track
          keywords, analyze competitors, and scale profitably on Amazon.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">Make Amazon decisions based on data, not intuition.</p>
        </div>
        <p className="mt-3 text-gray-300">
          Helium 10 covers the entire Amazon lifecycle: <strong>idea → listing → ranking → scaling</strong>.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can do fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Find profitable Amazon products</li>
              <li>Estimate sales & revenue (best-effort)</li>
              <li>Optimize listings for Amazon SEO</li>
              <li>Track keyword rankings</li>
              <li>Analyze competitors & niches</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Helium 10 review</li>
              <li>Helium 10 pricing</li>
              <li>Amazon FBA tools</li>
              <li>Amazon product research software</li>
              <li>keyword research for Amazon</li>
              <li>Helium 10 alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="helium10-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Helium 10 used for (practically)?</h2>
        <p className="text-gray-300">Helium 10 is used to build and scale Amazon businesses with structured data.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Avoid bad launches</strong> by validating demand before investing.
          </li>
          <li>
            <strong>Rank products</strong> using keyword data (not guesses).
          </li>
          <li>
            <strong>Improve conversions</strong> by optimizing listings.
          </li>
          <li>
            <strong>Monitor competitors</strong> and market shifts over time.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Amazon FBA product research</li>
              <li>Private label launches</li>
              <li>Keyword & listing optimization</li>
              <li>Competitor analysis</li>
              <li>Long-term Amazon scaling</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal questions it answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Is this product actually selling on Amazon?</li>
              <li>How competitive is this niche?</li>
              <li>Which keywords drive the most sales?</li>
              <li>How much revenue do competitors make (estimated)?</li>
              <li>How do I rank faster on Amazon?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="helium10-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Helium 10</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔎 Product research</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Black Box (product discovery)</li>
              <li>Xray (sales & revenue estimation)</li>
              <li>Niche validation</li>
              <li>Demand vs competition analysis</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔑 Keyword research & SEO</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Cerebro (reverse ASIN lookup)</li>
              <li>Magnet (keyword discovery)</li>
              <li>Search volume & ranking data</li>
              <li>Keyword tracking over time</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🛒 Listing optimization</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Listing Builder</li>
              <li>SEO-optimized copy</li>
              <li>Keyword placement guidance</li>
              <li>Conversion-focused structure</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📊 Competitor & market intelligence</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>ASIN tracking</li>
              <li>Pricing & inventory monitoring</li>
              <li>Market share analysis</li>
              <li>Trend detection</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            Amazon FBA, product research, keyword research, Amazon SEO, private label, listing optimization, competitor analysis, Amazon tools.
          </p>
        </div>
      </section>

      <section id="helium10-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: find a winning Amazon product with Helium 10</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Product discovery</strong>: use Black Box to find products with high demand & manageable competition.
            </li>
            <li>
              <strong>Sales validation</strong>: use Xray to estimate real monthly revenue.
            </li>
            <li>
              <strong>Keyword depth check</strong>: analyze search volume with Magnet & Cerebro.
            </li>
            <li>
              <strong>Competition analysis</strong>: review review counts, listing quality, and pricing.
            </li>
            <li>
              <strong>Profit validation</strong>: confirm margins, fees, logistics, and PPC costs.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick validation checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Consistent demand</li>
            <li>Reasonable review count</li>
            <li>Search volume depth</li>
            <li>Healthy margins</li>
            <li>Differentiation opportunity</li>
          </ul>
        </div>
      </section>

      <section id="helium10-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Helium 10 fits into a winning ecommerce stack</h2>
        <p className="text-gray-300">
          Helium 10 is a <strong>core Amazon foundation tool</strong>. It helps you validate products and keywords, launch with a better listing, then track and
          optimize as you scale.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Validate product & keyword depth</li>
            <li>Launch with an optimized listing</li>
            <li>Track rankings & competitors</li>
            <li>Scale with PPC + iteration</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs well with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Supplier & sourcing tools</li>
            <li>PPC management tools</li>
            <li>Design/creative tools (images, A+ content)</li>
          </ul>
        </div>
      </section>

      <section id="helium10-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Helium 10 pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Helium 10 offers multiple plans, typically ranging from <strong>$39 to $229/month</strong>, depending on tool access, usage limits, and team features.
          </p>
          <p className="mt-2">
            If you want Helium 10 alongside SEO, spy, AI & ecommerce tools, you can access it via <strong>Ecom Efficiency</strong> for a fraction of the cost.
          </p>
          <p className="mt-2">
            You can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="helium10-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Amazon-only (not Shopify / TikTok Shop)</li>
              <li>Estimates, not exact sales numbers</li>
              <li>Learning curve for beginners</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Trusting one metric only</li>
              <li>Ignoring differentiation</li>
              <li>Launching without keyword depth</li>
              <li>Underestimating PPC costs</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="helium10-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Helium 10 alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Jungle Scout: Amazon research & tracking</li>
          <li>Viral Launch: launch & keyword tools</li>
          <li>DataHawk: Amazon analytics</li>
          <li>Keepa: pricing & history tracking</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          Helium 10 stands out for its <strong>breadth</strong> and end-to-end ecosystem.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {helium10Faq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Helium 10 is an <strong>Amazon FBA command center</strong>. Used correctly, it turns Amazon from guesswork into a data-driven system.
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

