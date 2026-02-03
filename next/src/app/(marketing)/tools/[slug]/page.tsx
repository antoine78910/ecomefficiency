import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc from "@/components/ToolToc";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";
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
import VmakeChapters, { vmakeFaq, vmakeToc } from "./VmakeChapters";
import HiggsfieldChapters, { higgsfieldFaq, higgsfieldToc } from "./HiggsfieldChapters";
import ForeplayChapters, { foreplayFaq, foreplayToc } from "./ForeplayChapters";
import WinningHunterChapters, { winningHunterFaq, winningHunterToc } from "./WinningHunterChapters";
import CapCutChapters, { capcutFaq, capcutToc } from "./CapCutChapters";
import TurboScribeChapters, { turboscribeFaq, turboscribeToc } from "./TurboScribeChapters";
import Helium10Chapters, { helium10Faq, helium10Toc } from "./Helium10Chapters";
import ChatGPTChapters, { chatgptFaq, chatgptToc } from "./ChatGPTChapters";
import CanvaChapters, { canvaFaq, canvaToc } from "./CanvaChapters";
import FotorChapters, { fotorFaq, fotorToc } from "./FotorChapters";
import BrainFmChapters, { brainFmFaq, brainFmToc } from "./BrainFmChapters";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

function getTool(slug: string) {
  return toolsCatalog.find((t) => t.slug === slug) || null;
}

