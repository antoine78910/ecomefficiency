import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

const INFINITE_FULFILLMENT_URL =
  "https://infinitefulfillment.typeform.com/contact?typeform-source=537aanhyt63.typeform.com";

export const metadata: Metadata = {
  title: "China e-commerce supply chain: real costs & trusted agents | Ecom Efficiency",
  description:
    "Learn how to avoid hidden margins in China: agents, factories, shipping lines, and concrete methods to optimize your e-commerce supply chain.",
  alternates: { canonical: "/articles/china-ecommerce-supply-chain" },
  openGraph: {
    type: "article",
    url: "/articles/china-ecommerce-supply-chain",
    title: "China e-commerce supply chain: real costs & trusted agents",
    description:
      "Avoid hidden margins in China: understand agents, factories, shipping lines, and a clear framework to optimize your e-commerce supply chain.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "China e-commerce supply chain" }],
  },
};

const toc: TocItem[] = [
  { id: "why-opaque", label: "Why supply chains are opaque (and expensive)" },
  { id: "when-to-switch", label: "When to move from AliExpress to an agent" },
  { id: "real-cost-framework", label: "Real cost framework (simple breakdown)" },
  { id: "agent-honesty", label: "How to check if an agent is honest" },
  { id: "shipping-lines", label: "Shipping lines: where sellers get burned" },
  { id: "wechat", label: "WeChat: non-negotiable for sourcing" },
  { id: "cosmetics", label: "Special case: sourcing cosmetics" },
  { id: "margin-mistakes", label: "Common mistakes that kill margins" },
  { id: "seven-day-plan", label: "Simple 7‑day action plan" },
  { id: "conclusion", label: "Conclusion" },
  { id: "faq", label: "FAQ" },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

export default function ChinaSupplyChainArticlePage() {
  const publishedIso = new Date("2026-02-01T00:00:00.000Z").toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "China e-commerce supply chain: real costs & trusted agents",
    datePublished: publishedIso,
    dateModified: publishedIso,
    author: { "@type": "Organization", name: "Ecom Efficiency Team" },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": "https://www.ecomefficiency.com/articles/china-ecommerce-supply-chain" },
    description: metadata.description,
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <Link
          href="/articles"
          title="Back to all articles"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <span className="text-sm">← Back to articles</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Supply chain</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~10 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            China <span className="gradient-text">e-commerce supply chain</span>: real costs & trusted agents
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Most founders lose money per order because supply chains are opaque: hidden intermediaries, unclear pricing, and shipping lines you can’t audit.
          </p>
        </header>

        {/* Left sidebar (same structure as /blog/[slug]) */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="hidden lg:block lg:sticky lg:top-24 self-start flex flex-col">
            <div
              className="min-h-0 overflow-y-auto pr-1
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: "calc(100vh - 7rem - 220px)" }}
            >
              <ToolToc items={toc} defaultActiveId={toc[0]?.id} collapseSubheadings />
            </div>
            <div className="mt-6">
              <EcomToolsCta compact totalTools={50} />
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 max-w-3xl mx-auto lg:mx-0">
            <SectionTitle id="why-opaque">Why supply chains are opaque (and expensive)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              AliExpress is useful to validate a product, but it gives you almost no control:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>No real visibility on factories</li>
              <li>Limited control over quality</li>
              <li>Unstable suppliers and inconsistent shipping</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-4">
              As soon as volume increases, scaling without a structured supply chain becomes a growth blocker. Your profit is no longer “marketing-dependent”—it’s
              supply-chain dependent.
            </p>

            <SectionTitle id="when-to-switch">When to move from AliExpress to a China-based agent</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">AliExpress can help validate a product. It cannot build a brand.</p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Clear signals it’s time to switch</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>5–10 orders/day minimum</li>
                <li>Consistent demand (not one spike)</li>
                <li>Need better margins and delivery times</li>
              </ul>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">A China-based agent acts as the operational layer between you and factories:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Price negotiation</li>
              <li>Stock management</li>
              <li>Shipping line selection</li>
              <li>Basic quality control</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-4">
              This is a strategic transition, not a luxury—because every hidden margin becomes a tax on growth.
            </p>

            <SectionTitle id="real-cost-framework">Breaking down the real cost of an order (simple framework)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If your agent can’t clearly break down costs, that’s a red flag. A healthy cost structure looks like this:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Product cost</strong> (factory price)
              </li>
              <li>
                <strong>Domestic China shipping</strong> (usually minor)
              </li>
              <li>
                <strong>Picking & labor</strong>
              </li>
              <li>
                <strong>International shipping</strong> (the biggest lever)
              </li>
              <li>
                <strong>Agent commission</strong>
              </li>
            </ul>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Rule of thumb</p>
              <p className="text-gray-300 leading-relaxed">
                If you only see one all-in price, you’re exposed to hidden margins—because you can’t audit where profit is being taken.
              </p>
            </div>

            <SectionTitle id="agent-honesty">How to check if your agent is honest on pricing</SectionTitle>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">1) Benchmark factory pricing on 1688</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              <a
                href="https://www.1688.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-purple-400 hover:text-purple-300 underline"
                title="1688 marketplace"
              >
                1688
              </a>{" "}
              is the Chinese domestic marketplace where agents often source. You don’t buy there—you use it to benchmark pricing, detect abnormal gaps, and
              understand where margins may be hidden.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2) Learn to spot factory vs trader</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              A trader is an extra middleman who doesn’t manufacture, adds commission, and slows communication.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Trader warning signs</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>48–72h replies</li>
                  <li>Missing/delayed certificates</li>
                  <li>Incoherent catalogs (cosmetics + furniture + electronics)</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Real factory signals</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>Replies within 24h</li>
                  <li>Documents provided fast</li>
                  <li>Coherent product catalog</li>
                </ul>
              </div>
            </div>

            <SectionTitle id="shipping-lines">Shipping lines: where most sellers get burned</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Shipping is the most opaque part of the supply chain. Many sellers don’t realize that a shipping company ≠ a shipping line.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              Pricing depends on destination, weight, volume, and product type (standard, cosmetic, electronics, battery…).
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Concrete examples</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Phone case → standard line</li>
                <li>Lipstick / liquid cosmetic → cosmetic line (more expensive)</li>
                <li>Battery product → electronics line</li>
              </ul>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              A dishonest agent can quote a premium line, ship a cheaper line, and pocket the difference.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">How to verify</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Compare promised vs actual delivery time</li>
                <li>Watch for repeated excuses (“customs delay”, “exceptional issue”)</li>
                <li>Track consistency across multiple shipments</li>
              </ul>
            </div>

            <SectionTitle id="wechat">WeChat: a non-negotiable tool for sourcing</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              In China, business happens on WeChat—not WhatsApp. It improves response speed, credibility, and access to factories.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">How to get WeChat</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Sponsorship from an existing account (often 6+ months old)</li>
                <li>Third‑party verification service (fast and inexpensive)</li>
              </ul>
            </div>

            <SectionTitle id="cosmetics">Special case: selling cosmetics sourced from China</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              China can produce high-quality cosmetics, but compliance must be handled seriously—especially as you scale.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">White label</p>
                <p className="text-gray-300 leading-relaxed">Existing formula, fast branding, lower complexity.</p>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Private label</p>
                <p className="text-gray-300 leading-relaxed">Custom formula, higher MOQs, deeper differentiation.</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Mandatory compliance checklist</p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Product certificates (EU/US depending on market)</li>
                <li>Factory certifications</li>
                <li>Document ↔ product consistency</li>
                <li>Local lab testing once scaling</li>
              </ul>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              Double validation protects you legally and strengthens brand credibility long term.
            </p>

            <SectionTitle id="margin-mistakes">Common mistakes that kill margins</SectionTitle>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Chasing the lowest price without context</li>
              <li>Accepting all-in pricing with no breakdown</li>
              <li>Confusing a “well-branded” trader with a real factory</li>
              <li>Underestimating shipping impact</li>
              <li>Sacrificing quality for a few cents</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-4">
              Sustainable margins come from repeat customers—not short-term gains.
            </p>

            <SectionTitle id="seven-day-plan">Simple 7‑day action plan</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="space-y-2 text-gray-300">
                <li>
                  <strong>Day 1–2:</strong> identify your stable product + benchmark pricing on{" "}
                  <a
                    href="https://www.1688.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-purple-400 hover:text-purple-300 underline"
                    title="1688 marketplace"
                  >
                    1688
                  </a>
                </li>
                <li>
                  <strong>Day 3:</strong> audit your current agent (pricing, shipping, delays)
                </li>
                <li>
                  <strong>Day 4:</strong> compare with a second agent or structured fulfillment provider
                </li>
                <li>
                  <strong>Day 5:</strong> analyze shipping lines used (promised vs actual)
                </li>
                <li>
                  <strong>Day 6:</strong> verify certifications (sensitive products)
                </li>
                <li>
                  <strong>Day 7:</strong> decide: optimize, switch, or fully restructure supply
                </li>
              </ul>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              For brands that want to structure their China supply chain properly, with transparent pricing and reliable shipping lines, this approach is detailed
              here:{" "}
              <a
                href={INFINITE_FULFILLMENT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-purple-400 hover:text-purple-300 underline"
                title="Optimize your e-commerce supply chain in China"
              >
                Optimize your e-commerce supply chain in China
              </a>
              .
            </p>

            <SectionTitle id="conclusion">Conclusion</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Your supply chain is not an operational detail. It’s a profitability, stability, and scaling lever.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Stop guessing</li>
              <li>Negotiate with clarity</li>
              <li>Build a sustainable brand</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              If your volume exceeds 50 orders/day, serious fulfillment infrastructure becomes mandatory to scale without friction:{" "}
              <a
                href={INFINITE_FULFILLMENT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-purple-400 hover:text-purple-300 underline"
                title="Set up high-performance fulfillment from China"
              >
                Set up high-performance fulfillment from China
              </a>
              .
            </p>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {[
                {
                  q: "When does AliExpress stop being viable?",
                  a: "As soon as you want to scale beyond a few daily orders with stable margins and predictable delivery times.",
                },
                { q: "Should an agent always break down costs?", a: "Yes. A single all‑in price is a risk signal because you can’t audit hidden margins." },
                { q: "Is 1688 only for Chinese buyers?", a: "For purchasing, yes. For price benchmarking and verification, no." },
                {
                  q: "Are traders always bad?",
                  a: "No—but they must provide real value (negotiation leverage, speed, reliable QC). Otherwise they’re just a margin layer.",
                },
                {
                  q: "Is Chinese cosmetic sourcing risky?",
                  a: "Not if certifications are verified and lab testing is done once you scale. Compliance should be treated as non-negotiable.",
                },
              ].map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>

            <section className="mt-14">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Similar reads</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/articles/profitable-saturated-products"
                  title="How to be profitable on saturated products"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">How to be profitable on saturated products</div>
                  <div className="text-sm text-gray-400 mt-1">A 3‑pillar framework: better creatives, a stronger product page, and an offer that converts.</div>
                </Link>
                <Link
                  href="/articles/dropshipping-baking-supplies"
                  title="Dropshipping baking supplies guide"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">Dropshipping baking supplies (complete guide)</div>
                  <div className="text-sm text-gray-400 mt-1">Products, suppliers, margins, SEO, compliance, packaging, and acquisition channels.</div>
                </Link>
                <Link
                  href="/tools/dropship-io"
                  title="Dropship.io tool page"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">Dropship.io</div>
                  <div className="text-sm text-gray-400 mt-1">Validate products using real Shopify store adoption and store-level signals.</div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

