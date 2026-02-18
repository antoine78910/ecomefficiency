import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import FacebookCommentsGenerator from "./FacebookCommentsGenerator";

const CANONICAL = "/freetools/facebook-comments-generator";

export const metadata: Metadata = {
  title: "Facebook Comments Generator (Free, Export PNG)",
  description:
    "Facebook comments generator to create realistic comment thread mockups for ecommerce creatives. Build a Facebook comment image generator preview, add replies & reactions, then export a high‑res PNG—100% free, no sign‑up.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Facebook Comments Generator (Free, Export PNG)",
    description:
      "Create authentic-looking Facebook comment thread mockups for ads and presentations. Add reactions, nested replies, and export a high‑quality PNG.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Facebook comments generator" }],
  },
};

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

export default function FacebookCommentsGeneratorPage() {
  const toc: TocItem[] = [
    { id: "generator", label: "Generator", level: 2 },
    { id: "features", label: "Key features", level: 2 },
    { id: "why", label: "Why ecommerce teams use it", level: 2 },
    { id: "export", label: "Export image (PNG)", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-18T00:00:00.000Z").toISOString();

  const faqItems = [
    {
      q: "What is a Facebook comments generator?",
      a: "A Facebook comments generator helps you build a comment thread preview (names, timestamps, reactions, and replies) so you can visualize how a post could look in a creative mockup.",
    },
    {
      q: "Can I add a new comment or reply?",
      a: "Yes. Add top-level comments, then add nested replies under any comment to create realistic Facebook-style threads.",
    },
    {
      q: "Can I upload custom profile pictures?",
      a: "Yes. You can upload an avatar for each profile, or keep the built‑in placeholders for fast iterations.",
    },
    {
      q: "How do I export a Facebook comment image?",
      a: "Click Export PNG. The tool generates a high‑resolution image you can drop into Meta ad mockups, pitch decks, or creative QA documents.",
    },
    {
      q: "Which reactions are supported?",
      a: "You can pick common reactions like Like, Love, Haha, Wow, Sad, and Angry (with a reaction count).",
    },
    {
      q: "Is this Facebook comment generator free?",
      a: "Yes—100% free and no account required.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Facebook Comments Generator",
    description: metadata.description,
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com${CANONICAL}` },
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

      <article className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

        <Link
          href="/freetools"
          title="Back to free tools"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <span className="text-sm">← Back to free tools</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">100% free</span>
            <span className="text-xs text-gray-500">No sign‑up required</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Facebook comments generator</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Create a <strong>Facebook comments generator</strong> thread for your ecommerce creatives: build realistic discussion scenarios, test objection
            handling, and export a <strong>facebook comment image generator</strong> PNG for Meta ad mockups, client approvals, and presentations.
            <span className="block mt-3 text-sm text-gray-400">
              Related searches: <strong>comment generator for facebook</strong> • <strong>facebook comments generator</strong>
            </span>
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
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

          <div className="min-w-0 max-w-none">
            <SectionTitle id="generator">Generator</SectionTitle>
            <FacebookCommentsGenerator />

            <SectionTitle id="features">Key features</SectionTitle>
            <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
              <ul className="grid gap-3 sm:grid-cols-2 text-gray-200">
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] text-purple-300">✓</span>
                  <div>
                    <div className="font-semibold text-white">Custom profiles & timestamps</div>
                    <div className="text-sm text-gray-300 leading-relaxed">Edit names, avatars, and time labels so your thread matches your creative concept.</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] text-purple-300">✓</span>
                  <div>
                    <div className="font-semibold text-white">Realistic reactions</div>
                    <div className="text-sm text-gray-300 leading-relaxed">Pick common reactions (Like/Love/Haha/Wow/Sad/Angry) and set reaction counts.</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] text-purple-300">✓</span>
                  <div>
                    <div className="font-semibold text-white">Nested replies</div>
                    <div className="text-sm text-gray-300 leading-relaxed">Add replies under any comment to simulate a real discussion flow.</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[3px] text-purple-300">✓</span>
                  <div>
                    <div className="font-semibold text-white">High‑res export</div>
                    <div className="text-sm text-gray-300 leading-relaxed">Export a clean PNG (feed + square ratios) ready for mockups and Meta ad layouts.</div>
                  </div>
                </li>
              </ul>
              <p className="text-xs text-gray-400 mt-4">
                This page targets <strong>facebook comments generator</strong>, <strong>comment generator for facebook</strong>, <strong>facebook comment image generator</strong>, and{" "}
                <strong>facebook comments generator</strong>.
              </p>
            </div>

            <SectionTitle id="why">Why ecommerce teams use it</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Creative QA & trust cues</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Prototype comment angles (shipping times, sizing, refunds, quality) and see how your creative looks with a believable thread layout.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Client presentations</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Export clean screenshots for decks to align on messaging and moderation strategy before you spend on Meta campaigns.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">UGC scripting</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Create comment prompts for creators to answer on video (FAQ‑style), and keep variations consistent across multiple concepts.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Export‑ready images</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Download a high‑resolution PNG that’s easy to place inside ad mockups, thumbnails, or internal testing documents.
                </p>
              </div>
            </div>

            <SubTitle id="export">Export image (PNG)</SubTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you searched for <strong>facebook comment image generator</strong>, the export is the key feature: you can generate a high‑quality PNG in common
              ad ratios. For safety and brand integrity, use exports for <strong>mockups, previews, and creative planning</strong>—not to misrepresent real
              engagement.
            </p>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

