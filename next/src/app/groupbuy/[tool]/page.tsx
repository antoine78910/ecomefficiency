import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";
import { toolsCatalog, type ToolCatalogItem, resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog, type SeoTool } from "@/data/seoToolsCatalog";

const YEAR = 2026;

type GroupbuyTool = {
  slug: string;
  name: string;
  shortDescription: string;
  category?: ToolCatalogItem["category"] | "SEO";
  toolType: string;
  toolUseCase: string;
  toolPrice: string;
  pageHref: string;
};

// Official pricing overrides from the user-provided billing list (best-effort).
// Note: keep strings as-written (€, ranges, /year, etc.) because pages must display "official price" explicitly.
const OFFICIAL_PRICE_BY_SLUG: Record<string, string> = {
  // SEO, keywords & competitive research
  semrush: "~$129.95/mo",
  ahrefs: "~$129/mo",
  moz: "~$99/mo",
  sistrix: "~€99/mo (1 module)",
  "se-ranking": "~$55/mo",
  serpstat: "~$59/mo",
  mangools: "~$49/mo",
  spyfu: "~$39/mo",
  seobserver: "~€99/mo",
  seozoom: "~€79/mo",
  dinorank: "~€39/mo",
  xovi: "~€99/mo",
  ranxplorer: "~€49/mo",
  babbar: "~€49/mo",
  searchatlas: "~$99/mo",

  // Keywords, questions & content ideas
  ubersuggest: "~$29/mo",
  keywordtool: "~$69/mo",
  "keyword-tool": "~$69/mo",
  keysearch: "~$24/mo",
  answerthepublic: "~$49/mo",
  alsoasked: "~$15–29/mo",
  "1fr": "~€39/mo",
  textoptimizer: "~$39/mo",
  "text-optimizer": "~$39/mo",
  yourtextguru: "~€99/mo",

  // Backlinks, audits & technical SEO
  majestic: "~$49/mo",
  "screaming-frog": "~€259/year",
  woorank: "~$79/mo",
  seoptimer: "~$29/mo",
  haloscan: "~€49/mo",
  surferlink: "~$29–49/mo",
  "one-hour-indexing": "~$17/pack",

  // Content, AI & writing
  quillbot: "~$19.95/mo",
  wordai: "~$57/mo",
  smodin: "~$15–29/mo",
  writehuman: "~$29/mo",
  bypassgpt: "~$19–29/mo",
  academun: "~$20–30/mo",
  quetext: "~$17/mo",

  // E-commerce, Amazon, Etsy & product research
  "jungle-scout": "~$49/mo",
  junglescout: "~$49/mo",
  zonbase: "~$37/mo",
  amzscout: "~$49/mo",
  smartscout: "~$97/mo",
  alura: "~$19.99/mo",
  zikanalytics: "~$29/mo",
  "niche-scraper": "~$49/mo",
  pexda: "~$99/mo",

  // Creative assets & media
  freepik: "~€15/mo",
  flaticon: "~€12/mo",
  iconscout: "~$15/mo",
  "envato-elements": "~€16.50/mo",
  "123rf": "~$29/mo",
  storyblocks: "~$30/mo",
  "motion-array": "~$29/mo",
  artlist: "~$16.60/mo",

  // Data, outreach & misc
  similarweb: "~$125/mo",
  buzzsumo: "~$199/mo",
  hunter: "~$49/mo",
  publicwww: "~$49/mo",
  colinkri: "~€29/mo",
  domcop: "~$56/mo",

  // Non-SEO tools present in EcomEfficiency (fallbacks from our own positioning/value list)
  pipiads: "$280/mo",
  atria: "$159/mo",
  runway: "$95/mo",
  "flair-ai": "$149/mo",
  "exploding-topics": "$39/mo",
  sendshort: "$59/mo",
  elevenlabs: "$220/mo",
  fotor: "$15/mo",
  foreplay: "$149/mo",
  kalodata: "$129.99/mo",
  "dropship-io": "$49/mo",
  winninghunter: "$79/mo",
  shophunter: "$75/mo",
  midjourney: "$72/mo",
  canva: "$449/mo",
  turboscribe: "$20/mo",
  chatgpt: "$20/mo",
  higgsfield: "$250/mo",
  vmake: "$9.99/mo",
  heygen: "$80/mo",
};

function cleanToolName(name: string): string {
  return String(name || "").replace(/\s*\(.*?\)\s*/g, "").trim() || String(name || "");
}

