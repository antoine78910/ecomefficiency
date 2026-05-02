import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";
import { CANONICAL_ORIGIN } from "@/lib/canonicalOrigin";

const YEAR = 2026;
const PATH = "/alternatives/spycrew";
const PUBLISHED_ISO = `${YEAR}-05-02T00:00:00.000Z`;

/** Public SpyCrew tiers (spycrew.ai—verify before publishing comparisons). */
const SPYCREW_BASIC_REF = 34;
const SPYCREW_PRO_REF = 59;

export const metadata: Metadata = {
  title: `SpyCrew alternative (${YEAR}): honest comparison vs Ecom Efficiency`,
  description:
    "Looking for a SpyCrew alternative? Compare SpyCrew vs Ecom Efficiency on price, spy tools, SEO, AI (SpyCrew AI vs Claude & ChatGPT), and monthly Discord voting—honest side-by-side.",
  alternates: { canonical: PATH },
  openGraph: {
    title: `SpyCrew alternative (${YEAR}): honest comparison vs Ecom Efficiency`,
    description:
      "SpyCrew review angle: spycrew browser access, SpyCrew AI bundle positioning, and how Ecom Efficiency compares for ecommerce operators.",
    url: PATH,
    type: "article",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency" }],
  },
};

const faqItems: Array<{ q: string; a: string }> = [
  {
    q: "What is the best SpyCrew alternative for ecommerce?",
    a: "If you want spy tools plus SEO, curated AI (Claude and ChatGPT on Pro), monthly community voting on new tools, and a lower monthly price than SpyCrew’s typical Pro tier—Ecom Efficiency is built for that stack. If spy tools alone matter most and you don’t need SEO or serious AI, SpyCrew’s Basic plan can still be worth evaluating. Always verify current SpyCrew pricing and inclusions on their official site.",
  },
  {
    q: "What is SpyCrew AI?",
    a: "SpyCrew AI usually refers to bundled access to many AI apps marketed under one subscription—not a single proprietary model. Quality and fit vary by app. Ecom Efficiency focuses on high-impact LLM access on Pro (e.g. Claude and ChatGPT) alongside ecommerce execution tools; see /tools for the live catalog.",
  },
  {
    q: "What is the SpyCrew browser / SpyCrew browser extension?",
    a: "SpyCrew commonly promotes browser-based auto-login software so members spend less time managing passwords across tools—similar in intent to other bundled-access products. Compare reliability, support, and which tools are actually included for the tier you’re buying.",
  },
  {
    q: "How does pricing compare: SpyCrew vs Ecom Efficiency?",
    a: `SpyCrew’s public site has listed Basic around $${SPYCREW_BASIC_REF}/month and Pro around $${SPYCREW_PRO_REF}/month (confirm live pricing). Ecom Efficiency Pro is $29.99/month on /pricing. Against a $${SPYCREW_PRO_REF}/month reference, that’s about $${(SPYCREW_PRO_REF - 29.99).toFixed(2)}/month less—roughly $${Math.round((SPYCREW_PRO_REF - 29.99) * 12)}/year if those prices hold for your billing cycle.`,
  },
  {
    q: "Is there an honest SpyCrew review takeaway?",
    a: "SpyCrew is often positioned for operators who want heavy emphasis on spy tools and frictionless login—especially on Basic when budget allows. Tradeoffs vs Ecom Efficiency are usually breadth (SEO + AI + community roadmap) and monthly cost on higher tiers, not “good vs bad.” Pick based on your workflow.",
  },
  {
    q: "Where can I see Ecom Efficiency SEO tools and free calculators?",
    a: "Browse /tools—SEO suites include names like Ahrefs, Semrush, Ubersuggest, and Mangools depending on your plan and catalog updates. Free tools: ROAS calculator, LTV calculator, and Shopify theme detector on /freetools.",
  },
];

