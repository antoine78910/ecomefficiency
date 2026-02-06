import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";
import { toolsCatalog, type ToolCatalogItem, resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";
import { getFreeTrialInfo } from "@/data/freeTrialStatus";

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
    return {
      slug: t.slug,
      name: cleanToolName(t.name),
      shortDescription: t.shortDescription,
      category: t.category,
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
    pageHref,
  };
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

function relatedTools(tool: ToolEntity): Array<{ slug: string; name: string; href: string; description: string }> {
  const baseCat = tool.category || "Other";

  const preferredByCategory: Record<string, string[]> = {
    // Spy / product research: link to other research/execution tools.
    "Ads & Spy": ["kalodata", "winninghunter", "shophunter", "foreplay", "atria"],
    "Product Research": ["winninghunter", "shophunter", "pipiads", "kalodata"],
    // AI/video: link to creative stack tools.
    "AI (Image/Video)": ["higgsfield", "vmake", "heygen", "freepik"],
    Video: ["sendshort", "vmake", "capcut", "heygen"],
    Creative: ["canva", "freepik", "flair-ai", "fotor"],
    "Stock Assets": ["freepik", "envato-elements", "flaticon", "iconscout"],
    // SEO: classic alternatives / complements.
    SEO: ["ahrefs", "ubersuggest", "mangools", "keyword-tool", "alsoasked"],
    // Writing/productivity
    "AI Writing": ["quillbot", "quetext", "smodin"],
    "AI (LLM)": ["chatgpt"],
    Productivity: ["turboscribe", "brain-fm"],
    "Email & Outreach": ["hunter"],
    Other: ["academun"],
  };

  const picked = (preferredByCategory[baseCat] || preferredByCategory.Other!).filter((s) => s !== tool.slug);
  const resolved = picked
    .map((s) => toolsCatalog.find((t) => t.slug === s))
    .filter(Boolean) as ToolCatalogItem[];

  const fallbackPool = toolsCatalog.filter((t) => t.slug !== tool.slug && (tool.category ? t.category === tool.category : true));
  const extra = deterministicPick(fallbackPool, tool.slug, 4).filter((t) => !resolved.some((r) => r.slug === t.slug));

  const final = [...resolved, ...extra].slice(0, 4);
  return final.map((t) => ({
    slug: t.slug,
    name: cleanToolName(t.name),
    href: `/tools/${t.slug}`,
    description: t.shortDescription,
  }));
}

function trialShortAnswer(status: ReturnType<typeof getFreeTrialInfo>["status"]) {
  if (status === "real") return "YES";
  if (status === "none") return "NO";
  if (status === "limited") return "LIMITED";
  return "VARIES";
}

function metaTitle(toolName: string): string {
  return `${toolName} free trial: how to test before paying`;
}

function metaDescription(toolName: string): string {
  // Aim 150–160 chars (best effort).
  let s = `Looking for a ${toolName} free trial? See if an official trial exists and how to test ${toolName} properly before paying.`;
  if (s.length > 160) s = `Looking for a ${toolName} free trial? See if an official trial exists and how to test properly before paying.`;
  while (s.length < 150) s += " For ecommerce teams.";
  if (s.length > 160) s = s.slice(0, 160).trimEnd();
  return s;
}

function buildToc(toolName: string): TocItem[] {
  return [
    { id: "intro", label: `${toolName} free trial (how to test before paying)`, level: 2 },
    { id: "method-1", label: `Method 1: test ${toolName} with Ecom Efficiency (3-day free trial)`, level: 2 },
    { id: "official", label: `Does ${toolName} offer an official free trial?`, level: 2 },
    { id: "test-plan", label: `How to properly test ${toolName} during a free trial`, level: 2 },
    { id: "mistakes", label: `Common mistakes when testing a ${toolName} free trial`, level: 2 },
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

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = getToolEntity(tool);
  if (!t) return {};

  const title = metaTitle(t.name);
  const description = metaDescription(t.name);
  const canonical = `/free-trial/${tool}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: title.replace(" | Ecom Efficiency", ""),
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: `${t.name} free trial` }],
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

export default async function FreeTrialToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getToolEntity(tool);
  if (!t) notFound();

  const trial = getFreeTrialInfo(t.slug);
  const related = relatedTools(t);
  const toc = buildToc(t.name);

  const introVariants = [
    `Searching for a ${t.name} free trial means you want to test the tool in real conditions before committing — without shortcuts that could hurt credibility or data quality.`,
    `A ${t.name} free trial is only valuable if it lets you test real workflows, not marketing demos. This page explains the fastest way to evaluate ${t.name} before paying.`,
    `If you want to test ${t.name} before paying, you need a simple plan: one use case, one output, one decision. Here’s how to do it safely.`,
    `Some tools offer an official ${t.name} free trial. Others don’t. Either way, you can still evaluate ${t.name} properly and decide if it’s worth paying for.`,
  ];
  const intro = deterministicPick(introVariants, t.slug, 1)[0]!;

  const publishedIso = new Date(`${YEAR}-02-06T00:00:00.000Z`).toISOString();
  const faqItems = [
    {
      q: `Does ${t.name} have a free trial?`,
      a: `${trialShortAnswer(trial.status)} — ${trial.summary}`,
    },
    {
      q: `Is the official ${t.name} free trial enough to decide?`,
      a: "Only if it lets you run a real workflow (export, limits, history, and volume) instead of a restricted demo.",
    },
    {
      q: `Can I test ${t.name} without paying upfront?`,
      a: `Yes. You can use an official free trial when it exists, or test ${t.name} through Ecom Efficiency’s 3-day free trial to compare outputs with pro features.`,
    },
    {
      q: `How long should I test ${t.name}?`,
      a: "3 to 7 days is usually enough if you focus on one real use case and finish the full test.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle(t.name).replace(" | Ecom Efficiency", ""),
    description: metaDescription(t.name),
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com/free-trial/${tool}` },
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
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Free trial</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~4 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t.name} <span className="gradient-text">Free Trial</span>: How to Test {t.name} Before Paying
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            If you’re searching for a <strong>{t.name} free trial</strong>, this page helps you test {t.name} properly before paying.
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
            <SectionTitle id="intro">{t.name} free trial: how to test before paying</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">{intro}</p>

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
                  <strong>Official free trial status</strong>: {trialShortAnswer(trial.status)} — {trial.summary}
                </li>
                <li>
                  <strong>Tool page</strong>:{" "}
                  <Link className="text-purple-400 hover:text-purple-300 underline" href={t.pageHref} title={`${t.name} overview`}>
                    {t.name} overview
                  </Link>
                </li>
              </ul>
            </div>

            <SectionTitle id="method-1">Method 1: Test {t.name} with Ecom Efficiency (3-Day Free Trial)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Ecom Efficiency gives access to {t.name} inside a groupbuy, alongside 50+ ecommerce, AI, SEO, and spy tools, all in one environment. This is the
              fastest way to test {t.name} for free with pro features so you know if it’s worth paying for it.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">What you can test during the 3 days</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Access to {t.name}</li>
                <li>Access to 50+ related tools used in the same workflows</li>
                <li>Real usage (outputs), not a demo</li>
                <li>No long-term commitment required</li>
              </ul>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.slice(0, 3).map((a) => (
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
              <div className="mt-4">
                <Link
                  href="/pricing"
                  title="Start Ecom Efficiency free trial"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:bg-gray-100 transition-colors"
                >
                  Start your 3-day free trial
                </Link>
              </div>
            </div>

            <SectionTitle id="official">Does {t.name} offer an official free trial?</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Short answer: <strong>{trialShortAnswer(trial.status)}</strong>
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Official {t.name} free trial details</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Trial availability</strong>: {trialShortAnswer(trial.status)}
                </li>
                {trial.duration ? (
                  <li>
                    <strong>Trial duration</strong>: {trial.duration}
                  </li>
                ) : null}
                {trial.creditCardRequired ? (
                  <li>
                    <strong>Credit card required</strong>: {trial.creditCardRequired.toUpperCase()}
                  </li>
                ) : null}
                {trial.accessLevel ? (
                  <li>
                    <strong>Access level</strong>: {trial.accessLevel.toUpperCase()}
                  </li>
                ) : null}
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Note: many “free trials” are restricted demos and don’t reflect real usage. Always test exports, limits, and history.
              </p>
            </div>

            <SectionTitle id="test-plan">How to properly test {t.name} during a free trial</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">To get real value from a {t.name} free trial, focus on execution.</p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Simple testing plan</div>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Define one real use case (one workflow you would pay for).</li>
                <li>Run the same task you’d run after subscribing.</li>
                <li>Measure time-to-result and quality of output.</li>
                <li>Check export limits, history, and volume caps.</li>
                <li>Decide based on usefulness, not feature lists.</li>
              </ol>
            </div>

            <SectionTitle id="mistakes">Common mistakes when testing a {t.name} free trial</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Testing too many features at once (no clear decision)</li>
                <li>Confusing “free credits” with real access</li>
                <li>Ignoring hidden limits (exports, history, volume)</li>
                <li>Making a decision without finishing the test</li>
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
              A {t.name} free trial is useful only if it lets you test real usage, real outputs, and real limits. If the official trial is missing or too
              restricted, testing {t.name} through Ecom Efficiency is a simple way to make a decision before paying.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">
              The goal isn’t to cut corners — it’s to make an informed decision before paying. If you want to test {t.name} for free with pro features, start
              with{" "}
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

