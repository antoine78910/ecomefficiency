import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";
import DiscountCouponCard from "@/components/DiscountCouponCard";
import { toolsCatalog, type ToolCatalogItem, resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog, type SeoTool } from "@/data/seoToolsCatalog";

const YEAR = 2026;

type DiscountTool = {
  slug: string;
  name: string;
  shortDescription: string;
  category?: string;
  pricing?: string;
  keyFeatures?: string[];
  practicalUseCases?: string[];
  bestFor?: string[];
  pageHref: string;
};

function normalizeCodeBase(slug: string): string {
  return String(slug || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getDiscountTool(slug: string): DiscountTool | null {
  const t = toolsCatalog.find((x) => x.slug === slug);
  if (t) {
    const pageHref = t.category === "SEO" ? `/tools/${t.slug}` : `/tools/${t.slug}`;
    return {
      slug: t.slug,
      name: t.name.replace(/\s*\(.*?\)\s*/g, "").trim() || t.name,
      shortDescription: t.shortDescription,
      category: t.category,
      practicalUseCases: t.practicalUseCases,
      bestFor: t.bestFor,
      pageHref,
    };
  }

  const s = seoToolsCatalog.find((x) => x.slug === slug);
  if (!s) return null;

  // If this SEO tool also exists in toolsCatalog, prefer the /tools/<slug> page.
  const resolved = resolveToolSlug(s.name);
  const pageHref = resolved ? `/tools/${resolved}` : `/tools/seo/${s.slug}`;

  return {
    slug: s.slug,
    name: s.name,
    shortDescription: s.shortDescription,
    category: "SEO",
    pricing: s.pricing,
    keyFeatures: s.keyFeatures,
    pageHref,
  };
}

function pickAlternatives(tool: DiscountTool): Array<{ name: string; href: string; description: string }> {
  const baseCategory = tool.category || "";
  const pool: ToolCatalogItem[] = toolsCatalog
    .filter((t) => t.slug !== tool.slug)
    .filter((t) => (baseCategory ? t.category === baseCategory : true));

  const fallback = toolsCatalog.filter((t) => t.slug !== tool.slug);
  const list = (pool.length ? pool : fallback).slice(0, 3);
  return list.map((t) => ({
    name: t.name.replace(/\s*\(.*?\)\s*/g, "").trim() || t.name,
    href: `/tools/${t.slug}`,
    description: t.shortDescription,
  }));
}

function buildToc(toolName: string): TocItem[] {
  return [
    { id: "intro", label: `${toolName} promo code: what to know`, level: 2 },
    { id: "best-way", label: `Best way to get ${toolName} cheaper in ${YEAR}`, level: 2 },
    { id: "coupons", label: "Coupon codes (reveal & copy)", level: 2 },
    { id: "official-code", label: `Does ${toolName} have an official promo code?`, level: 2 },
    { id: "current-discounts", label: `Current ${toolName} discounts & official offers`, level: 2 },
    { id: "seasonal", label: `${toolName} Black Friday, Christmas & seasonal deals`, level: 2 },
    { id: "pricing", label: `${toolName} pricing vs smarter alternatives`, level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
    { id: "conclusion", label: "Conclusion", level: 2 },
  ];
}

function metaTitle(toolName: string): string {
  return `${toolName} promo code & discount – how to save in ${YEAR} | Ecom Efficiency`;
}

function metaDescription(toolName: string): string {
  return `Looking for a ${toolName} promo code or discount? Discover the smartest way to reduce costs, compare options, and avoid unreliable coupons.`;
}

export async function generateStaticParams(): Promise<Array<{ tool: string }>> {
  const slugs = new Set<string>();
  for (const t of toolsCatalog) slugs.add(t.slug);
  for (const s of seoToolsCatalog) slugs.add(resolveToolSlug(s.name) || s.slug);
  return Array.from(slugs).map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const t = getDiscountTool(tool);
  if (!t) return {};

  const title = metaTitle(t.name);
  const description = metaDescription(t.name);
  const canonical = `/discount/${tool}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: title.replace(" | Ecom Efficiency", ""),
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: `${t.name} promo code` }],
    },
  };
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

function SubTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-28 text-xl md:text-2xl font-semibold text-white mt-8 mb-3">
      {children}
    </h3>
  );
}

export default async function DiscountToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getDiscountTool(tool);
  if (!t) notFound();

  const toc = buildToc(t.name);
  const codeBase = normalizeCodeBase(t.slug);
  const couponA = `${codeBase}26`;
  const couponB = `${codeBase}Q4`;
  const alternatives = pickAlternatives(t);

  const publishedIso = new Date(`${YEAR}-02-03T00:00:00.000Z`).toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle(t.name).replace(" | Ecom Efficiency", ""),
    description: metaDescription(t.name),
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/discount/${tool}` },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" },
    },
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <Link
          href="/tools"
          title="Back to all tools"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <span className="text-sm">← Back to tools</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Discounts
            </span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~4 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.name} <span className="gradient-text">Promo Code</span>, Discount in {YEAR}
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Looking for a <strong>{t.name} promo code</strong>, a <strong>{t.name} discount</strong>, or coupons like{" "}
            <strong>{couponA}</strong>? This guide shows the safest ways to reduce cost—without shady deals.
          </p>
        </header>

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

          <div className="min-w-0 max-w-3xl mx-auto lg:mx-0">
            <SectionTitle id="intro">{t.name} promo code: what to know</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you’re searching for a {t.name} coupon, your goal is simple: <strong>pay less for {t.name}</strong> without using unreliable deals.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              Most SaaS tools like {t.name} don’t run permanent public promo codes. Discounts (when they exist) are typically temporary, seasonal, or limited
              to specific plans.
            </p>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Quick context</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>What {t.name} is</strong>: {t.shortDescription}
                </li>
                <li>
                  <strong>Learn the tool</strong>:{" "}
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={t.pageHref} title={`${t.name} tool page`}>
                    {t.name} overview
                  </Link>
                </li>
                {t.pricing ? (
                  <li>
                    <strong>Typical pricing</strong>: {t.pricing}
                  </li>
                ) : null}
              </ul>
            </div>

            <SectionTitle id="best-way">Best way to get {t.name} cheaper in {YEAR}</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Before chasing a hypothetical {t.name} promo code, the smartest option is accessing {t.name} through a cost‑efficient bundle rather than paying
              full price for a single subscription.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Why EcomEfficiency beats any {t.name} coupon</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Access to {t.name}</li>
                <li>Near‑unlimited credits (depending on usage)</li>
                <li>Access to 50+ e-commerce tools (SEO, ads, product research, CRO, automation)</li>
                <li>Lower monthly cost than official {t.name} pricing (in most cases)</li>
                <li>One subscription instead of stacking SaaS bills</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                This isn’t a temporary coupon — it’s a structural cost reduction designed for operators who actually scale.
              </p>
              <div className="mt-4">
                <Link
                  href="/pricing"
                  title={`See how to access ${t.name} with EcomEfficiency`}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  See how to access {t.name} cheaper with EcomEfficiency
                </Link>
              </div>
            </div>

            <SectionTitle id="coupons">Coupon codes (reveal & copy)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              People often search for codes like <strong>{couponA}</strong> or <strong>{couponB}</strong>. These may or may not be accepted by {t.name} at
              checkout (tools change offers frequently). If a coupon box exists, try these first.
            </p>
            <div className="grid gap-4">
              <DiscountCouponCard
                title={`${t.name} coupon: ${couponA}`}
                code={couponA}
                description={`Try this first for ${YEAR}. If it doesn’t apply, use the bundle option below.`}
              />
              <DiscountCouponCard
                title={`${t.name} coupon: ${couponB}`}
                code={couponB}
                description="Seasonal-style code users search for (Q4 / holiday period)."
              />
            </div>

            <SectionTitle id="official-code">Does {t.name} have an official promo code?</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              In most cases, {t.name} does not offer a permanent public promo code.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">What usually exists</div>
              <ul className="space-y-2 text-gray-300">
                <li>❌ No always‑on codes like {codeBase}25</li>
                <li>✅ Occasional discounts tied to billing cycles or events</li>
                <li>✅ Limited offers for startups, agencies, or partners</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                That’s why relying on promo codes alone is unpredictable and inconsistent.
              </p>
            </div>

            <SectionTitle id="current-discounts">Current {t.name} discounts & official offers</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Depending on the period, {t.name} may offer annual billing discounts, free trials, or partner plans. These can help—but they still often cost
              more than bundled access when you’re using multiple tools.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Annual billing</div>
                  <div className="text-gray-300 mt-1 text-sm">Typically 10–30% off, but requires upfront yearly payment.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Free trial</div>
                  <div className="text-gray-300 mt-1 text-sm">Short trial period, usually with limitations (features/credits).</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Partner plans</div>
                  <div className="text-gray-300 mt-1 text-sm">Restricted eligibility and not always publicly accessible.</div>
                </div>
              </div>
            </div>

            <SectionTitle id="seasonal">{t.name} Black Friday, Christmas & seasonal deals</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Many users search for “{t.name} Black Friday deal”, “{t.name} Christmas discount”, or “{t.name} Cyber Monday promo”.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Historically</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Discounts range between 10% and 30%</li>
                <li>Offers last only a few days</li>
                <li>Often apply only to new users</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Even during these periods, a bundled setup is usually more cost‑effective long‑term if you use multiple tools.
              </p>
            </div>

            <SectionTitle id="pricing">{t.name} pricing vs smarter alternatives</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <div className="text-white font-semibold mb-2">When paying full price makes sense</div>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>You rely exclusively on {t.name}</li>
                  <li>You have a high SaaS budget</li>
                  <li>You don’t need additional tools</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <div className="text-white font-semibold mb-2">When an alternative is better</div>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>You run or scale an e-commerce business</li>
                  <li>You test multiple tools regularly</li>
                  <li>You want to reduce fixed monthly costs</li>
                  <li>You need flexibility without stacking subscriptions</li>
                </ul>
              </div>
            </div>

            {t.keyFeatures?.length ? (
              <>
                <SubTitle id="features">Key features of {t.name}</SubTitle>
                <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
                  <ul className="list-disc list-inside space-y-2 text-gray-300">
                    {t.keyFeatures.slice(0, 8).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            {(t.practicalUseCases?.length || t.bestFor?.length) && (
              <>
                <SubTitle id="use-cases">How {t.name} is used (practically)</SubTitle>
                <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
                  {t.bestFor?.length ? (
                    <>
                      <div className="text-white font-semibold mb-2">Best for</div>
                      <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                        {t.bestFor.slice(0, 6).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {t.practicalUseCases?.length ? (
                    <>
                      <div className="text-white font-semibold mb-2">Practical use cases</div>
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        {t.practicalUseCases.slice(0, 6).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </>
            )}

            <SubTitle id="alternatives">Alternatives (if you compare tools)</SubTitle>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {alternatives.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  title={a.name}
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">{a.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{a.description}</div>
                </Link>
              ))}
            </div>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {[
                {
                  q: `Is there an official ${t.name} promo code like ${codeBase}25?`,
                  a: `As of now, no permanent public promo code exists for ${t.name}. Most discounts are seasonal or plan‑specific.`,
                },
                {
                  q: `Is EcomEfficiency cheaper than a ${t.name} discount?`,
                  a: `In most scenarios, yes—bundled access costs less than discounted standalone pricing when you use multiple tools.`,
                },
                {
                  q: `Can I fully use ${t.name} with EcomEfficiency?`,
                  a: `Yes. You get access to the core features needed for real e-commerce workflows.`,
                },
                {
                  q: `When is the best time to buy ${t.name}?`,
                  a: `Only during rare seasonal promotions — or anytime via a smarter alternative that reduces your monthly SaaS stack cost.`,
                },
                {
                  q: "Is this legit and safe?",
                  a: "Yes. EcomEfficiency provides access without shady promo code hunting or unreliable third‑party deals.",
                },
              ].map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>

            <SectionTitle id="conclusion">Conclusion</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you were searching for a {t.name} promo code, the takeaway is clear: promo codes are rare, temporary, and often less effective than a
              long‑term cost‑efficient setup.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">
              For consistent savings, access to {t.name}, and 50+ additional e-commerce tools, the most reliable option is:{" "}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline" title="Ecom Efficiency pricing">
                get access to {t.name} at the best price with EcomEfficiency
              </Link>
              .
            </p>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