export async function generateStaticParams() {
  const slugs = new Set<string>();
  for (const t of toolsCatalog) slugs.add(t.slug);
  for (const t of seoToolsCatalog) slugs.add(t.slug);
  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // SEO tools live under /tools/seo/<slug>. Keep /tools/<slug> as a redirect entrypoint.
  if (seoToolsCatalog.some((t) => t.slug === slug)) {
    const tool = seoToolsCatalog.find((t) => t.slug === slug)!;
    const title = `${tool.name}: SEO tool review, pricing & best workflows | Ecom Efficiency`;
    const description = `${tool.name}: ${tool.shortDescription} Learn core features, practical workflows, pricing, and alternatives.`;
    return {
      title,
      description,
      alternates: { canonical: `/tools/seo/${tool.slug}` },
      robots: { index: false, follow: true },
      openGraph: {
        type: "article",
        url: `/tools/seo/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: tool.name }],
      },
    };
  }

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

  if (tool.slug === "vmake") {
    const title = "Vmake: AI video ads maker for ecommerce creatives | Ecom Efficiency";
    const description =
      "Vmake review: create conversion-ready ecommerce video ads from product images or footage, generate variations fast, add subtitles/background removal, and test creatives quicker.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Vmake" }],
      },
    };
  }

  if (tool.slug === "higgsfield") {
    const title = "Higgsfield: cinematic AI video ads generator for brands | Ecom Efficiency";
    const description =
      "Higgsfield review: generate premium, cinematic video ad creatives from simple inputs, iterate fast, and scale scroll-stopping visuals for TikTok/Meta.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Higgsfield" }],
      },
    };
  }

  if (tool.slug === "foreplay") {
    const title = "Foreplay: ad creative library & swipe file workflow tool | Ecom Efficiency";
    const description =
      "Foreplay review: save and organize winning ads, tag hooks/angles/offers, build briefs faster, collaborate with your team, and scale creative iteration.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Foreplay" }],
      },
    };
  }

  if (tool.slug === "winninghunter") {
    const title = "Winning Hunter: dropshipping product research & winning ads signals | Ecom Efficiency";
    const description =
      "Winning Hunter review: spot winning dropshipping products early using ad and store signals, run faster test cycles, check saturation, and validate what’s worth testing.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Winning Hunter" }],
      },
    };
  }

  if (tool.slug === "capcut") {
    const title = "CapCut: short-form video editor for TikTok/Reels/Shorts | Ecom Efficiency";
    const description =
      "CapCut review: edit and optimize short-form videos fast with captions, templates, and social-first pacing—ideal for UGC-style ads and creator content.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "CapCut" }],
      },
    };
  }

  if (tool.slug === "turboscribe") {
    const title = "TurboScribe: AI transcription & summaries for repurposing | Ecom Efficiency";
    const description =
      "TurboScribe review: AI transcription and summarization to convert audio/video into clean text, summaries, and captions—ideal for content repurposing at scale.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "TurboScribe" }],
      },
    };
  }

  if (tool.slug === "helium10") {
    const title = "Helium 10: Amazon FBA suite for product research & ranking | Ecom Efficiency";
    const description =
      "Helium 10 review: Amazon FBA toolkit for product research, keyword tracking, listing optimization, competitor analysis, and scaling with data-driven workflows.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Helium 10" }],
      },
    };
  }

  if (tool.slug === "chatgpt") {
    const title = "ChatGPT: AI assistant for marketing, SEO & workflows | Ecom Efficiency";
    const description =
      "ChatGPT review: AI writing + reasoning assistant to generate ads, SEO pages, scripts, ideas, and workflows—plus a fast method, pricing, limits, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "ChatGPT" }],
      },
    };
  }

  if (tool.slug === "canva") {
    const title = "Canva: fast design tool for ads, ecommerce & templates | Ecom Efficiency";
    const description =
      "Canva review: design platform to create ad creatives, social posts, thumbnails, and ecommerce visuals fast—plus templates, workflow, pricing, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Canva" }],
      },
    };
  }

  if (tool.slug === "fotor") {
    const title = "Fotor: AI photo editor for ecommerce images & ad creatives | Ecom Efficiency";
    const description =
      "Fotor review: online photo editor with AI enhancement and background remover to clean product photos and create simple ad creatives fast—plus pricing and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Fotor" }],
      },
    };
  }

  if (tool.slug === "brain-fm") {
    const title = "Brain.fm: functional focus music for deep work & sleep | Ecom Efficiency";
    const description =
      "Brain.fm review: science-backed functional music to improve focus, relaxation, and sleep—plus a fast workflow, pricing, limits, and alternatives.";
    return {
      title,
      description,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        type: "article",
        url: `/tools/${tool.slug}`,
        title,
        description,
        images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Brain.fm" }],
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

  // SEO tools are served under /tools/seo/<slug> with a richer template.
  // Keep /tools/<slug> as a stable entrypoint (redirect) for all +30 SEO tools.
  if (seoToolsCatalog.some((t) => t.slug === slug)) {
    redirect(`/tools/seo/${slug}`);
  }

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

  const vmakeFaqJsonLd =
    tool.slug === "vmake"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: vmakeFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const higgsfieldFaqJsonLd =
    tool.slug === "higgsfield"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: higgsfieldFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const foreplayFaqJsonLd =
    tool.slug === "foreplay"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: foreplayFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const winningHunterFaqJsonLd =
    tool.slug === "winninghunter"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: winningHunterFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const capcutFaqJsonLd =
    tool.slug === "capcut"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: capcutFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const turboscribeFaqJsonLd =
    tool.slug === "turboscribe"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: turboscribeFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const helium10FaqJsonLd =
    tool.slug === "helium10"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: helium10Faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const chatgptFaqJsonLd =
    tool.slug === "chatgpt"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: chatgptFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const canvaFaqJsonLd =
    tool.slug === "canva"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: canvaFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const fotorFaqJsonLd =
    tool.slug === "fotor"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: fotorFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const brainFmFaqJsonLd =
    tool.slug === "brain-fm"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: brainFmFaq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  // SEO-friendly FAQ heading structure (H2/H3/H4) without changing UI.
  const faqSeoItems =
    tool.slug === "pipiads"
      ? pipiadsFaq
      : tool.slug === "kalodata"
        ? kalodataFaq
        : tool.slug === "dropship-io"
          ? dropshipIoFaq
          : tool.slug === "atria"
            ? atriaFaq
            : tool.slug === "flair-ai"
              ? flairAiFaq
              : tool.slug === "elevenlabs"
                ? elevenLabsFaq
                : tool.slug === "shophunter"
                  ? shopHunterFaq
                  : tool.slug === "sendshort"
                    ? sendShortFaq
                    : tool.slug === "exploding-topics"
                      ? explodingTopicsFaq
                      : tool.slug === "heygen"
                        ? heygenFaq
                        : tool.slug === "vmake"
                          ? vmakeFaq
                          : tool.slug === "higgsfield"
                            ? higgsfieldFaq
                            : tool.slug === "foreplay"
                              ? foreplayFaq
                              : tool.slug === "winninghunter"
                                ? winningHunterFaq
                                : tool.slug === "capcut"
                                  ? capcutFaq
                                  : tool.slug === "turboscribe"
                                    ? turboscribeFaq
                                    : tool.slug === "helium10"
                                      ? helium10Faq
                                      : tool.slug === "chatgpt"
                                        ? chatgptFaq
                                        : tool.slug === "canva"
                                          ? canvaFaq
                                          : tool.slug === "fotor"
                                            ? fotorFaq
                                            : tool.slug === "brain-fm"
                                              ? brainFmFaq
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
        {vmakeFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vmakeFaqJsonLd) }} />
        ) : null}
        {higgsfieldFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(higgsfieldFaqJsonLd) }} />
        ) : null}
        {foreplayFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(foreplayFaqJsonLd) }} />
        ) : null}
        {winningHunterFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(winningHunterFaqJsonLd) }} />
        ) : null}
        {capcutFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(capcutFaqJsonLd) }} />
        ) : null}
        {turboscribeFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(turboscribeFaqJsonLd) }} />
        ) : null}
        {helium10FaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(helium10FaqJsonLd) }} />
        ) : null}
        {chatgptFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(chatgptFaqJsonLd) }} />
        ) : null}
        {canvaFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(canvaFaqJsonLd) }} />
        ) : null}
        {fotorFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fotorFaqJsonLd) }} />
        ) : null}
        {brainFmFaqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brainFmFaqJsonLd) }} />
        ) : null}
        {faqSeoItems?.length ? (
          <div className="sr-only">
            <h2>FAQ</h2>
            {faqSeoItems.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <h4>{f.a}</h4>
              </div>
            ))}
          </div>
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
          ) : tool.slug === "vmake" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Vmake</strong> is an <strong>AI video ads</strong> tool for ecommerce to turn product assets into conversion-ready creatives—so you can test more
              variations without editing bottlenecks.
            </p>
          ) : tool.slug === "higgsfield" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Higgsfield</strong> is a <strong>cinematic AI video generator</strong> to produce premium-looking ad creatives—so you can stand out visually and
              test high-end variations without shoots.
            </p>
          ) : tool.slug === "foreplay" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Foreplay</strong> is an <strong>ad creative library</strong> tool to organize winning ads by hooks, angles, and offers—so you can brief and
              iterate faster without losing what works.
            </p>
          ) : tool.slug === "winninghunter" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Winning Hunter</strong> is a <strong>dropshipping product research</strong> tool to spot winners early using ad/store signals—so you can test
              faster and avoid late-stage saturation.
            </p>
          ) : tool.slug === "capcut" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>CapCut</strong> is a <strong>short-form video editor</strong> for TikTok/Reels/Shorts with captions, templates, and social-first pacing—so you
              can ship UGC-style ads and content faster.
            </p>
          ) : tool.slug === "turboscribe" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>TurboScribe</strong> is an <strong>AI transcription + summarization</strong> tool to convert audio/video into clean text and summaries—so you
              can repurpose content into blogs, captions, and scripts without manual typing.
            </p>
          ) : tool.slug === "helium10" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Helium 10</strong> is an <strong>all-in-one Amazon FBA suite</strong> to find products, research keywords, optimize listings, and track
              competitors—so you scale with data, not intuition.
            </p>
          ) : tool.slug === "chatgpt" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>ChatGPT</strong> is an <strong>AI assistant</strong> to structure ideas, write better copy, generate SEO content, and automate workflows—so you
              move from questions to execution faster.
            </p>
          ) : tool.slug === "canva" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Canva</strong> is an <strong>online design platform</strong> to create ad creatives, social content, thumbnails, and ecommerce visuals fast—without
              design skills.
            </p>
          ) : tool.slug === "fotor" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Fotor</strong> is an <strong>online photo editor</strong> with AI enhancement and background removal—so you can clean product images and build
              simple ad creatives fast.
            </p>
          ) : tool.slug === "brain-fm" ? (
            <p className="mt-4 text-lg text-gray-300">
              <strong>Brain.fm</strong> is <strong>science-backed functional music</strong> for focus, relaxation, and sleep—so you can reduce distractions and get into
              deep work faster.
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
        ) : tool.slug === "vmake" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={vmakeToc} defaultActiveId={vmakeToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <VmakeChapters />

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
        ) : tool.slug === "higgsfield" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={higgsfieldToc} defaultActiveId={higgsfieldToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <HiggsfieldChapters />

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
        ) : tool.slug === "foreplay" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={foreplayToc} defaultActiveId={foreplayToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <ForeplayChapters />

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
        ) : tool.slug === "winninghunter" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={winningHunterToc} defaultActiveId={winningHunterToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <WinningHunterChapters />

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
        ) : tool.slug === "capcut" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={capcutToc} defaultActiveId={capcutToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <CapCutChapters />

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
        ) : tool.slug === "turboscribe" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={turboscribeToc} defaultActiveId={turboscribeToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <TurboScribeChapters />

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
        ) : tool.slug === "helium10" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={helium10Toc} defaultActiveId={helium10Toc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <Helium10Chapters />

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
        ) : tool.slug === "chatgpt" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={chatgptToc} defaultActiveId={chatgptToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <ChatGPTChapters />

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
        ) : tool.slug === "canva" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={canvaToc} defaultActiveId={canvaToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <CanvaChapters />

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
        ) : tool.slug === "fotor" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={fotorToc} defaultActiveId={fotorToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <FotorChapters />

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
        ) : tool.slug === "brain-fm" ? (
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            <aside className="lg:sticky lg:top-24 self-start flex flex-col max-h-[calc(100vh-7rem)]">
              <div
                className="min-h-0 overflow-y-auto pr-1
                  [scrollbar-width:none] [-ms-overflow-style:none]
                  [&::-webkit-scrollbar]:hidden"
              >
                <ToolToc items={brainFmToc} defaultActiveId={brainFmToc[0]?.id} collapseSubheadings />
              </div>
              <div className="mt-6 shrink-0">
                <EcomToolsCta compact />
              </div>
            </aside>
            <div className="min-w-0">
              <BrainFmChapters />

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

