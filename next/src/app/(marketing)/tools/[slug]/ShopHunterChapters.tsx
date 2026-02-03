import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const shopHunterToc: TocItem[] = [
  { id: "shophunter-definition", label: "What is ShopHunter?" },
  { id: "shophunter-use-cases", label: "What it’s for (practical)" },
  { id: "shophunter-features", label: "Key features" },
  { id: "shophunter-method", label: "Fast method (winner validation)" },
  { id: "shophunter-stack", label: "Best workflow (stack)" },
  { id: "shophunter-pricing", label: "Pricing & how to pay less" },
  { id: "shophunter-limits", label: "Limits & common mistakes" },
  { id: "shophunter-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const shopHunterFaq = [
  {
    q: "Is ShopHunter reliable for product research?",
    a: "Yes—especially to validate store adoption. The most reliable signals are: multiple independent stores selling the same product, and products that stay listed for 30+ days.",
  },
  {
    q: "Does ShopHunter show sales or revenue?",
    a: "No. ShopHunter focuses on store and product presence (what stores sell, add, and keep), not direct GMV or revenue.",
  },
  {
    q: "Which metric matters most in ShopHunter?",
    a: "Independent store count + product lifespan. A single store can be noise; repeated adoption across real stores is a stronger signal.",
  },
  {
    q: "Is ShopHunter beginner‑friendly?",
    a: "Yes. It’s easier than ad spy tools because you’re analyzing store reality (catalogs, launches, structure) instead of interpreting creatives and metrics.",
  },
  {
    q: "Is ShopHunter worth it?",
    a: "If you want product-first validation and competitor intelligence (Shopify-focused), yes—especially when combined with an ad spy tool for creative execution.",
  },
] as const;

export default function ShopHunterChapters() {
  return (
    <div className="space-y-10">
      <section id="shophunter-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is ShopHunter?</h2>
        <p className="text-gray-300">
          <strong>ShopHunter</strong> is a <strong>Shopify store research</strong> and <strong>competitor analysis</strong> tool. Instead of starting from ads or social
          hype, it starts from <strong>store-level data</strong> to understand what real ecommerce stores are selling, adding, and scaling.
        </p>
        <p className="mt-3 text-gray-300">
          Core idea: analyze real Shopify stores to identify winning products, niches, and competitors—<strong>not guesses</strong> or “viral noise”.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <p className="mt-2 text-gray-300">
              Analyze real Shopify stores to identify winning products, niches, and competitors—<strong>not guesses</strong>.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>ShopHunter review</li>
              <li>ShopHunter pricing</li>
              <li>Shopify store research tool</li>
              <li>Shopify competitor analysis</li>
              <li>Find winning Shopify products</li>
              <li>Ecommerce store intelligence</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="shophunter-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is ShopHunter used for (practically)?</h2>
        <p className="text-gray-300">
          ShopHunter is used to validate products and niches by analyzing <strong>stores</strong>, not creatives. It helps you focus on what’s real: catalogs, launches,
          and adoption.
        </p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Find products already selling (store adoption)</li>
              <li>Understand how competitors structure their stores</li>
              <li>Detect early trends before ads explode</li>
              <li>Avoid saturated products and copy-store noise</li>
              <li>Identify serious brands vs “clone” stores</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">High-signal questions ShopHunter answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How many independent stores sell this product?</li>
              <li>Is this product new, trending, or already saturated?</li>
              <li>Are serious brands selling it—or only short-lived clones?</li>
              <li>What products are stores adding right now?</li>
              <li>Is this niche growing or declining?</li>
              <li>Are stores adding or removing this product week over week?</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Dropshipping product research (store-first validation)</li>
              <li>Niche validation before building a store</li>
              <li>Competitor analysis (catalogs, pricing structure, positioning)</li>
              <li>Market research before launching a new store</li>
              <li>Long-term product discovery (evergreen products)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can spot fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Active Shopify stores by niche</li>
              <li>Products currently sold by competitors</li>
              <li>New product launches (early signals)</li>
              <li>Scaling stores vs short-lived stores</li>
              <li>Market saturation level</li>
              <li>Store “quality” signals (brand depth vs copy-paste)</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="shophunter-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of ShopHunter</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🏬 Shopify store discovery</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Browse stores by niche/category</li>
              <li>Identify top-performing stores</li>
              <li>Analyze store catalogs (product depth)</li>
              <li>Track store activity over time</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📦 Product & launch tracking</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Recently added products</li>
              <li>Store adoption frequency</li>
              <li>Product lifespan signals (days/weeks/months)</li>
              <li>Early trend detection before ads explode</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔍 Advanced filters</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Store country</li>
              <li>Niche / category</li>
              <li>Store age and activity level</li>
              <li>Product type</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Competitive intelligence</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Reverse-engineer store strategies</li>
              <li>Spot copy-paste vs branded stores</li>
              <li>Understand niche structures</li>
              <li>Detect saturation phases</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            Shopify competitor analysis, ecommerce store research, winning products, niche validation, store tracking, market intelligence, saturation analysis, product
            discovery.
          </p>
        </div>
      </section>

      <section id="shophunter-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: find a winning product with ShopHunter</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Find repeated products</strong>: look for products sold by multiple independent stores (stronger than a single “viral” store).
            </li>
            <li>
              <strong>Check store quality</strong>: prioritize stores with branding, depth, and multiple products (signals of real operations).
            </li>
            <li>
              <strong>Analyze product lifespan</strong>: products listed for weeks/months are usually stronger than 3-day spikes.
            </li>
            <li>
              <strong>Saturation check</strong>: too many low-quality clones often means late-stage.
            </li>
            <li>
              <strong>Validate margins & logistics</strong>: shipping time, refund risk, and support load decide real profitability.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick validation checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Multiple independent stores</li>
            <li>Product live for 30+ days</li>
            <li>Clear use case (demo-friendly)</li>
            <li>Healthy margins</li>
            <li>Not over-saturated</li>
            <li>Scalable niche</li>
          </ul>
        </div>
      </section>

      <section id="shophunter-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How ShopHunter fits into a winning ecommerce stack</h2>
        <p className="text-gray-300">
          ShopHunter is <strong>not</strong> an ad spy tool—it’s a <strong>foundation tool</strong>. The best workflow is:
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              Use <strong>ShopHunter</strong> to validate what to sell (store adoption + launch signals).
            </li>
            <li>Confirm niche structure and competition (brands vs clones).</li>
            <li>
              Use an ad spy tool to study creatives and angles (e.g.{" "}
              <Link href="/tools/pipiads" className="text-purple-400 hover:text-purple-300 underline">
                Pipiads
              </Link>
              ).
            </li>
            <li>Build your own angles & offers (don’t copy 1:1).</li>
          </ol>
        </div>
        <p className="mt-3 text-gray-300">
          This avoids chasing “winners” that look good in ads but have no real backend demand.
        </p>
      </section>

      <section id="shophunter-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 ShopHunter pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            ShopHunter is subscription-based, typically around <strong>$40 to $90/month</strong>, depending on plan and feature access.
          </p>
          <p className="mt-2">
            If you want ShopHunter alongside spy, SEO, and AI tools in one bundle, you can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency stack
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="shophunter-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Focused on Shopify only</li>
              <li>No ad performance data</li>
              <li>No direct revenue numbers</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Assuming store presence = profitability</li>
              <li>Ignoring logistics & support complexity</li>
              <li>Choosing products already cloned everywhere</li>
              <li>Skipping differentiation</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="shophunter-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 ShopHunter alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <Link href="/tools/dropship-io" className="text-purple-400 hover:text-purple-300 underline">
                Dropship.io
              </Link>{" "}
              → store-based product research (similar signal type)
            </li>
            <li>
              <Link href="/tools/pipiads" className="text-purple-400 hover:text-purple-300 underline">
                Pipiads
              </Link>{" "}
              → ad creatives & scaling execution
            </li>
            <li>
              <Link href="/tools/kalodata" className="text-purple-400 hover:text-purple-300 underline">
                Kalodata
              </Link>{" "}
              → TikTok Shop GMV & demand validation
            </li>
            <li>
              <Link href="/tools/winninghunter" className="text-purple-400 hover:text-purple-300 underline">
                Winning Hunter
              </Link>{" "}
              → faster discovery / timing signals (then validate with stores)
            </li>
          </ul>
          <p className="mt-3 text-gray-300">
            Best results usually come from <strong>ShopHunter (discovery)</strong> + <strong>ad spy (execution)</strong>.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="grid gap-3">
          {shopHunterFaq.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-semibold">{f.q}</div>
              <p className="mt-2 text-gray-300">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            ShopHunter is a <strong>store intelligence tool</strong>, not a hype engine. If you want to validate niches, spot real adoption, and avoid fake “viral”
            noise, it’s one of the best foundations you can add to your stack.
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

