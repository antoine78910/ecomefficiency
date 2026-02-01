import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const dropshipIoToc: TocItem[] = [
  { id: "dropshipio-definition", label: "What is Dropship.io?" },
  { id: "dropshipio-use-cases", label: "What it’s used for (practically)" },
  { id: "dropshipio-features", label: "Key features" },
  { id: "dropshipio-method", label: "Fast method (find winners)" },
  { id: "dropshipio-creatives", label: "How to pair with creatives" },
  { id: "dropshipio-pricing", label: "Pricing & bundles" },
  { id: "dropshipio-limits", label: "Limits & common mistakes" },
  { id: "dropshipio-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const dropshipIoFaq = [
  {
    q: "Is Dropship.io reliable for finding winning products?",
    a: "Yes—especially to spot products with real store adoption, not just hype.",
  },
  {
    q: "Does Dropship.io work for TikTok Shop?",
    a: "Not really. It’s designed for classic Shopify dropshipping and store-level analysis.",
  },
  {
    q: "Is Dropship.io beginner-friendly?",
    a: "Yes. It’s one of the easiest ways to validate niches and avoid chasing fake viral products.",
  },
  {
    q: "What metric matters most?",
    a: "Product lifespan + number of independent stores selling it.",
  },
  {
    q: "Is Dropship.io worth it?",
    a: "If you want product-first validation and store-based signals, yes.",
  },
] as const;

export default function DropshipIoChapters() {
  return (
    <div className="space-y-10">
      <section id="dropshipio-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Dropship.io?</h2>
        <p className="text-gray-300">
          <strong>Dropship.io</strong> is a dropshipping product research and competitive intelligence tool focused on <strong>store-level data</strong>. Instead of
          starting from ads or social hype, it analyzes real e‑commerce stores to uncover what they sell, how products evolve over time, and which products are
          spreading across Shopify stores. The goal is to scale without shady shortcuts and without hurting your credibility.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Reverse‑engineer what already works in real stores</li>
              <li>Validate products with adoption signals (not just views)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Dropship.io review</li>
              <li>Dropship.io pricing</li>
              <li>Dropshipping product research tool</li>
              <li>Shopify product research</li>
              <li>Find winning dropshipping products</li>
              <li>Dropship.io alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="dropshipio-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Dropship.io used for (practically)?</h2>
        <p className="text-gray-300">
          Dropship.io is mainly used to find <strong>proven dropshipping products</strong> by analyzing stores—not creatives.
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Identify products already making money</strong> (store adoption)
          </li>
          <li>
            <strong>Spot trends earlier</strong> than ad-spy signals
          </li>
          <li>
            <strong>Avoid fake “viral” products</strong> with no store backing
          </li>
          <li>
            <strong>Validate niches</strong> with repeated demand patterns
          </li>
        </ul>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions Dropship.io answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How many stores sell this product?</li>
            <li>Has the product been live for weeks or months?</li>
            <li>Is the niche full of one‑hit stores or long‑term brands?</li>
            <li>Are stores adding or removing this product?</li>
            <li>Is the product early, trending, or saturated?</li>
          </ul>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Shopify store product research</li>
              <li>Niche validation before building a store</li>
              <li>Competitor product analysis</li>
              <li>Long‑term product discovery (evergreen)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can spot fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Products actively sold on Shopify</li>
              <li>Stores scaling a product over time</li>
              <li>New products added recently (early signals)</li>
              <li>Saturation level across stores</li>
              <li>Niches with repeated winners</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="dropshipio-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Dropship.io</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🏬 Store-based product discovery</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Browse products by Shopify stores</li>
              <li>See newly added products</li>
              <li>Track product lifespan</li>
              <li>Identify scaling stores</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📈 Product & trend analysis</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Trending product detection</li>
              <li>Store frequency analysis</li>
              <li>Demand consistency signals</li>
              <li>Niche-wide patterns</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔍 Advanced search & filters</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Product category</li>
              <li>Store country</li>
              <li>Store age</li>
              <li>Product launch date</li>
              <li>Product popularity across stores</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Competitive intelligence</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Reverse‑engineer winning stores</li>
              <li>See full product catalogs</li>
              <li>Detect copy‑paste vs original stores</li>
              <li>Understand niche structures</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            dropshipping product research, Shopify stores, winning products, niche validation, saturation analysis, competitor research, ecommerce trends, product
            lifespan, store analysis.
          </p>
        </div>
      </section>

      <section id="dropshipio-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: find a winning dropshipping product with Dropship.io</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Find repeated products</strong>: prioritize products sold by multiple independent stores.
            </li>
            <li>
              <strong>Check product lifespan</strong>: products live for 30+ days are stronger than short spikes.
            </li>
            <li>
              <strong>Analyze store quality</strong>: focus on serious stores (branding, catalog depth).
            </li>
            <li>
              <strong>Saturation check</strong>: too many low‑quality stores = late‑stage product.
            </li>
            <li>
              <strong>Validate margins & logistics</strong>: shipping cost, refund risk, support complexity.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick validation checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Sold by multiple stores</li>
            <li>Live for several weeks</li>
            <li>Clear use case</li>
            <li>Good margins</li>
            <li>Not massively copy‑pasted</li>
            <li>Scalable niche potential</li>
          </ul>
        </div>
      </section>

      <section id="dropshipio-creatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How to combine Dropship.io with creatives</h2>
        <p className="text-gray-300">
          Dropship.io doesn’t analyze ads or creatives—and that’s a good thing. Use it to validate <strong>what to sell</strong> and <strong>which niches work</strong>.
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>Validate product demand via store adoption</li>
          <li>Understand product structure & market pricing</li>
          <li>Then use ad spy tools to build creatives, hooks, and offers</li>
          <li>Differentiate your angle to avoid copying ads blindly</li>
        </ul>
      </section>

      <section id="dropshipio-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Dropship.io pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Dropship.io is subscription‑based, usually around <strong>$49 to $99/month</strong> depending on plan and access level.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Included value in Ecom Efficiency</div>
            <p className="mt-2 text-gray-300">
              In the Ecom Efficiency bundle, Dropship.io is listed at <strong>$49/month value</strong> (as shown in the landing page billing receipt).
            </p>
          </div>
          <p className="mt-3">
            If you want Dropship.io combined with spy, SEO, and AI tools in one dashboard, you can access it via{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="dropshipio-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Focused on Shopify/dropshipping (not TikTok Shop)</li>
              <li>No creative or ad performance data</li>
              <li>Still needs manual validation after discovery</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Picking products sold by too many low‑quality stores</li>
              <li>Ignoring shipping times and customer support load</li>
              <li>Assuming store presence = profitability</li>
              <li>Launching without differentiation</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="dropshipio-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Dropship.io alternatives (depending on your needs)</h2>
        <p className="text-gray-300">Best stacks pair Dropship.io (product discovery) with ad spy tools (execution). Examples:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <Link href="/tools/pipiads" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pipiads tool page">
              Pipiads
            </Link>
            : TikTok ad creatives & scaling
          </li>
          <li>
            <Link href="/tools/kalodata" className="text-purple-200 hover:text-white underline underline-offset-4" title="Kalodata tool page">
              Kalodata
            </Link>
            : TikTok Shop sales & GMV
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
          {dropshipIoFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Dropship.io is a product intelligence tool, not a hype engine. If you want to find products already sold by real stores, avoid fake viral products, and
            build based on proven demand, it’s a solid foundation tool.
          </p>
          <p className="mt-3 text-gray-300">
            For best results, combine it with ad spy and creative tools—or access everything in one place via{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create an account">
              Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

