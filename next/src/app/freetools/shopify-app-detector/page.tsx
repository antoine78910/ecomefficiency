import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CANONICAL_ORIGIN } from "@/lib/canonicalOrigin";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import ShopifyAppDetector from "./ShopifyAppDetector";

const CANONICAL = "/freetools/shopify-app-detector";

export const metadata: Metadata = {
  title: "Shopify App Detector",
  description:
    "Free Shopify app detector (Shopify apps detector). Detect apps used by a Shopify store by finding a syncload script and extracting its embedded URL list.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Shopify App Detector",
    description: "Shopify app detector: detect apps used by a Shopify store by parsing syncload script URLs.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Shopify app detector" }],
  },
};

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

export default function ShopifyAppDetectorPage() {
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
      q: "What is a Shopify app detector?",
      a: "A Shopify app detector attempts to infer installed apps by analyzing public storefront code. This version searches for a syncload loader script and extracts the embedded list of script URLs.",
    },
    {
      q: "Does this show all apps used by a Shopify store?",
      a: "It shows the apps that appear in the syncload URL list (when present). If a store doesn’t use syncload (or hides app scripts), the result can be empty.",
    },
    {
      q: "Why can app detection fail?",
      a: "Some stores block automated requests, load scripts dynamically, or don’t use syncload. In those cases, the app list may be incomplete or empty.",
    },
    {
      q: "Does this work for any website?",
      a: "This detector is designed for Shopify storefronts. Non‑Shopify sites usually won’t have the syncload pattern, so results will be empty.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Shopify App Detector",
    description: metadata.description,
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${CANONICAL_ORIGIN}${CANONICAL}` },
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

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Shopify app detector</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>shopify app detector</strong> (also searched as <strong>shopify apps detector</strong>) helps you detect apps used by a Shopify store
            by extracting URLs from a <strong>syncload</strong> script loader (when present).
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
            <ShopifyAppDetector />

            <SectionTitle id="what-it-finds">What it finds</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Apps (inferred from script URLs)</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  We list unique “apps” by grouping the extracted script URLs by domain. This often surfaces providers like chat widgets, tracking pixels,
                  and app backends.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Evidence + raw URLs</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  We show whether a <span className="font-medium text-gray-200">syncload</span> script was found and provide the raw extracted URLs so you can
                  validate them.
                </p>
              </div>
            </div>

            <SectionTitle id="how-it-works">How it works</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              The detector fetches the store homepage server-side, finds <code className="text-gray-200">syncload</code> inside script tags, then extracts the
              <code className="text-gray-200">urls = ["..."]</code> array and decodes its JavaScript string literals (including{" "}
              <code className="text-gray-200">{"\\u0026"}</code>).
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              Looking for the theme instead? Use the{" "}
              <Link href="/freetools/shopify-theme-detector" className="text-white underline underline-offset-4">
                Shopify theme detector
              </Link>
              .
            </p>

            <SectionTitle id="limitations">Limitations</SectionTitle>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Not all stores use syncload, so the detector can return an empty list even if the store uses many apps.</li>
              <li>Some stores block automated requests or rely on JavaScript-rendered content.</li>
              <li>Apps can be loaded from Shopify CDN paths, making attribution imperfect (we group by URL domains).</li>
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

