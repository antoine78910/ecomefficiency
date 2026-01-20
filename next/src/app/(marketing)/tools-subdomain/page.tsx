import { headers } from "next/headers";
import Script from "next/script";

import styles from "../tools/tools.module.css";
import { supabaseAdmin } from "@/integrations/supabase/server";
import ToolsGridClient, { type ToolCard } from "../tools/ToolsGridClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

async function resolveSaasNameForHost(): Promise<string> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
    const bareHost = host.split(":")[0].replace(/^www\./, "");
    if (!bareHost) return "Ecom Efficiency";
    // Our own domains keep the default branding
    const isKnown = bareHost === "ecomefficiency.com" || bareHost.endsWith(".ecomefficiency.com") || bareHost.endsWith("localhost");
    if (isKnown) return "Ecom Efficiency";
    if (!supabaseAdmin) return "Tools";
    const key = `partner_domain:${bareHost}`;
    const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", key).maybeSingle();
    const mapping = parseMaybeJson((data as any)?.value) as any;
    const slug = mapping?.slug as string | undefined;
    if (!slug) return "Tools";
    const cfgKey = `partner_config:${slug}`;
    const { data: cfgRow } = await supabaseAdmin.from("portal_state").select("value").eq("key", cfgKey).maybeSingle();
    const cfg = parseMaybeJson((cfgRow as any)?.value) || {};
    return String((cfg as any)?.saasName || slug || "Tools");
  } catch {
    return "Tools";
  }
}

export async function generateMetadata() {
  const saasName = await resolveSaasNameForHost();
  return {
    title: `${saasName} Tools`,
    icons: { icon: "/favicon.png" },
  };
}

