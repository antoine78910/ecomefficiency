"use client";

import React from "react";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";

const RANKERFOX_LOGIN = "https://rankerfox.com/login/";

/** SEO tools to hide from the /prop demo hub. */
const SEO_TOOLS_HIDDEN = new Set([
  "academun",
  "writehuman",
  "seobserver",
  "yourtextguru",
  "surferlink",
  "spyfu",
  "wincher",
  "serpstat",
  "zonbase",
  "haloscan",
  "seoptimer",
  "niche-scraper",
  "amzscout",
  "seozoom",
  "smartscout",
  "searchatlas",
  "publicwww",
  "pexda",
  "xovi",
  "smodin",
  "sistrix",
  "ranxplorer",
  "buzzsumo",
  "storyblocks",
  "babbar",
  "moz",
  "wordai",
  "one-hour-indexing",
  "colinkri",
  "keysearch",
  "textoptimizer",
  "1fr",
  "domcop",
  "quetext",
  "screaming-frog",
  "woorank",
  "zikanalytics",
  "iconscout",
  "mangools",
  "keywordtool",
  "alura",
  "dinorank",
  "bypassgpt",
  "123rf",
  // Already shown in the main tools grid
  "freepik",
]);

/** Preferred order for remaining SEO tools (Semrush / Ubersuggest / Similarweb first). */
const SEO_TOOLS_ORDER = [
  "semrush",
  "ubersuggest",
  "similarweb",
  "ahrefs",
  "se-ranking",
  "majestic",
  "jungle-scout",
  "alsoasked",
  "answerthepublic",
  "hunter",
  "quillbot",
  "flaticon",
  "motion-array",
  "artlist",
  "envato-elements",
];

/** Domains used for favicon fallback when local logos are missing. */
const SEO_ICON_DOMAIN: Record<string, string> = {
  semrush: "semrush.com",
  ubersuggest: "neilpatel.com",
  academun: "academun.com",
  writehuman: "writehuman.ai",
  seobserver: "seobserver.com",
  "se-ranking": "seranking.com",
  flaticon: "flaticon.com",
  answerthepublic: "answerthepublic.com",
  "123rf": "123rf.com",
  "motion-array": "motionarray.com",
  artlist: "artlist.io",
  yourtextguru: "yourtextguru.com",
  similarweb: "similarweb.com",
  surferlink: "surferseo.com",
  ahrefs: "ahrefs.com",
  alura: "alura.io",
  spyfu: "spyfu.com",
  alsoasked: "alsoasked.com",
  keywordtool: "keywordtool.io",
  wincher: "wincher.com",
  serpstat: "serpstat.com",
  zonbase: "zonbase.com",
  quillbot: "quillbot.com",
  haloscan: "haloscan.com",
  bypassgpt: "bypassgpt.ai",
  seoptimer: "seoptimer.com",
  amzscout: "amzscout.net",
  zikanalytics: "zikanalytics.com",
  "niche-scraper": "nichescraper.com",
  dinorank: "dinorank.com",
  seozoom: "seozoom.it",
  smartscout: "smartscout.com",
  freepik: "freepik.com",
  searchatlas: "searchatlas.com",
  mangools: "mangools.com",
  sistrix: "sistrix.com",
  publicwww: "publicwww.com",
  hunter: "hunter.io",
  pexda: "pexda.com",
  xovi: "xovi.com",
  smodin: "smodin.io",
  ranxplorer: "ranxplorer.com",
  buzzsumo: "buzzsumo.com",
  storyblocks: "storyblocks.com",
  woorank: "woorank.com",
  iconscout: "iconscout.com",
  babbar: "babbar.tech",
  moz: "moz.com",
  "one-hour-indexing": "onehourindexing.com",
  wordai: "wordai.com",
  "jungle-scout": "junglescout.com",
  colinkri: "colinkri.com",
  keysearch: "keysearch.co",
  textoptimizer: "textoptimizer.com",
  "1fr": "1.fr",
  domcop: "domcop.com",
  "envato-elements": "elements.envato.com",
  quetext: "quetext.com",
  majestic: "majestic.com",
  "screaming-frog": "screamingfrog.co.uk",
};

type MainTool = {
  href: string;
  name: string;
  description: string;
  img: string;
  imgClass?: string;
  badge?: string;
};

