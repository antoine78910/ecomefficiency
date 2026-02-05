import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import InstagramCommentGenerator from "./InstagramCommentGenerator";

const CANONICAL = "/freetools/instagram-comment-generator";

export const metadata: Metadata = {
  title: "Instagram Comment Generator (Unlimited Free)",
  description:
    "Free Instagram comment generator to create unlimited comments instantly. Try an AI Instagram comment generator to write high-engagement comments and export them as an image.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Instagram Comment Generator (Unlimited Free)",
    description:
      "Instagram comment generator: generate unlimited comments for free. AI-style comments, bulk mode, and export to image.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Instagram comment generator" }],
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

export default function InstagramCommentGeneratorPage() {
  const toc: TocItem[] = [
    { id: "generator", label: "Generator", level: 2 },
    { id: "use-cases", label: "Use cases", level: 2 },
    { id: "how-to-use", label: "How to use it", level: 2 },
    { id: "export-image", label: "Export as an image", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-05T00:00:00.000Z").toISOString();
  const faqItems = [
    {
      q: "What is an Instagram comment generator?",
      a: "An Instagram comment generator creates ready-to-post comments for Instagram posts and Reels. It helps you write comments faster and stay consistent.",
    },
    {
      q: "Is this an AI Instagram comment generator?",
      a: "It’s an AI-style Instagram comment generator: it generates natural comments based on tone and topic so you can quickly pick the best one.",
    },
    {
      q: "Can I generate unlimited comments for free?",
      a: "Yes. This free tool lets you generate unlimited Instagram comments without sign-up.",
    },
    {
      q: "Can I generate an Instagram comment generator image?",
      a: "Yes. You can export the rendered comment card as an image (PNG) and reuse it for mockups or content previews.",
    },
    {
      q: "Is this a comment generator for Instagram DMs?",
      a: "No. This tool is designed for public Instagram comments. For DMs, you’ll want shorter, more personal messages.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Instagram Comment Generator",
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
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Free tool</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~4 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Instagram comment generator</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>instagram comment generator</strong> helps you create unlimited comments for free. It also targets{" "}
            <strong>ai instagram comment generator</strong>, <strong>instagram comment generator image</strong>, and <strong>comment generator for instagram</strong>.
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
            <InstagramCommentGenerator />

            <SectionTitle id="use-cases">Use cases</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Creator engagement</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Generate short, human comments to boost engagement and get noticed by creators in your niche.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Brand social proof</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Create supportive replies and questions to keep conversations going under your posts.
                </p>
              </div>
            </div>

            <SubTitle id="how-to-use">How to use it</SubTitle>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Choose a topic and tone (supportive, funny, curious, hype, professional).</li>
              <li>Click Generate (single) or switch to Bulk Mode to generate many comments at once.</li>
              <li>Adjust the username, time label, likes, and reply count to match your mockup.</li>
              <li>Copy the comment or export an image.</li>
            </ol>

            <SectionTitle id="export-image">Export as an image</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you searched for <strong>instagram comment generator image</strong>, this tool can export your rendered comment card as a PNG. It’s useful for
              mockups, content previews, and presentation slides.
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