const TOOLS: ToolCard[] = [
  {
    href: "https://rankerfox.com/login/",
    img: "/tools-images/seo.png",
    fallbackImg: "/tools-logos/seo.png",
    title: "+30 SEO Tools",
    description: "Includes:",
    includes: [
      { img: "/tools-images/semrush.png", fallbackImg: "/tools-logos/semrush.png", alt: "Semrush" },
      { img: "/tools-images/ubersuggest.png", fallbackImg: "/tools-logos/ubersuggest.png", alt: "Ubersuggest" },
      { img: "/tools-images/junglescout.png", fallbackImg: "/tools-logos/junglescout.png", alt: "JungleScout" },
      { img: "/tools-images/canva.png", fallbackImg: "/tools-logos/canva.png", alt: "Canva" },
    ],
    afterIncludesText: "And more ...",
  },
  {
    href: "https://app.flair.ai/explore",
    img: "/tools-images/flair.png",
    fallbackImg: "/tools-logos/flair.png",
    title: "Flair AI",
    description:
      "An AI-powered visual editor for product photography. Drag and drop to create high-quality ecommerce photoshoots in seconds.",
  },
  {
    href: "https://chatgpt.com/",
    img: "/tools-images/chatgpt.png",
    fallbackImg: "/tools-logos/chatgpt.png",
    title: "Chat GPT Pro",
    description:
      "Chat helps you answer questions, write texts, provide advice and automate conversations in a variety of fields.",
  },
  {
    href: "https://www.midjourney.com/explore?tab=top",
    img: "/tools-images/midjourney.png",
    fallbackImg: "/tools-logos/midjourney.png",
    title: "Midjourney",
    description:
      "MidJourney is an AI-driven platform that generates high-quality images from text prompts, enabling users to create unique visuals quickly",
  },
  {
    href: "https://www.semrush.com/app/exploding-topics/",
    img: "/tools-images/exploding.png",
    fallbackImg: "/tools-logos/exploding.png",
    title: "Exploding Topics",
    description: "Tracks and identifies emerging trends using search data and online insights",
  },
  {
    href: "https://www.pipiads.com/login",
    img: "/tools-images/pipiads.png",
    fallbackImg: "/tools-logos/pipiads.png",
    title: "Pipiads",
    description:
      "The largest TikTok & Facebook ad library, and the most powerful tiktok ad spy, facebook adspy, tiktok shop data tool",
  },
  {
    href: "https://www.kalodata.com/login",
    img: "/tools-images/kalodata.png",
    fallbackImg: "/tools-logos/kalodata.png",
    title: "Kalodata",
    description: "Data analysis platform specialized in TikTok ecommerce.",
  },
  {
    href: "https://app.winninghunter.com/login",
    img: "/tools-images/winninghunter.png",
    fallbackImg: "/tools-logos/winninghunter.png",
    title: "Winning Hunter",
    description: "Spy tool for finding top-performing Facebook and TikTok ads.",
  },
  {
    href: "https://www.capcut.com/fr-fr/login",
    img: "/tools-images/capcut.png",
    fallbackImg: "/tools-logos/capcut.png",
    title: "Capcut",
    description:
      "Create and edit stunning videos for social media and personal projects using CapCut's intuitive interface and advanced editing features.",
  },
  {
    href: "https://app.sendshort.ai/en/home",
    img: "/tools-images/sendshort.png",
    fallbackImg: "/tools-logos/sendshort.png",
    title: "SendShort",
    description: "An AI tool for automatically generating and translating video subtitles",
  },
  {
    href: "https://noxtools.com/secure/page/Helium10",
    img: "/tools-images/helium10.png",
    fallbackImg: "/tools-logos/helium10.png",
    title: "Helium 10",
    description: "Amazon seller tools for product research and optimization.",
  },
  {
    href: "https://app.dropship.io/login",
    img: "/tools-images/dropship.png",
    fallbackImg: "/tools-logos/dropship.png",
    title: "Dropship.io",
    description: "All-in-one Shopify tool to find winning products and track competitors with real-time sales and ad data.",
  },
  {
    href: "https://app.shophunter.io/login",
    img: "/tools-images/shophunter.png",
    fallbackImg: "/tools-logos/shophunter.png",
    title: "Shophunter",
    description: "Sales Tracker Spy & Product Research Tool. Spy on Competitor Sales.",
  },
  {
    href: "https://app.tryatria.com/login",
    img: "/tools-images/atria.png",
    fallbackImg: "/tools-logos/atria.png",
    title: "Atria",
    description: "A tool to discover winning products, ad creatives, store funnels, and market insights — all in one place.",
  },
  {
    href: "https://app.foreplay.co/login",
    img: "/tools-images/foreplay.png",
    fallbackImg: "/tools-logos/foreplay.png",
    title: "ForePlay",
    description: "Save ads, build briefs and produce high converting Facebook stamp, TikTok ads at scale.",
  },
  {
    href: "https://elevenlabs.io/app/sign-in",
    img: "/tools-images/elevenlabs.png",
    fallbackImg: "/tools-logos/elevenlabs.png",
    title: "ElevenLabs",
    description: "AI-powered voice synthesis technology that creates realistic and customizable human-like speech for various applications",
    group: true,
  },
  {
    href: "https://vmake.ai/workspace",
    img: "/tools-images/vmake.png",
    fallbackImg: "/tools-logos/vmake.png",
    title: "Vmake",
    description: "AI talking-head videos, background removal, subtitles, upscaling",
  },
];

export default async function ToolsSubdomainPage() {
  const saasName = await resolveSaasNameForHost();
  // Avoid loading analytics scripts on custom domains (can contribute to Safe Browsing flags).
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
  const bareHost = host.split(":")[0].replace(/^www\./, "");
  const isKnownDomain =
    bareHost === "ecomefficiency.com" ||
    bareHost.endsWith(".ecomefficiency.com") ||
    bareHost === "partners.ecomefficiency.com" ||
    bareHost.endsWith("localhost");

  return (
    <div className={styles.page}>
      {/* Keep tracking scripts only on our own domains (never on custom domains). */}
      {isKnownDomain ? (
        <>
          <Script src="https://t.contentsquare.net/uxa/af705d190c606.js" strategy="afterInteractive" />
          <Script id="hotjar-spy-tools" strategy="afterInteractive">{``}</Script>
        </>
      ) : null}

      <h1 className={styles.h1}>{saasName}</h1>
      <ToolsGridClient tools={TOOLS} />
    </div>
  );
}