const MAIN_TOOLS: MainTool[] = [
  {
    href: "https://app.flair.ai/explore",
    name: "Flair AI",
    description:
      "An AI-powered visual editor for product photography. Drag and drop to create high-quality ecommerce photoshoots in seconds.",
    img: "flair.png",
  },
  {
    href: "https://chatgpt.com/",
    name: "Chat GPT Pro",
    description:
      "Chat helps you answer questions, write texts, provide advice and automate conversations in a variety of fields.",
    img: "chatgpt.png",
  },
  {
    href: "https://claude.ai/login",
    name: "Claude",
    description: "AI assistant for writing, analysis, coding, and everyday business tasks.",
    img: "claude.svg",
    imgClass: "claude-logo",
  },
  {
    href: "https://www.midjourney.com/explore?tab=top",
    name: "Midjourney",
    description:
      "MidJourney is an AI-driven platform that generates high-quality images from text prompts, enabling users to create unique visuals quickly",
    img: "midjourney.png",
  },
  {
    href: "https://www.semrush.com/app/exploding-topics/",
    name: "Exploding Topics",
    description: "Tracks and identifies emerging trends using search data and online insights",
    img: "exploding.png",
  },
  {
    href: "https://www.pipiads.com/login",
    name: "Pipiads",
    description:
      "The largest TikTok & Facebook ad library, and the most powerful tiktok ad spy, facebook adspy, tiktok shop data tool",
    img: "pipiads.png",
    imgClass: "logo-small",
  },
  {
    href: "https://www.kalodata.com/login",
    name: "Kalodata",
    description: "Data analysis platform specialized in TikTok ecommerce.",
    img: "kalodata.png",
  },
  {
    href: "https://app.winninghunter.com/login",
    name: "Winning Hunter",
    description: "Spy tool for finding top-performing Facebook and TikTok ads.",
    img: "winninghunter.png",
  },
  {
    href: "https://www.capcut.com/fr-fr/login",
    name: "CapCut",
    description:
      "Create and edit stunning videos for social media and personal projects using CapCut's intuitive interface and advanced editing features.",
    img: "capcut.png",
  },
  {
    href: "https://app.sendshort.ai/en/home",
    name: "SendShort",
    description: "An AI tool for automatically generating and translating video subtitles",
    img: "sendshort.png",
  },
  {
    href: "https://noxtools.com/secure/page/Helium10",
    name: "Helium 10",
    description: "Amazon seller tools for product research and optimization.",
    img: "helium10.png",
    imgClass: "logo-small",
  },
  {
    href: "https://app.dropship.io/login",
    name: "Dropship.io",
    description:
      "All-in-one Shopify tool to find winning products and track competitors with real-time sales and ad data.",
    img: "dropship.png",
  },
  {
    href: "https://app.shophunter.io/login",
    name: "Shophunter",
    description: "Sales Tracker Spy & Product Research Tool. Spy on Competitor Sales.",
    img: "shophunter.png",
  },
  {
    href: "https://app.tryatria.com/login",
    name: "Atria",
    description:
      "A tool to discover winning products, ad creatives, store funnels, and market insights — all in one place.",
    img: "atria.png",
  },
  {
    href: "https://app.heygen.com/login",
    name: "Heygen",
    description:
      "AI video creation platform to generate talking avatars, product demos, and multilingual videos from text in minutes.",
    img: "heygen.png",
  },
  {
    href: "https://www.fotor.com/fr/",
    name: "Fotor",
    description:
      "Create any image you want in real time with our AI image creator. Type your description and turn text into images and AI art",
    img: "fotor.png",
    imgClass: "logo-small",
  },
  {
    href: "https://app.foreplay.co/login",
    name: "ForePlay",
    description: "Save ads, build briefs and produce high converting Facebook stamp, TikTok ads at scale.",
    img: "foreplay.png",
    imgClass: "logo-small",
  },
  {
    href: "https://elevenlabs.io/app/sign-in",
    name: "ElevenLabs",
    description:
      "AI-powered voice synthesis technology that creates realistic and customizable human-like speech for various applications",
    img: "elevenlabs.png",
    imgClass: "logo-small",
  },
  {
    href: "https://app.runwayml.com/login",
    name: "Runway",
    description:
      "AI-driven platform for creating, editing, and enhancing multimedia content, including images and videos.",
    img: "runway.png",
  },
  {
    href: "https://higgsfield.ai/auth/login",
    name: "Higgsfield",
    description: "AI tool for generating product images and videos.",
    img: "higgsfield.png",
    imgClass: "logo-large",
  },
  {
    href: "https://vmake.ai/workspace",
    name: "Vmake",
    description: "AI talking-head videos, background removal, subtitles, upscaling",
    img: "vmake.png",
    imgClass: "logo-small",
  },
  {
    href: "https://www.magnific.com/log-in?client_id=magnific&lang=en",
    name: "Freepik",
    description:
      "AI tools, smart features, and high-quality stock assets to design and create without ever leaving Freepik.",
    img: "freepik.png",
  },
  {
    href: "https://turboscribe.ai/login",
    name: "Turboscribe",
    description: "AI audio & video transcription, fast summaries, speaker detection, and export-ready text.",
    img: "turboscribe.png",
    imgClass: "logo-xl",
  },
  {
    href: "https://www.canva.com/",
    name: "Canva",
    description:
      "Graphic design platform for ads, creatives, social posts, and brand assets — fast and template-ready.",
    img: "canva.png",
  },
  {
    href: "https://www.brain.fm/login",
    name: "Brain.fm",
    description: "Focus and sleep music engineered to improve concentration and deep work sessions.",
    img: "brain.png",
    imgClass: "brain-logo",
  },
];

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function ToolCard({
  href,
  name,
  description,
  imgSrc,
  fallbackSrcs,
  imgClass,
  badge,
  group,
}: {
  href: string;
  name: string;
  description: string;
  imgSrc: string;
  fallbackSrcs?: string[];
  imgClass?: string;
  badge?: string;
  group?: boolean;
}) {
  const [src, setSrc] = React.useState(imgSrc);
  const fallbackIndex = React.useRef(0);

  React.useEffect(() => {
    setSrc(imgSrc);
    fallbackIndex.current = 0;
  }, [imgSrc]);

  return (
    <a
      href={href}
      className={`tool-card${group ? " group" : ""}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="tool-icon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className={imgClass}
          onError={() => {
            const list = fallbackSrcs || [];
            while (fallbackIndex.current < list.length) {
              const next = list[fallbackIndex.current++];
              if (next && next !== src) {
                setSrc(next);
                return;
              }
            }
          }}
        />
      </div>
      <div className="tool-name">{name}</div>
      <div className="tool-description">{description}</div>
      {badge ? <div className="tool-badge">{badge}</div> : null}
    </a>
  );
}

export default function PropToolsGrid({ assetVersion }: { assetVersion: string }) {
  const v = encodeURIComponent(assetVersion);
  const seoFallback = `/tools-images/seo.png?v=${v}`;

  const seoTools = seoToolsCatalog
    .filter((t) => !SEO_TOOLS_HIDDEN.has(t.slug))
    .slice()
    .sort((a, b) => {
      const ia = SEO_TOOLS_ORDER.indexOf(a.slug);
      const ib = SEO_TOOLS_ORDER.indexOf(b.slug);
      const ra = ia === -1 ? 999 : ia;
      const rb = ib === -1 ? 999 : ib;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

  const renderSeoCard = (tool: (typeof seoToolsCatalog)[number]) => {
    const domain = SEO_ICON_DOMAIN[tool.slug];
    const localKnown: Record<string, string> = {
      "jungle-scout": `/tools-images/junglescout.png?v=${v}`,
      semrush: `/tools-images/semrush.png?v=${v}`,
      ubersuggest: `/tools-images/ubersuggest.png?v=${v}`,
      similarweb: `/tools-images/similarweb.png?v=${v}`,
      ahrefs: `/tools-images/ahrefs.png?v=${v}`,
      answerthepublic: `/tools-images/answerthepublic.png?v=${v}`,
      artlist: `/tools-images/artlist.png?v=${v}`,
      hunter: `/tools-images/hunter.png?v=${v}`,
      flaticon: `/tools-images/flaticon.png?v=${v}`,
      "envato-elements": `/tools-images/envato-elements.png?v=${v}`,
      "se-ranking": `/tools-images/se-ranking.png?v=${v}`,
      alsoasked: `/tools-images/alsoasked.png?v=${v}`,
      "motion-array": `/tools-images/motion-array.png?v=${v}`,
      majestic: `/tools-images/majestic.png?v=${v}`,
      quillbot: `/tools-images/quillbot.png?v=${v}`,
    };
    const local = localKnown[tool.slug] || `/tools-images/${tool.slug}.png?v=${v}`;
    const favicon = domain ? faviconUrl(domain) : null;
    const primary = localKnown[tool.slug] ? local : favicon || local;
    const fallbacks = [
      ...(primary === local ? [] : [local]),
      ...(favicon && primary !== favicon ? [favicon] : []),
      seoFallback,
    ];

    const logoClassBySlug: Record<string, string> = {
      alsoasked: "logo-xl",
      "motion-array": "logo-xl",
      artlist: "logo-xl",
      answerthepublic: "logo-xl",
    };

    return (
      <ToolCard
        key={`seo-${tool.slug}`}
        href={RANKERFOX_LOGIN}
        name={tool.name}
        description={tool.shortDescription}
        imgSrc={primary}
        fallbackSrcs={fallbacks}
        imgClass={logoClassBySlug[tool.slug]}
      />
    );
  };

  return (
    <div className="tools-grid relative z-10">
      {MAIN_TOOLS.map((tool) => (
        <ToolCard
          key={`main-${tool.name}`}
          href={tool.href}
          name={tool.name}
          description={tool.description}
          imgSrc={`/tools-images/${tool.img}?v=${v}`}
          fallbackSrcs={[seoFallback]}
          imgClass={tool.imgClass}
          badge={tool.badge}
          group={tool.name === "ElevenLabs"}
        />
      ))}

      {seoTools.map(renderSeoCard)}
    </div>
  );
}
