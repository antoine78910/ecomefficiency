import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import ShopifyThemeDetector from "./ShopifyThemeDetector";

const CANONICAL = "/freetools/shopify-theme-detector";

export const metadata: Metadata = {
  title: "Shopify Theme Detector",
  description:
    "Free Shopify theme detector. Detect the Shopify theme name (best effort), including themes like Dawn, and confirm Shopify from public storefront signals.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Shopify Theme Detector",
    description: "Shopify theme detector: detect Shopify theme names like Dawn (best effort) and confirm if a store is Shopify.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Shopify theme detector" }],
  },
};

function SectionTitle({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={["scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4", className].filter(Boolean).join(" ")}>
      {children}
    </h2>
  );
}

export default function ShopifyThemeDetectorPage() {
  const toc: TocItem[] = [
    { id: "detector", label: "Detector", level: 2 },
    { id: "what-it-finds", label: "What it finds", level: 2 },
    { id: "how-it-works", label: "How it works", level: 2 },
    { id: "limitations", label: "Limitations", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-05T00:00:00.000Z").toISOString();
  const faqItems = [
    {
      q: "What is a Shopify theme detector?",
      a: "A Shopify theme detector checks a store’s public storefront code and endpoints to infer the most likely theme name. Results are best effort.",
    },
    {
      q: "Can you detect the Shopify theme name (like Dawn)?",
      a: "Often, yes. Many stores expose theme metadata in public storefront HTML (for example via Shopify.theme). Some stores hide it, so it may be unavailable.",
    },
    {
      q: "Why can theme detection fail?",
      a: "Some stores block automated requests, remove theme metadata, or rely on JavaScript-rendered storefront code that isn’t visible to a simple HTML fetch.",
    },
    {
      q: "Does this work for any website?",
      a: "This detector is designed for Shopify stores. If a site is not Shopify, we won’t be able to return a meaningful theme name.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Shopify Theme Detector",
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

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Shopify theme detector</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>shopify theme detector</strong> helps you detect the Shopify theme name (best effort) and confirm whether a website is Shopify, based
            on public storefront signals.
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
            <SectionTitle id="detector">Detector</SectionTitle>
            <ShopifyThemeDetector />

            <SectionTitle id="what-it-finds" className="mt-16">
              What it finds
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Theme name (best effort)</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  If the theme name is exposed in public storefront code, we display it (for example: Dawn). If not, we will show “Not found”.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Shopify confirmation</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  We also show whether we could confirm the site is running on Shopify using public endpoints and storefront signals.
                </p>
              </div>
            </div>

            <SectionTitle id="how-it-works">How it works</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              The detector fetches the store homepage server-side and checks for Shopify signals (Shopify assets, public endpoints like cart.js, and global
              variables). It then extracts theme hints when they are visible.
            </p>

            <SectionTitle id="limitations">Limitations</SectionTitle>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Some stores block automated requests or require JavaScript to render critical parts of the page.</li>
              <li>Theme name is not always publicly exposed, even on Shopify stores.</li>
              <li>Stores can customize or remove theme signals, which lowers detection confidence.</li>
            </ul>

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

