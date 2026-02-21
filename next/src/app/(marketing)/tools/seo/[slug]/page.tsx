import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc from "@/components/ToolToc";
import type { TocItem } from "@/components/ToolToc";
import { seoToolsCatalog, type SeoTool } from "@/data/seoToolsCatalog";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

const seoToolToc: TocItem[] = [
  { id: "definition", label: "What is this tool?" },
  { id: "use-cases", label: "What it’s for (practical)" },
  { id: "features", label: "Key features" },
  { id: "method", label: "Fast method (SEO win)" },
  { id: "pricing", label: "Pricing & bundles" },
  { id: "limits", label: "Limits & common mistakes" },
  { id: "alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

function getSeoTool(slug: string): SeoTool | null {
  return seoToolsCatalog.find((t) => t.slug === slug) || null;
}

export async function generateStaticParams() {
  return seoToolsCatalog.map((t) => ({ slug: t.slug }));
}

function buildFaq(tool: SeoTool) {
  return [
    {
      q: `What is ${tool.name}?`,
      a: `${tool.name} is ${tool.shortDescription.replace(/\s+$/, "")}`,
    },
    {
      q: `How much does ${tool.name} cost?`,
      a: tool.pricing,
    },
    {
      q: `Is ${tool.name} included in Ecom Efficiency?`,
      a: `Yes — ${tool.name} is part of the +30 SEO tools included in Ecom Efficiency.`,
    },
    {
      q: `Is ${tool.name} beginner-friendly?`,
      a: "Yes for most workflows—start with one core use case (audit, keywords, or content planning), then expand as you learn the UI.",
    },
    {
      q: `What’s the fastest way to get value from ${tool.name}?`,
      a: "Pick one page/site to improve, run an audit or keyword scan, fix the top issues, and measure ranking/traffic changes before scaling the process.",
    },
    {
      q: `What are common mistakes with ${tool.name}?`,
      a: "Over-optimizing without search intent, chasing vanity metrics, and not prioritizing the highest-impact fixes first (technical + content).",
    },
  ] as const;
}

function titleCaseQuery(s: string) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function buildQueries(tool: SeoTool): string[] {
  if (tool.keywords?.length) return tool.keywords.slice(0, 6).map(titleCaseQuery);
  return [
    `${tool.name} review`,
    `${tool.name} pricing`,
    `${tool.name} alternatives`,
    `how to use ${tool.name}`,
  ];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ALT_MAP: Record<string, string[]> = {
  semrush: ["ahrefs", "sistrix", "screaming-frog", "mangools", "serpstat", "spyfu"],
  ahrefs: ["semrush", "majestic", "screaming-frog", "serpstat", "spyfu", "sistrix"],
  "screaming-frog": ["se-ranking", "seoptimer", "semrush", "ahrefs", "serpstat", "majestic"],
  ubersuggest: ["semrush", "ahrefs", "mangools", "serpstat", "se-ranking", "keywordtool"],
  answerthepublic: ["alsoasked", "keywordtool", "semrush", "ubersuggest", "wincher", "serpstat"],
  alsoasked: ["answerthepublic", "keywordtool", "semrush", "ubersuggest", "yourtextguru", "serpstat"],
  freepik: ["iconscout", "flaticon", "123rf", "envato-elements", "storyblocks"],
  iconscout: ["freepik", "flaticon", "123rf", "envato-elements", "storyblocks"],
  flaticon: ["freepik", "iconscout", "123rf", "envato-elements"],
};

function pickAlternatives(tool: SeoTool, count = 6): SeoTool[] {
  const preferred = ALT_MAP[tool.slug] || [];
  const out: SeoTool[] = [];
  for (const slug of preferred) {
    if (slug === tool.slug) continue;
    const t = getSeoTool(slug);
    if (t && !out.some((x) => x.slug === t.slug)) out.push(t);
    if (out.length >= count) return out;
  }
  for (const t of seoToolsCatalog) {
    if (t.slug === tool.slug) continue;
    if (!out.some((x) => x.slug === t.slug)) out.push(t);
    if (out.length >= count) break;
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getSeoTool(slug);
  if (!tool) return { title: "SEO tool not found | Ecom Efficiency", robots: { index: false, follow: false } };

  const title = `${tool.name}: SEO tool review, pricing & best workflows | Ecom Efficiency`;
  const description = `${tool.name}: ${tool.shortDescription} Learn core features, practical workflows, pricing, and alternatives.`;

  return {
    title,
    description,
    alternates: { canonical: `/tools/seo/${tool.slug}` },
    openGraph: {
      type: "article",
      url: `/tools/seo/${tool.slug}`,
      title,
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: tool.name }],
    },
  };
}

export default async function SeoToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getSeoTool(slug);
  if (!tool) notFound();

  const faq = buildFaq(tool);
  const queries = buildQueries(tool);
  const featureCols = chunk(tool.keyFeatures, Math.ceil(tool.keyFeatures.length / 2));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.shortDescription,
    applicationCategory: "SEO Tool",
    operatingSystem: "Web",
    url: `https://ecomefficiency.com/tools/seo/${tool.slug}`,
    creator: { "@type": "Organization", name: "Ecom Efficiency" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const alternatives = pickAlternatives(tool, 6);

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="mb-8">
          <Link href="/tools/seo" className="text-sm text-gray-400 hover:text-white" title="Back to SEO tools">
            ← Back to SEO tools
          </Link>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold text-white">{tool.name}</h1>
          <p className="mt-4 text-lg text-gray-300">
            <strong>{tool.name}</strong> is a <strong>SEO tool</strong> to help you improve rankings with repeatable workflows (keywords, audits, content, links).
          </p>
          <div className="mt-4 text-sm text-gray-300/90">{tool.pricing}</div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-10">
          <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
            <div
              className="min-h-0 overflow-y-auto pr-1
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
            >
              <ToolToc items={seoToolToc} defaultActiveId={seoToolToc[0]?.id} collapseSubheadings />
            </div>
            <div className="mt-6 shrink-0">
              <EcomToolsCta compact />
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            <section id="definition" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">🔍 What is {tool.name}?</h2>
              <p className="text-gray-300">
                <strong>{tool.name}</strong> is {tool.shortDescription} The goal is to help you stop guessing and focus on changes that move rankings and clicks.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-white font-semibold">What you can do fast</div>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                    <li>Find keywords that match intent</li>
                    <li>Spot the biggest on-page/technical blockers</li>
                    <li>Build a simple checklist to improve pages</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-white font-semibold">Queries this page targets</div>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                    {queries.slice(0, 5).map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="use-cases" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">🎯 What is {tool.name} used for (practically)?</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Stop guessing</strong>: pick keywords based on intent + difficulty, not vibes.
                </li>
                <li>
                  <strong>Fix what blocks growth</strong>: identify technical/on-page issues that prevent pages from ranking.
                </li>
                <li>
                  <strong>Build better pages</strong>: structure content so Google understands the topic (and users stay).
                </li>
                <li>
                  <strong>Track progress</strong>: measure rankings, clicks, and indexation so you iterate fast.
                </li>
              </ul>
              <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
                <div className="text-white font-semibold">High-signal questions (use in briefs)</div>
                <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                  <li>What is the search intent (buy, compare, learn) and does the page match it?</li>
                  <li>What would make this page the “best answer” on the SERP?</li>
                  <li>Which internal links should point here to pass relevance?</li>
                </ul>
              </div>
            </section>

            <section id="features" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of {tool.name}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {(featureCols.length ? featureCols : [[]]).map((col, idx) => (
                  <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <h3 className="text-white font-semibold">{idx === 0 ? "Core features" : "Useful modules"}</h3>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                      {col.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
                <div className="text-white font-semibold">Vocabulary to cover (no keyword stuffing)</div>
                <p className="mt-2 text-gray-300">
                  search intent, keyword difficulty, SERP, title tag, H1/H2, internal linking, crawl, indexation, backlinks, topical coverage.
                </p>
              </div>
            </section>

            <section id="method" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: get your first SEO win with {tool.name}</h2>
              <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>
                    <strong>Pick one page</strong>: one product/category/article you want to rank.
                  </li>
                  <li>
                    <strong>Run a quick audit</strong>: list the top 5 issues/opportunities.
                  </li>
                  <li>
                    <strong>Fix the biggest blocker</strong>: indexation/technical first, then content match.
                  </li>
                  <li>
                    <strong>Improve structure</strong>: title + H2s + internal links to make the page obvious.
                  </li>
                  <li>
                    <strong>Measure</strong>: check clicks/rankings weekly and iterate the same checklist.
                  </li>
                </ol>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-white font-semibold">Quick checklist</div>
                <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
                  <li>Page is indexable</li>
                  <li>Intent matches query</li>
                  <li>Clear H1 + H2s</li>
                  <li>Internal links added</li>
                  <li>Title/CTR improved</li>
                  <li>Track results weekly</li>
                </ul>
              </div>
            </section>

            <section id="pricing" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">💰 {tool.name} pricing (and how to pay less)</h2>
              <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
                <p>
                  Standalone pricing depends on the plan. Here’s the quick reference: <strong>{tool.pricing}</strong>
                </p>
                <p className="mt-2">
                  In the <strong>Ecom Efficiency</strong> bundle, this tool is included inside the <strong>+30 SEO tools</strong> pack.
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

            <section id="limits" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h3 className="text-white font-semibold">Realistic limits</h3>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                    <li>Tools don’t replace search intent: content still needs to match what users want.</li>
                    <li>Rankings move slowly—measure in weeks, not hours.</li>
                    <li>One “score” isn’t the goal; traffic + clicks are.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h3 className="text-white font-semibold">Mistakes that waste time</h3>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                    <li>Chasing high-volume keywords without ability to rank.</li>
                    <li>Over-optimizing headings/keywords (reads like spam).</li>
                    <li>Ignoring internal links and indexation issues.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="alternatives" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">🔁 Alternatives to {tool.name} (depending on your needs)</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {alternatives.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/tools/seo/${r.slug}`}
                      className="text-purple-200 hover:text-white underline underline-offset-4"
                      title={`${r.name} SEO tool page`}
                    >
                      {r.name}
                    </Link>{" "}
                    : {r.shortDescription}
                  </li>
                ))}
              </ul>
            </section>

            <section id="faq" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
              <div className="space-y-3">
                {faq.map((item) => (
                  <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
                    <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
                    <p className="mt-2 text-gray-300">{item.a}</p>
                  </details>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
                <div className="text-white font-semibold">Verdict</div>
                <p className="mt-2 text-gray-300">
                  Use <strong>{tool.name}</strong> to build a repeatable SEO system: intent-first keywords, technical hygiene, internal linking, and iterative updates.
                </p>
                <p className="mt-3 text-gray-300">
                  To access it with the full bundle, you can{" "}
                  <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Try Ecom Efficiency now">
                    create an account
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