const toc: TocItem[] = [
  { id: "what-is-spycrew", label: "What is SpyCrew?", level: 2 },
  { id: "what-is-ecomefficiency", label: "What is Ecom Efficiency?", level: 2 },
  { id: "side-by-side", label: "Side-by-side comparison", level: 2 },
  { id: "where-spycrew-wins", label: "Where SpyCrew wins", level: 2 },
  { id: "where-ecomefficiency-wins", label: "Where Ecom Efficiency wins", level: 2 },
  { id: "who-should-choose", label: "Who should choose what?", level: 2 },
  { id: "verdict", label: "Final verdict", level: 2 },
  { id: "faq", label: "FAQ", level: 2 },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl md:text-3xl font-bold text-white mt-12 mb-4 scroll-mt-28">
      {children}
    </h2>
  );
}

export default function SpyCrewAlternativePage() {
  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `SpyCrew alternative (${YEAR}): honest comparison vs Ecom Efficiency`,
    description:
      "Comparison of SpyCrew (spycrew browser, SpyCrew AI) with Ecom Efficiency for ecommerce operators.",
    datePublished: PUBLISHED_ISO,
    dateModified: PUBLISHED_ISO,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${CANONICAL_ORIGIN}${PATH}` },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: `${CANONICAL_ORIGIN}/ecomefficiency.png` },
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

  const yearlySavingsVsPro = Math.round((SPYCREW_PRO_REF - 29.99) * 12);

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

        <nav className="text-sm text-gray-400 mb-8 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/alternatives" className="hover:text-white" title="All alternatives">
            Alternatives
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300">SpyCrew</span>
        </nav>

        <header className="max-w-3xl mx-auto mb-10 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              SpyCrew alternative
            </span>
            <span className="text-xs text-gray-500">Updated: {new Date(PUBLISHED_ISO).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">~10 min read</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SpyCrew alternative: <span className="gradient-text">honest comparison</span> vs Ecom Efficiency
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Searching <strong>spycrew</strong>, <strong>SpyCrew AI</strong>, or <strong>SpyCrew browser</strong>? This page is a
            reader-first <strong>SpyCrew vs Ecom Efficiency</strong> breakdown—pricing, spy tools, SEO, AI, and community model—so you
            can decide without noise. We credit SpyCrew where it wins; we’re explicit about where Ecom Efficiency is built differently.
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
        <div className="prose prose-invert prose-lg max-w-none">
          <SectionTitle id="what-is-spycrew">What is SpyCrew?</SectionTitle>
          <p className="text-gray-300 leading-relaxed">
            <strong>SpyCrew</strong> is a subscription bundle aimed at ecommerce operators, with strong positioning around{" "}
            <strong>spy tools</strong> and a <strong>browser-based auto-login</strong> experience (often what people mean by{" "}
            <strong>SpyCrew browser</strong>). Public marketing frequently highlights a large pack of spy tools on the entry tier, bundled{" "}
            <strong>SpyCrew AI</strong> access (many apps under one roof), and Shopify theme resources. Exact counts and tiers change—always
            confirm on SpyCrew’s official pricing page before you buy.
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            On <span className="text-gray-200">spycrew.ai</span> (verify live numbers), SpyCrew has commonly advertised{" "}
            <strong>Basic around ${SPYCREW_BASIC_REF}/month</strong> and <strong>Pro around ${SPYCREW_PRO_REF}/month</strong>, with Pro adding extras
            such as additional software and features marketed to advanced users. Third-party marketplaces may show different prices—treat those as
            separate offers.
          </p>

          <SectionTitle id="what-is-ecomefficiency">What is Ecom Efficiency?</SectionTitle>
          <p className="text-gray-300 leading-relaxed">
            <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline">
              Ecom Efficiency
            </Link>{" "}
            bundles <Link href="/tools" className="text-purple-400 hover:text-purple-300 underline">50+ tools</Link> curated for ecommerce and
            dropshipping: spy and research, SEO, creative, and AI—with{" "}
            <strong>Pro at $29.99/month</strong> (Starter is lower). Members vote monthly on Discord for which new tool ships next, so the catalog
            reflects real seller demand—not only an internal roadmap.
          </p>

          <SectionTitle id="side-by-side">SpyCrew vs Ecom Efficiency: side-by-side</SectionTitle>
          <p className="text-gray-300 leading-relaxed mb-6">
            Figures below use SpyCrew’s commonly cited public tiers (${SPYCREW_BASIC_REF} / ${SPYCREW_PRO_REF})—replace with your live quote if
            different.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-white/10 not-prose mb-8">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-gray-900/80">
                  <th className="p-4 font-semibold text-white">Topic</th>
                  <th className="p-4 font-semibold text-gray-200">SpyCrew (typical positioning)</th>
                  <th className="p-4 font-semibold text-purple-200">Ecom Efficiency</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">Monthly price (reference)</td>
                  <td className="p-4">
                    Basic ~${SPYCREW_BASIC_REF}/mo · Pro ~${SPYCREW_PRO_REF}/mo (verify on SpyCrew)
                  </td>
                  <td className="p-4">
                    Pro <strong>$29.99/mo</strong> —{" "}
                    <Link href="/pricing" className="text-purple-400 underline">
                      /pricing
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">Spy tools emphasis</td>
                  <td className="p-4">Core product story—many spy tools on Basic</td>
                  <td className="p-4">Strong spy/research line-up (e.g. Pipiads, Kalodata, WinningHunter—see /tools)</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">SEO stack</td>
                  <td className="p-4">Not the main positioning vs spy</td>
                  <td className="p-4">
                    Dedicated SEO tools (e.g. Ahrefs, Semrush—see{" "}
                    <Link href="/tools" className="text-purple-400 underline">
                      /tools
                    </Link>
                    )
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">AI</td>
                  <td className="p-4">
                    <strong>SpyCrew AI</strong>: broad bundled SaaS AI access (volume-focused messaging)
                  </td>
                  <td className="p-4">
                    Pro includes{" "}
                    <Link href="/tools/claude" className="text-purple-400 underline">
                      Claude
                    </Link>
                    ,{" "}
                    <Link href="/tools/chatgpt" className="text-purple-400 underline">
                      ChatGPT
                    </Link>
                    , plus execution tools—not just “more apps”
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">Roadmap control</td>
                  <td className="p-4">Internal product roadmap</td>
                  <td className="p-4">Monthly Discord vote for the next tool</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 font-medium text-white">Login UX</td>
                  <td className="p-4">Auto-login / browser workflow is a highlight</td>
                  <td className="p-4">Extension-supported workflows across the catalog (see member onboarding)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionTitle id="where-spycrew-wins">Where SpyCrew wins</SectionTitle>
          <p className="text-gray-300 leading-relaxed mb-4">To be fair, SpyCrew has genuine strengths many buyers care about:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>
              <strong>Spy-first focus:</strong> Marketing often leads with a deep set of spy tools on the entry tier—solid when product research is your
              top priority.
            </li>
            <li>
              <strong>SpyCrew browser / auto-login:</strong> Reducing password friction across tools is real UX value when you live inside dashboards all
              day.
            </li>
            <li>
              <strong>Pro tier extras:</strong> SpyCrew markets additional capabilities on Pro (e.g. mobile-oriented features and custom software—verify
              names and limits on their site). If you use those, Pro can justify itself on workflow alone.
            </li>
            <li>
              <strong>Shopify themes:</strong> Bundled theme access is a practical perk for store builders—confirm how many and licensing terms on SpyCrew’s
              current offer.
            </li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            If <strong>spy tools are your absolute #1 priority</strong> and SEO or advanced AI matter less, SpyCrew’s Basic tier is worth a serious look—
            <em>assuming</em> the current tool list matches your workflow.
          </p>

          <SectionTitle id="where-ecomefficiency-wins">Where Ecom Efficiency wins</SectionTitle>
          <ol className="list-decimal list-inside text-gray-300 space-y-3">
            <li>
              <strong>Lower monthly cost vs typical Pro anchoring:</strong> Pro is <strong>$29.99/month</strong>. Against a SpyCrew Pro reference of
              ~${SPYCREW_PRO_REF}/month, that’s about <strong>${(SPYCREW_PRO_REF - 29.99).toFixed(2)}/month</strong> less—on the order of{" "}
              <strong>${yearlySavingsVsPro}/year</strong> if you compare those tiers year-round (confirm SpyCrew’s actual invoice).
            </li>
            <li>
              <strong>Vote every month for a new tool:</strong> The community decides what gets integrated next via Discord. SpyCrew’s roadmap is internal—
              you don’t vote on the catalog.
            </li>
            <li>
              <strong>Real SEO tools:</strong> SpyCrew leans heavily into spy; Ecom Efficiency is built to cover <strong>product research and store/SEO</strong>{" "}
              optimization in one membership—see the SEO category on{" "}
              <Link href="/tools" className="text-purple-400 hover:text-purple-300 underline">
                /tools
              </Link>
              .
            </li>
            <li>
              <strong>AI that matches ecommerce workflows:</strong> Bundled “dozens of AI apps” can mean uneven quality. On Pro, Ecom Efficiency includes{" "}
              <Link href="/tools/claude" className="text-purple-400 underline">
                Claude
              </Link>{" "}
              and{" "}
              <Link href="/tools/chatgpt" className="text-purple-400 underline">
                ChatGPT
              </Link>{" "}
              alongside execution tools—prioritized for operators, not just a long vendor list.
            </li>
            <li>
              <strong>Community depth:</strong> Active Discord, curated learning resources, free calculators (ROAS, LTV, theme detector on{" "}
              <Link href="/freetools" className="text-purple-400 hover:text-purple-300 underline">
                /freetools
              </Link>
              ), plus member perks like free Shopify theme resources—centered on ecommerce discussion, not only a chat bolted to a dashboard.
            </li>
          </ol>

          <SectionTitle id="who-should-choose">Who should choose what?</SectionTitle>
          <p className="text-gray-300 leading-relaxed font-medium text-white">Choose SpyCrew if:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
            <li>Spy tools are your absolute top priority and you want as many as possible under one brand.</li>
            <li>You’re on Pro and you extract real value from SpyCrew’s Pro-only software and advanced features.</li>
            <li>You don’t need a dedicated SEO stack or premium LLM access in the same subscription.</li>
          </ul>
          <p className="text-gray-300 leading-relaxed font-medium text-white mt-6">Choose Ecom Efficiency if:</p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
            <li>You want spy tools, SEO tools, and AI tools under one roof for ecommerce.</li>
            <li>You want to pay less than typical SpyCrew Pro pricing while keeping a broad, curated stack.</li>
            <li>You want the platform shaped monthly by seller votes—not only an internal roadmap.</li>
            <li>You want Claude and ChatGPT on Pro alongside the rest of the catalog.</li>
          </ul>

          <SectionTitle id="verdict">Final verdict</SectionTitle>
          <p className="text-gray-300 leading-relaxed">
            <strong>SpyCrew</strong> isn’t a bad product—if spy tools are your core need, Basic can cover that focus well, and the{" "}
            <strong>SpyCrew browser</strong> / login story is a legitimate convenience. Higher tiers can get expensive relative to a narrower positioning when
            you also need SEO and top-tier AI elsewhere.
          </p>
          <p className="text-gray-300 leading-relaxed mt-4">
            <strong>Ecom Efficiency</strong> covers more ground for all-around ecommerce operators at <strong>$29.99/month Pro</strong>, adds monthly
            community input, and pairs spy/research with SEO and AI in one membership. For most ecommerce entrepreneurs balancing ads, store, and content, that’s
            often the smarter spend—but run your own checklist against SpyCrew’s live tool list and price.
          </p>
        </div>

        <section id="faq" className="mt-16 border-t border-white/10 pt-10 scroll-mt-28">
          <h2 className="text-2xl font-bold text-white mb-6">FAQ</h2>
          <div className="space-y-6">
            {faqItems.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-white mb-2">{f.q}</h3>
                <p className="text-gray-300 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Related:{" "}
            <Link href="/alternatives" className="text-gray-400 hover:text-white underline">
              All alternatives
            </Link>
            {" · "}
            <Link href="/alternatives/toolsuite" className="text-gray-400 hover:text-white underline">
              ToolSuite comparison
            </Link>
            {" · "}
            <Link href="/tools" className="text-gray-400 hover:text-white underline">
              Tool catalog
            </Link>
            {" · "}
            <Link href="/pricing" className="text-gray-400 hover:text-white underline">
              Pricing
            </Link>
          </p>
        </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