function getToolPrice(slug: string, seoTool?: SeoTool): string {
  if (OFFICIAL_PRICE_BY_SLUG[slug]) return OFFICIAL_PRICE_BY_SLUG[slug]!;
  if (seoTool?.pricing) return seoTool.pricing;
  return "Official pricing varies by plan.";
}

function getToolTypeFromCategory(category?: ToolCatalogItem["category"] | "SEO", slug?: string): string {
  const s = String(slug || "");
  const amazonSlugs = new Set(["helium10", "junglescout", "jungle-scout", "zonbase", "amzscout", "smartscout"]);
  if (amazonSlugs.has(s)) return "Amazon tool";
  if (s === "alura") return "Etsy tool";
  if (s === "zikanalytics") return "eBay tool";

  switch (category) {
    case "SEO":
      return "SEO tool";
    case "Ads & Spy":
      return "Ads spy tool";
    case "Product Research":
      return "Product research tool";
    case "Video":
      return "Video tool";
    case "Creative":
    case "Stock Assets":
      return "Creative assets tool";
    case "AI Writing":
      return "AI writing tool";
    case "AI (LLM)":
      return "AI assistant tool";
    case "AI (Image/Video)":
      return "AI creative tool";
    case "Email & Outreach":
      return "Email & outreach tool";
    case "Productivity":
      return "Productivity tool";
    default:
      return "Business tool";
  }
}

function getToolUseCase(t: { category?: ToolCatalogItem["category"] | "SEO"; practicalUseCases?: string[] }): string {
  // Prefer an explicit practical use-case if available (keeps copy grounded and tool-specific).
  const fromCatalog = t.practicalUseCases?.[0];
  if (fromCatalog) return fromCatalog.replace(/\.$/, "");

  switch (t.category) {
    case "SEO":
      return "SEO analysis and keyword research";
    case "Ads & Spy":
      return "ads spying and creative research";
    case "Product Research":
      return "product research and competitor tracking";
    case "Video":
      return "short-form video editing and repurposing";
    case "Creative":
    case "Stock Assets":
      return "creative assets and design production";
    case "AI Writing":
    case "AI (LLM)":
      return "content writing and workflow automation";
    case "AI (Image/Video)":
      return "AI creative generation for ads";
    case "Email & Outreach":
      return "email outreach and lead discovery";
    case "Productivity":
      return "productivity and focus";
    default:
      return "marketing operations";
  }
}

function getGroupbuyTool(slug: string): GroupbuyTool | null {
  const t = toolsCatalog.find((x) => x.slug === slug);
  if (t) {
    return {
      slug: t.slug,
      name: cleanToolName(t.name),
      shortDescription: t.shortDescription,
      category: t.category,
      toolType: getToolTypeFromCategory(t.category, t.slug),
      toolUseCase: getToolUseCase({ category: t.category, practicalUseCases: t.practicalUseCases }),
      toolPrice: getToolPrice(t.slug),
      pageHref: `/tools/${t.slug}`,
    };
  }

  const s = seoToolsCatalog.find((x) => x.slug === slug);
  if (!s) return null;

  const resolved = resolveToolSlug(s.name);
  const pageHref = resolved ? `/tools/${resolved}` : `/tools/seo/${s.slug}`;

  return {
    slug: s.slug,
    name: cleanToolName(s.name),
    shortDescription: s.shortDescription,
    category: "SEO",
    toolType: getToolTypeFromCategory("SEO", s.slug),
    toolUseCase: getToolUseCase({ category: "SEO" }),
    toolPrice: getToolPrice(s.slug, s),
    pageHref,
  };
}

