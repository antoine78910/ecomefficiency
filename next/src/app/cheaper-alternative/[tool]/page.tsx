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

type CheaperTool = {
  slug: string;
  name: string;
  shortDescription: string;
  category?: ToolCatalogItem["category"] | "SEO";
  pricing?: string;
  practicalUseCases?: string[];
  bestFor?: string[];
  pageHref: string;
};

function cleanToolName(name: string): string {
  return String(name || "").replace(/\s*\(.*?\)\s*/g, "").trim() || String(name || "");
}

function getCheaperTool(slug: string): CheaperTool | null {
  const t = toolsCatalog.find((x) => x.slug === slug);
  if (t) {
    return {
      slug: t.slug,
      name: cleanToolName(t.name),
      shortDescription: t.shortDescription,
      category: t.category,
      practicalUseCases: t.practicalUseCases,
      bestFor: t.bestFor,
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
    pricing: s.pricing,
    pageHref,
  };
}

function deterministicPick<T>(arr: T[], seed: string, n: number): T[] {
  const list = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // Fisher–Yates with deterministic PRNG
  for (let i = list.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list.slice(0, n);
}

function relatedInternalTools(tool: CheaperTool): Array<{ slug: string; name: string; href: string; description: string; pricing?: string }> {
  const baseCat = tool.category || "Other";

  // Hand-picked “best match” internal links (per user spec).
  const preferredByCategory: Record<string, string[]> = {
    "Ads & Spy": ["kalodata", "winninghunter", "shophunter", "foreplay", "atria"],
    "Product Research": ["winninghunter", "shophunter", "pipiads", "kalodata"],
    "AI (Image/Video)": ["higgsfield", "freepik", "vmake", "midjourney"],
    Video: ["vmake", "sendshort", "heygen", "higgsfield"],
    Creative: ["freepik", "flair-ai", "fotor", "canva"],
    "Stock Assets": ["freepik", "iconscout", "flaticon", "envato-elements"],
    "AI (LLM)": ["chatgpt"],
    "AI Writing": ["quillbot", "quetext"],
    "Email & Outreach": ["hunter"],
    SEO: ["ahrefs", "ubersuggest", "alsoasked", "keyword-tool", "mangools"],
    Productivity: ["turboscribe", "brain-fm"],
    Other: ["academun"],
  };

  const preferred = preferredByCategory[baseCat] || preferredByCategory.Other!;
  const pickedSlugs = preferred.filter((s) => s !== tool.slug);

  const resolved: ToolCatalogItem[] = pickedSlugs
    .map((s) => toolsCatalog.find((t) => t.slug === s))
    .filter(Boolean) as ToolCatalogItem[];

  // If we still don’t have enough, fallback to same-category tools.
  const fallbackPool = toolsCatalog.filter((t) => t.slug !== tool.slug && (tool.category ? t.category === tool.category : true));
  const extra = deterministicPick(fallbackPool, tool.slug, 3).filter((t) => !resolved.some((r) => r.slug === t.slug));

  const final = [...resolved, ...extra].slice(0, 3);
  return final.map((t) => ({
    slug: t.slug,
    name: cleanToolName(t.name),
    href: `/tools/${t.slug}`,
    description: t.shortDescription,
  }));
}

function metaTitle(toolName: string): string {
  // Keep it short enough even if the layout appends "| Ecom Efficiency".
  return `${toolName} cheaper alternative: buy for less (${YEAR})`;
}

function metaDescription(toolName: string): string {
  // Target 150–160 characters. We keep it short and pad if needed.
  let s = `Cheaper alternative to ${toolName}: compare options and learn how to buy ${toolName} cheaper without sacrificing reliability or data quality.`;
  if (s.length > 160) {
    s = `Cheaper alternative to ${toolName}: compare options and buy ${toolName} cheaper without sacrificing reliability or quality.`;
  }
  if (s.length > 160) s = s.slice(0, 160).trimEnd();
  while (s.length < 150) s += " Built for ecommerce teams.";
  if (s.length > 160) s = s.slice(0, 160).trimEnd();
  return s;
}

function buildToc(toolName: string): TocItem[] {
  return [
    { id: "intro", label: `${toolName} cheaper alternative (and how to buy ${toolName} cheaper)`, level: 2 },
    { id: "why-expensive", label: `Why ${toolName} is expensive for most teams`, level: 2 },
    { id: "ranked", label: `Best cheaper alternative to ${toolName} (ranked)`, level: 2 },
    { id: "buy-cheaper", label: `How to buy ${toolName} cheaper (without switching)`, level: 2 },
    { id: "mistakes", label: "Common mistakes", level: 2 },
    { id: "plan", label: "7-day action plan", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
    { id: "conclusion", label: "Conclusion", level: 2 },
  ];
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
  const t = getCheaperTool(tool);
  if (!t) return {};

  const title = metaTitle(t.name);
  const description = metaDescription(t.name);
  const canonical = `/cheaper-alternative/${tool}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: title.replace(" | Ecom Efficiency", ""),
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: `${t.name} cheaper alternative` }],
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

export default async function CheaperAlternativeToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getCheaperTool(tool);
  if (!t) notFound();

  const toc = buildToc(t.name);
  const related = relatedInternalTools(t);

  const introVariants = [
    `If you’re looking for a cheaper alternative to ${t.name}, the goal isn’t to cut corners — it’s to scale smarter without losing data quality, execution speed, or long-term credibility.`,
    `Searching “${t.name} cheaper alternative” usually means one thing: you’re paying for features you don’t fully use. This page helps you buy ${t.name} cheaper or switch to better-priced options based on real workflows.`,
    `A cheaper alternative to ${t.name} should reduce cost without creating new problems (unstable access, weak data, or fragmented tooling). Below is a simple, practical way to choose.`,
    `Most teams don’t need “more features” — they need clearer decisions. If you want to buy ${t.name} cheaper, start by matching the tool to your actual use case, not the plan name.`,
  ];
  const intro = deterministicPick(introVariants, t.slug, 1)[0]!;

  const publishedIso = new Date(`${YEAR}-02-06T00:00:00.000Z`).toISOString();
  const faqItems = [
    {
      q: `What is the best ${t.name} cheaper alternative?`,
      a: `For most ecommerce teams, Ecom Efficiency is the simplest way to reduce cost while keeping a full stack available. Then, compare focused tools based on your exact workflow.`,
    },
    {
      q: `Can I buy ${t.name} cheaper without switching tools?`,
      a: `Yes. You can reduce seats, downgrade to the minimum viable plan, and fill gaps with a focused tool instead of upgrading.`,
    },
    {
      q: `Is a cheaper alternative less accurate than ${t.name}?`,
      a: `Not necessarily. Accuracy depends on scope and data quality. Purpose-built tools can be more accurate for a narrower use case.`,
    },
    {
      q: `When should I keep ${t.name}?`,
      a: `Keep it if you rely on very specific workflows that alternatives don’t cover, or if the cost is not a constraint for your team.`,
    },
    {
      q: `Is switching tools risky?`,
      a: `Not if you run a short parallel test. Compare outputs with real tasks for 7 days before deciding.`,
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle(t.name).replace(" | Ecom Efficiency", ""),
    description: metaDescription(t.name),
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/cheaper-alternative/${tool}` },
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
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Cheaper alternatives</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~5 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.name} <span className="gradient-text">Cheaper Alternative</span>: The Best Way to Buy {t.name} for Less
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This page targets searches like <strong>{t.name} cheaper alternative</strong> and <strong>buy {t.name} cheaper</strong>, with a practical,
            tool-by-tool approach.
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
            <SectionTitle id="intro">{t.name} cheaper alternative (and how to buy {t.name} cheaper)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">{intro}</p>
            <p className="text-gray-300 leading-relaxed mb-6">
              Quick context: <strong>{t.name}</strong> is {t.shortDescription.toLowerCase().replace(/\.$/, "")}. If you want an overview first, see{" "}
              <Link className="text-purple-400 hover:text-purple-300 underline" href={t.pageHref} title={`${t.name} overview`}>
                {t.name} here
              </Link>
              .
            </p>

            <SectionTitle id="why-expensive">Why {t.name} is expensive for most teams</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              {t.name} can be great, but pricing often becomes a bottleneck as soon as your stack grows. The problem is rarely “price” alone — it’s how cost
              scales vs actual usage.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Common cost drivers</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Pricing tied to seats instead of usage</li>
                <li>Feature bundles you can’t unbundle</li>
                <li>Steep jumps between plans</li>
                <li>Limits that force early upgrades</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">Result: small teams end up paying enterprise pricing for mid-level workflows.</p>
            </div>

            <SectionTitle id="ranked">Best cheaper alternative to {t.name} (ranked)</SectionTitle>
            <SubTitle id="ecomefficiency">1. Ecom Efficiency — best overall cheaper alternative to {t.name}</SubTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-gray-300 leading-relaxed mb-4">
                Ecom Efficiency is designed for operators who want outcomes, not bloated dashboards. It’s a structured way to access a full stack (SEO, spy,
                AI, execution tools) while reducing monthly SaaS bills.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Best for</div>
                  <div className="text-gray-300 mt-1 text-sm">Ecommerce teams, lean marketing teams (1–5), founders.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">When to choose it</div>
                  <div className="text-gray-300 mt-1 text-sm">You want {t.name}-level decision-making power for less.</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={t.pageHref}
                  title={`Explore how Ecom Efficiency replaces ${t.name}`}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  Explore how Ecom Efficiency replaces {t.name}
                </Link>
                <Link
                  href="/pricing"
                  title="See Ecom Efficiency pricing"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold border border-white/10 bg-black/30 text-white hover:bg-black/40 transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>

            {related[0] ? (
              <>
                <SubTitle id="alt-1">2. {related[0].name}</SubTitle>
                <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
                  <p className="text-gray-300 leading-relaxed mb-4">{related[0].description}</p>
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={related[0].href} title={related[0].name}>
                    See {related[0].name}
                  </Link>
                </div>
              </>
            ) : null}

            {related[1] ? (
              <>
                <SubTitle id="alt-2">3. {related[1].name}</SubTitle>
                <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
                  <p className="text-gray-300 leading-relaxed mb-4">{related[1].description}</p>
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={related[1].href} title={related[1].name}>
                    See {related[1].name}
                  </Link>
                </div>
              </>
            ) : null}

            <SectionTitle id="buy-cheaper">How to buy {t.name} cheaper (if you still want it)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If switching isn’t an option, you can often reduce {t.name} cost responsibly by changing how you pay and who actually needs access.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Step-by-step mini plan</div>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Audit which features are used weekly (not “nice to have”).</li>
                <li>Reduce seats to core operators.</li>
                <li>Downgrade to the minimum viable plan.</li>
                <li>Complement with one focused tool instead of upgrading.</li>
              </ol>
              <p className="text-gray-300 leading-relaxed mt-4">This hybrid approach often cuts cost by 30–60% without losing performance.</p>
            </div>

            <SectionTitle id="mistakes">Common mistakes when looking for a cheaper alternative</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Choosing the cheapest tool instead of the right one for your workflow</li>
                <li>Replacing {t.name} with multiple fragmented tools (cost + complexity)</li>
                <li>Ignoring data freshness/accuracy and then blaming “the tool”</li>
                <li>Over-optimizing for price and under-optimizing for outcomes</li>
              </ul>
            </div>

            <SectionTitle id="plan">7-day action plan to replace or downgrade {t.name}</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="space-y-2 text-gray-300">
                <li>
                  <strong>Day 1–2:</strong> map current usage (who uses what, and why).
                </li>
                <li>
                  <strong>Day 3:</strong> identify unused features and real bottlenecks.
                </li>
                <li>
                  <strong>Day 4:</strong> shortlist 2 alternatives (keep it focused).
                </li>
                <li>
                  <strong>Day 5:</strong> test with real workflows (not demo checklists).
                </li>
                <li>
                  <strong>Day 6:</strong> compare outputs (decisions) — not features.
                </li>
                <li>
                  <strong>Day 7:</strong> decide: downgrade, replace, or hybrid.
                </li>
              </ul>
            </div>

            {related.length ? (
              <>
                <SubTitle id="related-tools">Related tools (same intent)</SubTitle>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {related.map((a) => (
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
              </>
            ) : null}

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
              If you’re searching for a cheaper alternative to {t.name}, the goal is simple: reduce cost without breaking your execution. Most teams win by
              paying only for what drives decisions.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">
              If you want the most efficient path to buy {t.name} cheaper while keeping a full ecommerce stack available, start with{" "}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline" title="Ecom Efficiency pricing">
                Ecom Efficiency
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

