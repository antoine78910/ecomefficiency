import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";
import { toolsCatalog, type ToolCatalogItem, resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";
import { getFreeAlternatives } from "@/data/freeAlternatives";

const YEAR = 2026;

type ToolEntity = {
  slug: string;
  name: string;
  shortDescription: string;
  category?: ToolCatalogItem["category"] | "SEO";
  pageHref: string;
};

function cleanToolName(name: string): string {
  return String(name || "").replace(/\s*\(.*?\)\s*/g, "").trim() || String(name || "");
}

function getToolEntity(slug: string): ToolEntity | null {
  const t = toolsCatalog.find((x) => x.slug === slug);
  if (t) {
    return { slug: t.slug, name: cleanToolName(t.name), shortDescription: t.shortDescription, category: t.category, pageHref: `/tools/${t.slug}` };
  }

  const s = seoToolsCatalog.find((x) => x.slug === slug);
  if (!s) return null;
  const resolved = resolveToolSlug(s.name);
  const pageHref = resolved ? `/tools/${resolved}` : `/tools/seo/${s.slug}`;
  return { slug: s.slug, name: cleanToolName(s.name), shortDescription: s.shortDescription, category: "SEO", pageHref };
}

function deterministicPick<T>(arr: T[], seed: string, n: number): T[] {
  const list = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = list.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list.slice(0, n);
}

function metaTitle(toolName: string): string {
  return `${toolName} free alternative: best options in ${YEAR}`;
}

function metaDescription(toolName: string): string {
  let s = `Looking for a free alternative to ${toolName}? Compare free options and see how to access ${toolName} for $29.99/month with more value.`;
  if (s.length > 160) {
    s = `Looking for a free alternative to ${toolName}? Compare free options and access ${toolName} for $29.99/month with more value.`;
  }
  while (s.length < 150) s += " Built for ecommerce teams.";
  if (s.length > 160) s = s.slice(0, 160).trimEnd();
  return s;
}

function buildToc(toolName: string): TocItem[] {
  return [
    { id: "intro", label: `${toolName} free alternative (best ways to use it for less)`, level: 2 },
    { id: "method-1", label: `Method 1: use ${toolName} via Ecom Efficiency ($29.99/month)`, level: 2 },
    { id: "tradeoffs", label: "What you actually lose with a 100% free alternative", level: 2 },
    { id: "best-free", label: `Best free alternatives to ${toolName}`, level: 2 },
    { id: "choose", label: `How to choose the right ${toolName} free alternative`, level: 2 },
    { id: "mistakes", label: `Common mistakes when choosing a ${toolName} free alternative`, level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
    { id: "conclusion", label: "Conclusion", level: 2 },
  ];
}

function fallbackFreeAlternativesForCategory(tool: ToolEntity) {
  const cat = tool.category || "Other";
  const safeTool = tool.name;

  const base = [
    {
      name: "Manual workflow (spreadsheets + checklists)",
      type: "Free" as const,
      bestFor: "learning the process and validating a workflow",
      limitations: "time-consuming and not scalable",
    },
    { name: "Google Trends", type: "Free" as const, bestFor: "macro demand and trend direction checks", limitations: "not tool-specific depth" },
    {
      name: "YouTube tutorials + public docs",
      type: "Free" as const,
      bestFor: `learning ${safeTool}-like workflows before paying`,
      limitations: "no data, no automation, and no exports",
    },
  ];

  if (cat === "SEO") {
    return [
      { name: "Google Search Console", type: "Free" as const, bestFor: "real SEO performance data for your site", limitations: "no competitor data" },
      { name: "Google Keyword Planner", type: "Free" as const, bestFor: "keyword ideas and planning baselines", limitations: "not a full SEO suite" },
      { name: "Google Trends", type: "Free" as const, bestFor: "trend direction and seasonality checks", limitations: "no SERP depth or backlink data" },
    ];
  }
  if (cat === "Ads & Spy") {
    return [
      { name: "Meta Ads Library", type: "Free" as const, bestFor: "manual competitor ad research (real ads)", limitations: "no scoring or automation" },
      { name: "TikTok Creative Center", type: "Free" as const, bestFor: "TikTok ad discovery and trends", limitations: "limited filtering and depth" },
      { name: "Google Trends", type: "Free" as const, bestFor: "macro demand checks before testing", limitations: "not ad-level performance data" },
    ];
  }
  if (cat === "Product Research") {
    return [
      { name: "Google Trends", type: "Free" as const, bestFor: "macro demand signal checks", limitations: "not product-level profitability" },
      { name: "TikTok Creative Center", type: "Free" as const, bestFor: "spotting product trends via creatives", limitations: "not store-level validation" },
      { name: "Manual competitor store audit", type: "Free" as const, bestFor: "spot-checking what real stores sell", limitations: "slow and not scalable" },
    ];
  }
  if (cat === "Creative") {
    return [
      { name: "Canva (free tier)", type: "Freemium" as const, bestFor: "quick marketing visuals and ad tests", limitations: "free tier limits on premium assets" },
      { name: "Photopea", type: "Free" as const, bestFor: "advanced manual image edits in the browser", limitations: "manual work and learning curve" },
      { name: "Pexels / Unsplash", type: "Free" as const, bestFor: "free photos for blogs and socials", limitations: "less branded/ad-ready than premium libraries" },
    ];
  }
  if (cat === "Video") {
    return [
      { name: "CapCut (free)", type: "Free" as const, bestFor: "short-form editing with templates", limitations: "less automation than dedicated AI repurposers" },
      { name: "DaVinci Resolve", type: "Free" as const, bestFor: "professional editing at zero cost", limitations: "steeper learning curve" },
      { name: "Shotcut / Kdenlive", type: "Free" as const, bestFor: "basic editing on a free stack", limitations: "more manual and fewer short-form helpers" },
    ];
  }
  if (cat === "AI Writing") {
    return [
      { name: "LanguageTool", type: "Freemium" as const, bestFor: "grammar and clarity improvements", limitations: "free tier limits" },
      { name: "Grammarly (free)", type: "Freemium" as const, bestFor: "tone + clarity fixes", limitations: "advanced controls are paid" },
      { name: "Hemingway Editor", type: "Free" as const, bestFor: "simplifying readability", limitations: "no advanced rewriting automation" },
    ];
  }
  if (cat === "AI (LLM)") {
    return [
      { name: "Google Gemini", type: "Free" as const, bestFor: "general assistant usage", limitations: "not always consistent across long workflows" },
      { name: "Perplexity", type: "Free" as const, bestFor: "research with sources", limitations: "less flexible for copywriting-style outputs" },
      { name: "Open-source local LLMs", type: "Open-source" as const, bestFor: "power users who want local control", limitations: "setup and quality vary" },
    ];
  }
  if (cat === "AI (Image/Video)") {
    return [
      { name: "Stable Diffusion", type: "Open-source" as const, bestFor: "local image generation with control", limitations: "setup required; model quality varies" },
      { name: "Canva (free tier)", type: "Freemium" as const, bestFor: "fast visuals without setup", limitations: "less control and realism than specialized tools" },
      { name: "CapCut (free)", type: "Free" as const, bestFor: "editing + captions for UGC-style content", limitations: "not equivalent AI generation depth" },
    ];
  }
  if (cat === "Email & Outreach") {
    return [
      { name: "Manual prospecting (Google + LinkedIn)", type: "Free" as const, bestFor: "small-volume outreach", limitations: "slow and not scalable" },
      { name: "Google Sheets CRM", type: "Free" as const, bestFor: "simple pipeline tracking", limitations: "no enrichment/verification automation" },
      { name: "Free email verification (limited tools)", type: "Freemium" as const, bestFor: "basic checks on small lists", limitations: "caps and inconsistent coverage" },
    ];
  }
  if (cat === "Stock Assets") {
    return [
      { name: "Pexels", type: "Free" as const, bestFor: "free photos for content", limitations: "less premium selection vs paid libraries" },
      { name: "Pixabay", type: "Free" as const, bestFor: "general free assets", limitations: "less ad-ready, more generic" },
      { name: "Unsplash", type: "Free" as const, bestFor: "high-quality free photos", limitations: "not always ecommerce/ad oriented" },
    ];
  }
  if (cat === "Productivity") {
    return [
      { name: "Pomodoro timers", type: "Free" as const, bestFor: "focus sprints", limitations: "no personalization to your workflow" },
      { name: "YouTube focus music", type: "Free" as const, bestFor: "zero-friction background audio", limitations: "variable quality; no personalization" },
      { name: "Notion (free)", type: "Freemium" as const, bestFor: "simple SOPs and task lists", limitations: "not a dedicated focus tool" },
    ];
  }

  return base;
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

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = getToolEntity(tool);
  if (!t) return {};

  const title = metaTitle(t.name);
  const description = metaDescription(t.name);
  const canonical = `/free-alternative/${tool}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: title.replace(" | Ecom Efficiency", ""),
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: `${t.name} free alternative` }],
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

export default async function FreeAlternativeToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getToolEntity(tool);
  if (!t) notFound();

  const toc = buildToc(t.name);
  const publishedIso = new Date(`${YEAR}-02-06T00:00:00.000Z`).toISOString();

  const alt = getFreeAlternatives(t.slug);
  const alternatives = alt?.alternatives?.slice(0, 3) || fallbackFreeAlternativesForCategory(t);

  const introVariants = [
    `Searching for a ${t.name} free alternative doesn’t always mean you want something cheap at all costs. Most users simply want to test workflows or avoid committing too early.`,
    `If you’re looking for a free alternative to ${t.name}, the real goal is usually “usable enough” — not perfect. Let’s separate learning tools from execution tools.`,
    `A ${t.name} free alternative can work for light usage, but free options often break at scale. This page helps you choose based on outcomes.`,
  ];
  const intro = deterministicPick(introVariants, t.slug, 1)[0]!;

  const faqItems = [
    {
      q: `Is there a truly free alternative to ${t.name}?`,
      a: "Yes, but most free tools come with strong limitations (caps, delayed/sampled data, missing exports).",
    },
    {
      q: `Is Ecom Efficiency really cheaper than ${t.name}?`,
      a: `In most cases, yes — $29.99/month versus paying a full standalone plan for ${t.name}, while also getting access to many related tools.`,
    },
    {
      q: "Why not just use a free tool?",
      a: "Free tools are often fine for learning and basic checks, but not always for execution and repeatable workflows.",
    },
    {
      q: `When should I pay for ${t.name}?`,
      a: "When you need advanced features at scale and you already validated ROI from your workflow.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle(t.name).replace(" | Ecom Efficiency", ""),
    description: metaDescription(t.name),
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/free-alternative/${tool}` },
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

        <Link href="/tools" title="Back to all tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <span className="text-sm">← Back to tools</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Free alternatives</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~5 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.name} <span className="gradient-text">Free Alternative</span>: The Best Ways to Use {t.name} Without Paying Full Price
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Looking for a <strong>{t.name} free alternative</strong>? Here are the most practical ways to use {t.name} without paying full price.
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
            <SectionTitle id="intro">{t.name} free alternative</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">{intro}</p>
            <p className="text-gray-300 leading-relaxed mb-6">
              The goal here is to scale without shortcuts and without hurting data quality or credibility. This page shows the best ways to use {t.name}
              without paying full price, starting with the most efficient option.
            </p>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Quick context</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Tool</strong>: {t.name}
                </li>
                <li>
                  <strong>What it does</strong>: {t.shortDescription}
                </li>
                <li>
                  <strong>Tool page</strong>:{" "}
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={t.pageHref} title={`${t.name} overview`}>
                    {t.name} overview
                  </Link>
                </li>
              </ul>
            </div>

            <SectionTitle id="method-1">Method 1: Use {t.name} via Ecom Efficiency ($29.99/month)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Ecom Efficiency is not free, but it’s often the closest thing to a free alternative to {t.name} for most users. For <strong>$29.99/month</strong>
              , you get access to {t.name} plus 50+ AI, SEO, and spy tools in one unified environment.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Why this works as a “{t.name} free alternative”</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>You pay far less than {t.name}’s standalone price</li>
                <li>You still access real workflows (not just demos)</li>
                <li>You avoid paying hundreds per month for a single tool</li>
              </ul>
              <div className="mt-4">
                <Link
                  href="/pricing"
                  title="See pricing"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>

            <SectionTitle id="tradeoffs">What you actually lose with a 100% free alternative</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Before choosing a fully free alternative to {t.name}, it’s important to understand trade-offs. Free tools are good for learning and light usage,
              but rarely for execution at scale.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Common limitations of free tools</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Heavy usage caps</li>
                <li>Delayed or sampled data</li>
                <li>Missing exports</li>
                <li>No historical depth</li>
                <li>No scalability</li>
              </ul>
            </div>

            <SectionTitle id="best-free">Best free alternatives to {t.name}</SectionTitle>
            {alt?.note ? <div className="mb-4 text-sm text-gray-300">{alt.note}</div> : null}

            {alternatives.length ? (
              <div className="grid gap-4 mb-6">
                {alternatives.map((a, idx) => (
                  <div key={`${a.name}-${idx}`} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                    <SubTitle id={`free-${idx + 1}`}>{idx + 1}. {a.internalSlug ? <Link href={`/tools/${a.internalSlug}`} className="text-white hover:underline" title={a.name}>{a.name}</Link> : a.name}</SubTitle>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      <li>
                        <strong>Type</strong>: {a.type}
                      </li>
                      <li>
                        <strong>Best for</strong>: {a.bestFor}
                      </li>
                      <li>
                        <strong>Limitations</strong>: {a.limitations}
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6 text-gray-300">
                We don’t have a curated list of free alternatives for {t.name} yet. Use the decision framework below to pick the right option.
              </div>
            )}

            {alt?.includeShopifyFreeToolsLinks ? (
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
                <div className="text-white font-semibold mb-2">Free Shopify detection tools</div>
                <p className="text-gray-300 leading-relaxed mb-3">
                  If your workflow includes checking Shopify store tech quickly, you can also use our free detectors:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>
                    <Link className="text-purple-400 hover:text-purple-300 underline" href="/freetools/shopify-app-detector" title="Shopify app detector">
                      Shopify App Detector (free)
                    </Link>
                  </li>
                  <li>
                    <Link className="text-purple-400 hover:text-purple-300 underline" href="/freetools/shopify-theme-detector" title="Shopify theme detector">
                      Shopify Theme Detector (free)
                    </Link>
                  </li>
                </ul>
              </div>
            ) : null}

            <SectionTitle id="choose">How to choose the right {t.name} free alternative</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Decision framework</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  If you want <strong>zero cost</strong> → choose a free tool and accept limits.
                </li>
                <li>
                  If you want <strong>real execution</strong> → use Ecom Efficiency.
                </li>
                <li>
                  If you want <strong>enterprise depth</strong> → pay for {t.name} directly.
                </li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">Most teams don’t need enterprise depth — they need usable insights.</p>
            </div>

            <SectionTitle id="mistakes">Common mistakes when choosing a {t.name} free alternative</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Assuming “free” means “usable at scale”</li>
                <li>Stacking multiple weak free tools</li>
                <li>Ignoring time cost</li>
                <li>Over-optimizing for price instead of outcomes</li>
              </ul>
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
              A {t.name} free alternative can mean different things: completely free (but limited) or dramatically cheaper (but still effective). For most users,
              Ecom Efficiency at $29.99/month is the smartest middle ground — far cheaper than {t.name}, while still enabling real workflows across multiple
              tools.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">Free tools have their place, but execution-friendly access wins long-term.</p>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