function buildToc(toolName: string): TocItem[] {
  return [
    { id: "intro", label: `Best ${toolName} group buy in ${YEAR}`, level: 2 },
    { id: "what-is", label: `What is a ${toolName} group buy?`, level: 2 },
    { id: "choose", label: `How to choose a reliable ${toolName} group buy`, level: 2 },
    { id: "platforms", label: `Best ${toolName} group buy platforms in ${YEAR} (comparison)`, level: 2 },
    { id: "ecomefficiency", label: "Ecom Efficiency (best all-in-one)", level: 3 },
    { id: "toolscale", label: "Toolscale (content & AI focused)", level: 3 },
    { id: "sharetool", label: "Sharetool (single-tool alternative)", level: 3 },
    { id: "ecom-tools", label: "Ecom Tools (product research oriented)", level: 3 },
    { id: "groupbuyseotools", label: "GroupBuySEOTools.org (SEO-only focus)", level: 3 },
    { id: "official-vs-groupbuy", label: `Official ${toolName} price vs group buy access`, level: 2 },
    { id: "when", label: `When a ${toolName} group buy makes sense (and when it doesn’t)`, level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
    { id: "conclusion", label: "Conclusion", level: 2 },
  ];
}

function metaTitle(toolName: string): string {
  // Target: "[tool] group buy" + "group buy [tool]" without stuffing.
  return `Best ${toolName} group buy in ${YEAR}: prices & limitations`;
}

function metaDescription(toolName: string): string {
  return `Compare ${toolName} group buy options in ${YEAR}: pricing, credits, access limits, support quality, and real trade-offs (no hype, just facts).`;
}

function h1(toolName: string, toolPrice: string): string {
  return `Best ${toolName} group buy in ${YEAR}: cheaper alternatives to ${toolPrice}`;
}

export async function generateStaticParams(): Promise<Array<{ tool: string }>> {
  const slugs = new Set<string>();
  for (const t of toolsCatalog) slugs.add(t.slug);
  for (const s of seoToolsCatalog) {
    slugs.add(s.slug);
    const resolved = resolveToolSlug(s.name);
    if (resolved) slugs.add(resolved);
  }
  return Array.from(slugs).map((tool) => ({ tool }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool } = await params;
  const t = getGroupbuyTool(tool);
  if (!t) return {};

  const title = metaTitle(t.name);
  const description = metaDescription(t.name);
  const canonical = `/groupbuy/${tool}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: title.replace(" | Ecom Efficiency", ""),
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: `${t.name} groupbuy` }],
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

export default async function GroupbuyToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getGroupbuyTool(tool);
  if (!t) notFound();

  const toc = buildToc(t.name);

  const faqItems = [
    {
      q: `Is a ${t.name} group buy worth it in ${YEAR}?`,
      a: `Yes—especially for freelancers and small teams who don’t want to pay ${t.toolPrice} for a single tool.`,
    },
    {
      q: `Do groupbuys offer full ${t.name} features?`,
      a: `Most platforms provide core features, but advanced options can be limited (credits, exports, speed, or stability).`,
    },
    {
      q: `Is a groupbuy better than buying ${t.name} alone?`,
      a: `If you need multiple tools, usually yes. If you only need ${t.name}, a single-tool option can make more sense.`,
    },
    {
      q: "Are credits limited?",
      a: "It depends on the platform. Some reset weekly or daily, while others cap credits per user/session.",
    },
  ];

  const publishedIso = new Date(`${YEAR}-02-04T00:00:00.000Z`).toISOString();
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle(t.name).replace(" | Ecom Efficiency", ""),
    description: metaDescription(t.name),
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/groupbuy/${tool}` },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" },
    },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

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
              Group buy
            </span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~5 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{h1(t.name, t.toolPrice)}</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            If you’re searching for <strong>{t.name} group buy</strong> or <strong>group buy {t.name}</strong> options, start with the one thing that
            matters: the official price is <strong>{t.toolPrice}</strong>—often too expensive for freelancers, ecom operators, and small teams.
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
            <SectionTitle id="intro">Best {t.name} group buy in {YEAR}</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              A <strong>{t.name} group buy</strong> is a shared-access model that reduces cost while keeping access structured (limits, credits, support).
              The goal is to save money without relying on shady shortcuts or damaging your credibility.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              Below is a clear, objective comparison of reliable group buy platforms in {YEAR}. This page is focused on <strong>{t.name}</strong>{" "}
              specifically ({t.toolType}), with practical context for {t.toolUseCase}.
            </p>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Quick context</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Tool</strong>: {t.name}
                </li>
                <li>
                  <strong>Tool type</strong>: {t.toolType}
                </li>
                <li>
                  <strong>Official price</strong>: {t.toolPrice}
                </li>
                <li>
                  <strong>Learn the tool</strong>:{" "}
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={t.pageHref} title={`${t.name} overview`}>
                    {t.name} overview
                  </Link>
                </li>
              </ul>
            </div>

            <SectionTitle id="what-is">What is a {t.name} group buy?</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              A <strong>{t.name} group buy</strong> is a shared-access model where multiple users split the cost of premium tools like {t.name}, whose
              official price is <strong>{t.toolPrice}</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              Instead of paying full price for a single tool, users join a platform that provides controlled access, usage limits, and support—making advanced{" "}
              {t.toolType} accessible at scale.
            </p>

            <SectionTitle id="choose">How to choose a reliable {t.name} group buy</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Checklist</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Transparent monthly pricing</li>
                <li>Clear credit system (weekly or daily resets)</li>
                <li>Stable access to {t.name} core features</li>
                <li>Responsive support when tools break</li>
                <li>Community or roadmap visibility</li>
              </ul>
            </div>

            <SectionTitle id="platforms">Best {t.name} group buy platforms in {YEAR} (comparison)</SectionTitle>

            <SubTitle id="ecomefficiency">Ecom Efficiency (best all-in-one {t.name} group buy)</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed mb-4">
                Ecom Efficiency offers one of the most balanced <strong>{t.name} group buy</strong> solutions in {YEAR}. For{" "}
                <strong>$30/month</strong>, users get access to <strong>{t.name}</strong> alongside a full marketing stack, with frequent credit renewals
                and strong support.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                This solution is designed for users who need {t.name} + other tools, without juggling multiple subscriptions.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Price</strong>: $30/month
                </li>
                <li>
                  <strong>{t.name} access</strong>: included
                </li>
                <li>
                  <strong>Credits</strong>: quasi-unlimited (weekly, some tools daily)
                </li>
                <li>
                  <strong>Tool updates</strong>: 1 new tool/month (community vote)
                </li>
                <li>
                  <strong>Support</strong>: very active
                </li>
                <li>
                  <strong>Community</strong>: Discord
                </li>
              </ul>
              <div className="mt-4">
                <Link
                  href="/pricing"
                  title="See Ecom Efficiency pricing"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>

            <SubTitle id="toolscale">Toolscale (content & AI focused)</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed">
                Toolscale focuses primarily on content creation and AI tools. While {t.name} may be available, the platform is significantly more expensive
                at <strong>€50/month</strong> and user feedback often mentions recurring bugs.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mt-4">
                <li>
                  <strong>Price</strong>: €50/month
                </li>
                <li>
                  <strong>{t.name} access</strong>: partial / secondary
                </li>
                <li>
                  <strong>Main focus</strong>: AI & content tools
                </li>
              </ul>
            </div>

            <SubTitle id="sharetool">Sharetool (single-tool alternative)</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed">
                Sharetool is not a true {t.name} groupbuy. It allows users to purchase access to a single tool only. This can make sense if you need only{" "}
                {t.name}, but becomes expensive quickly when multiple tools are required—especially since some tools exceed $30/month individually.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 mt-4">
                <li>
                  <strong>Model</strong>: pay-per-tool
                </li>
                <li>
                  <strong>{t.name} price</strong>: varies (often close to {t.toolPrice})
                </li>
              </ul>
            </div>

            <SubTitle id="ecom-tools">Ecom Tools (product research oriented)</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed">
                Ecom Tools focuses mainly on product research and spy tools. Credits are limited and the tool library is smaller, making it less suitable for
                users who rely heavily on {t.name} for advanced workflows.
              </p>
            </div>

            <SubTitle id="groupbuyseotools">GroupBuySEOTools.org (SEO-only focus)</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed">
                GroupBuySEOTools.org is mainly oriented toward SEO tools like {t.name}. Feedback is mixed, with limited visibility on support quality and long‑term
                stability. Best suited for pure SEO users with narrow needs.
              </p>
            </div>

            <SectionTitle id="official-vs-groupbuy">Official {t.name} price vs group buy access</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-300">
                    <th className="py-2 pr-4 font-semibold">Option</th>
                    <th className="py-2 pr-4 font-semibold">Monthly cost</th>
                    <th className="py-2 pr-4 font-semibold">Tools included</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-white/10">
                    <td className="py-3 pr-4">Official {t.name}</td>
                    <td className="py-3 pr-4">{t.toolPrice}</td>
                    <td className="py-3 pr-4">1 tool</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="py-3 pr-4">Group buy</td>
                    <td className="py-3 pr-4">$30–€50</td>
                    <td className="py-3 pr-4">Multiple tools</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SectionTitle id="when">When a {t.name} group buy makes sense (and when it doesn’t)</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <div className="text-white font-semibold mb-2">Group buy is ideal if you</div>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>need {t.name} occasionally</li>
                  <li>run multiple projects</li>
                  <li>want to reduce SaaS costs</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <div className="text-white font-semibold mb-2">Official subscription is better if you</div>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>need 100% native features</li>
                  <li>run enterprise-level workflows</li>
                  <li>require dedicated support from {t.name}</li>
                </ul>
              </div>
            </div>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>

            <SectionTitle id="conclusion">Conclusion</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              A <strong>{t.name} group buy</strong> is no longer a risky workaround. In {YEAR}, the best platforms operate like structured SaaS ecosystems with
              clear limits, support, and communities.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">
              For users who want access to {t.name} and more, without paying <strong>{t.toolPrice}</strong>, an all‑in‑one solution remains the most efficient
              choice.
            </p>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

