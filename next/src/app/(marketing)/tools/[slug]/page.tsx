import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc from "@/components/ToolToc";
import { toolsCatalog } from "@/data/toolsCatalog";
import AtriaChapters, { atriaFaq, atriaToc } from "./AtriaChapters";
import DropshipIoChapters, { dropshipIoFaq, dropshipIoToc } from "./DropshipIoChapters";
import ElevenLabsChapters, { elevenLabsFaq, elevenLabsToc } from "./ElevenLabsChapters";
import FlairAiChapters, { flairAiFaq, flairAiToc } from "./FlairAiChapters";
import KalodataChapters, { kalodataFaq, kalodataToc } from "./KalodataChapters";
import PipiadsChapters, { pipiadsFaq, pipiadsToc } from "./PipiadsChapters";
import SendShortChapters, { sendShortFaq, sendShortToc } from "./SendShortChapters";
import ShopHunterChapters, { shopHunterFaq, shopHunterToc } from "./ShopHunterChapters";
import ExplodingTopicsChapters, { explodingTopicsFaq, explodingTopicsToc } from "./ExplodingTopicsChapters";
import HeyGenChapters, { heygenFaq, heygenToc } from "./HeyGenChapters";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

function getTool(slug: string) {
  return toolsCatalog.find((t) => t.slug === slug) || null;
}

