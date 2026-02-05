import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import TikTokCommentGenerator from "./TikTokCommentGenerator";

const CANONICAL = "/freetools/tiktok-comment-generator";

export const metadata: Metadata = {
  title: "TikTok Comment Generator (Unlimited Free)",
  description:
    "Free TikTok comment generator to create unlimited comments and replies instantly. Generate engaging TikTok comments for any niche—100% free and unlimited.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "TikTok Comment Generator (Unlimited Free)",
    description:
      "TikTok comment generator: generate unlimited TikTok comments and replies for free. Create high-engagement comments in seconds.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "TikTok comment generator" }],
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

export default function TikTokCommentGeneratorPage() {
  const toc: TocItem[] = [
    { id: "generator", label: "Generator", level: 2 },
    { id: "what-it-does", label: "What it does", level: 2 },
    { id: "how-to-use", label: "How to use it", level: 2 },
    { id: "unlimited", label: "Unlimited & free", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-05T00:00:00.000Z").toISOString();
  const faqItems = [
    {
      q: "What is a TikTok comment generator?",
      a: "A TikTok comment generator creates ready-to-post comments and replies for TikTok videos. It helps you write engaging comments faster and stay consistent.",
    },
    {
      q: "Is this a TikTok comments generator too?",
      a: "Yes. People search it as a TikTok comments generator as well. You can generate video comments and comment replies using the same tool.",
    },
    {
      q: "Can I generate unlimited comments for free?",
      a: "Yes. This free tool lets you generate unlimited TikTok comments without sign-up.",
    },
    {
      q: "What makes a TikTok comment high-engagement?",
      a: "Short comments that ask a clear question, react with a strong opinion, or request the next step tend to get more replies. Mixing question comments with “save/pin/follow” comments also helps.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TikTok Comment Generator",
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

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TikTok comment generator</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>tiktok comment generator</strong> helps you create unlimited comments and replies for free. It is also searched as a{" "}
            <strong>tiktok comments generator</strong>.
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
            <TikTokCommentGenerator />

            <SectionTitle id="what-it-does">What it does</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Writing comments that get replies is harder than it looks. This TikTok comment generator gives you a fast starting point so you can stay
              consistent and test what drives engagement.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Video comments</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Generate short reactions, questions, and “follow for part 2” comments to boost visibility and spark replies.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Comment replies</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Reply faster to keep the conversation going—without sounding robotic or repeating the same lines.
                </p>
              </div>
            </div>

            <SubTitle id="how-to-use">How to use it</SubTitle>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Choose Single Mode for one comment or Bulk Mode to generate many at once.</li>
              <li>Pick “Comment Reply” if you’re responding to someone, or “Video Comment” for general engagement.</li>
              <li>Add an optional topic (niche) to make comments feel more relevant.</li>
              <li>Click Generate, then Copy or Export Image.</li>
            </ol>

            <SectionTitle id="unlimited">Unlimited & free</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              This is an <strong>unlimited free TikTok comment generator</strong>. You can generate as many comments as you want, without an account.
            </p>
            <p className="text-gray-300 leading-relaxed">
              If you’re building an ecommerce brand and want to reduce your SaaS stack costs, you can also compare with{" "}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline" title="Ecom Efficiency pricing">
                Ecom Efficiency pricing
              </Link>
              .
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