export async function generateStaticParams() {
  return toolsCatalog.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) {
    return { title: "Tool not found | Ecom Efficiency", robots: { index: false, follow: false } };
  }

  if (tool.slug === "pipiads") {
    const title = "Pipiads: TikTok ad spy tool for winners & creatives | Ecom Efficiency";
    const description =
      "Short guide to Pipiads: TikTok ad spy, filters that matter, a fast winner workflow, creative analysis (hooks/angles), and practical alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Pipiads" }],
      },
    };
  }

  if (tool.slug === "kalodata") {
    const title = "Kalodata: TikTok Shop analytics (GMV) for winning products | Ecom Efficiency";
    const description =
      "Short guide to Kalodata: TikTok Shop analytics, GMV tracking, creator performance, winner validation workflow, pricing, and best tool combos.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Kalodata" }],
      },
    };
  }

  if (tool.slug === "dropship-io") {
    const title = "Dropship.io: Shopify store-based product research | Ecom Efficiency";
    const description =
      "Short guide to Dropship.io: store-level product research, trend validation, saturation signals, a fast workflow to find winners, pricing, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Dropship.io" }],
      },
    };
  }

  if (tool.slug === "atria") {
    const title = "Atria: creative intelligence for hooks, angles & briefs | Ecom Efficiency";
    const description =
      "Short guide to Atria: creative pattern analysis, hooks and angles, remix frameworks, workflow to improve ads, pricing, and best tool combos.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Atria" }],
      },
    };
  }

  if (tool.slug === "flair-ai") {
    const title = "Flair AI: AI product photography for ecommerce visuals | Ecom Efficiency";
    const description =
      "Short guide to Flair AI: AI product photos, lifestyle scenes, brand consistency, a fast workflow to generate assets, pricing, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Flair AI" }],
      },
    };
  }

  if (tool.slug === "elevenlabs") {
    const title = "ElevenLabs: realistic AI voice generator for ads | Ecom Efficiency";
    const description =
      "Short guide to ElevenLabs: realistic text-to-speech, voice cloning, multilingual voiceovers, a fast workflow for ads, pricing, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "ElevenLabs" }],
      },
    };
  }

  if (tool.slug === "shophunter") {
    const title = "ShopHunter: Shopify store research & competitor analysis | Ecom Efficiency";
    const description =
      "ShopHunter review: store-level Shopify competitor analysis to find winning products, detect new launches, measure saturation, and validate niches (with a fast workflow).";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "ShopHunter" }],
      },
    };
  }

  if (tool.slug === "sendshort") {
    const title = "SendShort: AI short-form video automation for TikTok/Reels/Shorts | Ecom Efficiency";
    const description =
      "SendShort review: AI video repurposing to turn long videos into high-retention short clips with subtitles—ideal for daily posting and UGC-style ads.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "SendShort" }],
      },
    };
  }

  if (tool.slug === "exploding-topics") {
    const title = "Exploding Topics: trend discovery tool for early markets | Ecom Efficiency";
    const description =
      "Exploding Topics review: discover emerging trends and rising keywords early, evaluate long-term vs short-term momentum, and validate ideas before markets saturate.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Exploding Topics" }],
      },
    };
  }

  if (tool.slug === "heygen") {
    const title = "HeyGen: AI avatar video generator for UGC ads & demos | Ecom Efficiency";
    const description =
      "HeyGen review: generate realistic talking-head videos from scripts, scale UGC-style ads and product demos, localize into multiple languages, and test creatives faster.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "HeyGen" }],
      },
    };
  }

  const title = `${tool.name}: what it does, best use cases & workflows | Ecom Efficiency`;
  const description = `${tool.name}: ${tool.shortDescription}`;

  return {
    title,
    description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: {
      type: "article",
      url: `/tools/${tool.slug}`,
      title,
      description,
      images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: tool.name }],
    },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const related = toolsCatalog
    .filter((t) => t.category === tool.category && t.slug !== tool.slug)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.shortDescription,
    applicationCategory: tool.category,
    operatingSystem: "Web",
    url: `https://www.ecomefficiency.com/tools/${tool.slug}`,
    creator: { "@type": "Organization", name: "Ecom Efficiency" },
  };

  const pipiadsFaqJsonLd =
    tool.slug === "pipiads"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pipiadsFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const kalodataFaqJsonLd =
    tool.slug === "kalodata"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: kalodataFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const dropshipIoFaqJsonLd =
    tool.slug === "dropship-io"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: dropshipIoFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const atriaFaqJsonLd =
    tool.slug === "atria"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: atriaFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const flairAiFaqJsonLd =
    tool.slug === "flair-ai"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: flairAiFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const elevenLabsFaqJsonLd =
    tool.slug === "elevenlabs"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: elevenLabsFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const shopHunterFaqJsonLd =
    tool.slug === "shophunter"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: shopHunterFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const sendShortFaqJsonLd =
    tool.slug === "sendshort"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: sendShortFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const explodingTopicsFaqJsonLd =
    tool.slug === "exploding-topics"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: explodingTopicsFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const heygenFaqJsonLd =
    tool.slug === "heygen"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: heygenFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {pipiadsFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pipiadsFaqJsonLd) }} />
        ) : null}
        {kalodataFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(kalodataFaqJsonLd) }} />
        ) : null}
        {dropshipIoFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dropshipIoFaqJsonLd) }} />
        ) : null}
        {atriaFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(atriaFaqJsonLd) }} />
        ) : null}
        {flairAiFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(flairAiFaqJsonLd) }} />
        ) : null}
        {elevenLabsFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(elevenLabsFaqJsonLd) }} />
        ) : null}
        {shopHunterFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(shopHunterFaqJsonLd) }} />
        ) : null}
        {sendShortFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sendShortFaqJsonLd) }} />
        ) : null}
        {explodingTopicsFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(explodingTopicsFaqJsonLd) }} />
        ) : null}
        {heygenFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(heygenFaqJsonLd) }} />
        ) : null}

        <div className="mb-8">
          <Link href="/tools" className="text-sm text-gray-400 hover:text-white" title="Back to tools">
            ← Back to tools
          </Link>

          <h1 className="mt-5 text-4xl md:text-5xl font-bold text-white">{tool.name}</h1>
          {tool.slug === "pipiads" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Pipiads</strong> is a <strong>TikTok ad spy tool</strong> to analyze active/past ads and spot patterns that convert (products, hooks,
              angles).
            </p>
          ) : tool.slug === "kalodata" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Kalodata</strong> is a <strong>TikTok Shop analytics</strong> tool to track GMV, creators, and product demand—so you validate what actually
              sells (not just what goes viral).
            </p>
          ) : tool.slug === "dropship-io" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Dropship.io</strong> is a <strong>Shopify store-based</strong> product research tool—so you validate products via real store adoption, not
              hype.
            </p>
          ) : tool.slug === "atria" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Atria</strong> is a <strong>creative intelligence</strong> tool to extract hooks, angles, and messaging patterns from winners—so you can build
              better briefs and scale without copying.
            </p>
          ) : tool.slug === "flair-ai" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Flair AI</strong> is an <strong>AI product photography</strong> tool to generate premium-looking visuals for PDPs and ads—without shoots.
            </p>
          ) : tool.slug === "elevenlabs" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>ElevenLabs</strong> is a <strong>realistic AI voice generator</strong> for ad voiceovers, demos, and UGC-style narration—so you can test
              scripts faster without voice actor bottlenecks.
            </p>
          ) : tool.slug === "shophunter" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>ShopHunter</strong> is a <strong>Shopify store intelligence</strong> tool to validate products and niches using store-level data (what stores
              sell and add)—not ad hype.
            </p>
          ) : tool.slug === "sendshort" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>SendShort</strong> is an <strong>AI short-form video automation</strong> tool to turn long videos into TikTok/Reels/Shorts clips with captions—so
              you can publish daily without manual editing.
            </p>
          ) : tool.slug === "exploding-topics" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Exploding Topics</strong> is a <strong>trend discovery</strong> tool to spot emerging topics and markets early—so you build and publish before
              everyone else.
            </p>
          ) : tool.slug === "heygen" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>HeyGen</strong> is an <strong>AI avatar video</strong> tool to generate talking-head videos from scripts—so you can scale UGC-style ads, demos,
              and localization without filming.
            </p>
          ) : (
            <p className="mt-4 text-lg text-gray-300">
              <strong>{tool.name}</strong> is {tool.shortDescription}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200">
              Category: {tool.category}
            </span>
            {tool.bestFor.slice(0, 4).map((b) => (
              <span key={b} className="text-xs px-2 py-1 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-200">
                for {b}
              </span>
            ))}
          </div>
        </div>

        {tool.slug === "pipiads" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={pipiadsToc} defaultActiveId={pipiadsToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <PipiadsChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "kalodata" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={kalodataToc} defaultActiveId={kalodataToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <KalodataChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "dropship-io" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={dropshipIoToc} defaultActiveId={dropshipIoToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <DropshipIoChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "atria" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={atriaToc} defaultActiveId={atriaToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <AtriaChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "flair-ai" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={flairAiToc} defaultActiveId={flairAiToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <FlairAiChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "elevenlabs" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={elevenLabsToc} defaultActiveId={elevenLabsToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <ElevenLabsChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "shophunter" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={shopHunterToc} defaultActiveId={shopHunterToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <ShopHunterChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "sendshort" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={sendShortToc} defaultActiveId={sendShortToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <SendShortChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "exploding-topics" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={explodingTopicsToc} defaultActiveId={explodingTopicsToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <ExplodingTopicsChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : tool.slug === "heygen" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={heygenToc} defaultActiveId={heygenToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <HeyGenChapters />

              {related.length ? (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-white mb-4">Similar tools</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/tools/${r.slug}`}
                        title={`${r.name} tool page`}
                        className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                      >
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-gray-900/40 p-6">
              <h2 className="text-2xl font-bold text-white mb-3">What this tool is for</h2>
              <p className="text-gray-300">
                This page explains what <strong>{tool.name}</strong> is used for, the most common workflows, and practical use cases. If you want access to this
                tool alongside 45+ others in one platform, check our pricing.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/pricing"
                  title="Pricing for Ecom Efficiency"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] text-white font-medium hover:brightness-110"
                >
                  See pricing
                </Link>
                <Link
                  href="/sign-up"
                  title="Try Ecom Efficiency now"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white/10 border border-white/15 text-white font-medium hover:bg-white/15"
                >
                  Try it now
                </Link>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-2xl font-bold text-white mb-3">Practical use cases</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {tool.practicalUseCases.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-2xl font-bold text-white mb-3">Best for</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {tool.bestFor.map((b) => (
                  <div key={b} className="rounded-xl border border-white/10 bg-black/30 p-4 text-gray-200">
                    {b}
                  </div>
                ))}
              </div>
            </section>

            {tool.notes?.length ? (
              <section className="mt-10">
                <h2 className="text-2xl font-bold text-white mb-3">Notes</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  {tool.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {related.length ? (
              <section className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-4">Related tools</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/tools/${r.slug}`}
                      title={`${r.name} tool page`}
                      className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="text-white font-semibold">{r.name}</div>
                      <div className="text-sm text-gray-400 mt-1">{r.shortDescription}</div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </article>

      <Footer />
    </div>
  );
}

