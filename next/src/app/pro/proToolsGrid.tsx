"use client";

import * as React from "react";
import Script from "next/script";

type Tool = {
  name: string;
  description: string;
  href: string;
  logoDomain?: string; // Clearbit domain
  badge?: { label: string; tone?: "blue" | "orange" };
};

const TOOLS: Tool[] = [
  {
    name: "+30 SEO Tools",
    description: "Includes: Semrush, Ubersuggest, Jungle Scout, Canva… and more.",
    href: "https://rankerfox.com/login/",
    logoDomain: "rankerfox.com",
  },
  {
    name: "Flair AI",
    description: "An AI-powered visual editor for product photography.",
    href: "https://app.flair.ai/explore",
    logoDomain: "flair.ai",
  },
  {
    name: "Chat GPT Pro",
    description: "Chat helps you answer questions, write texts, provide advice and automate conversations.",
    href: "https://chatgpt.com/",
    logoDomain: "openai.com",
  },
  {
    name: "Midjourney",
    description: "AI-driven platform that generates high-quality images from text prompts.",
    href: "https://www.midjourney.com/explore?tab=top",
    logoDomain: "midjourney.com",
  },
  {
    name: "Exploding Topics",
    description: "Tracks and identifies emerging trends using search data and online insights.",
    href: "https://www.semrush.com/app/exploding-topics/",
    logoDomain: "explodingtopics.com",
  },
  {
    name: "Pipiads",
    description: "The largest TikTok & Facebook ad library and powerful ad spy.",
    href: "https://www.pipiads.com/login",
    logoDomain: "pipiads.com",
  },
  {
    name: "Kalodata",
    description: "Data analysis platform specialized in TikTok ecommerce.",
    href: "https://www.kalodata.com/login",
    logoDomain: "kalodata.com",
  },
  {
    name: "Winning Hunter",
    description: "Spy tool for finding top-performing Facebook and TikTok ads.",
    href: "https://app.winninghunter.com/login",
    logoDomain: "winninghunter.com",
  },
  {
    name: "Capcut",
    description: "Create and edit stunning videos for social media.",
    href: "https://www.capcut.com/fr-fr/login",
    logoDomain: "capcut.com",
  },
  {
    name: "SendShort",
    description: "AI tool for automatically generating and translating video subtitles.",
    href: "https://app.sendshort.ai/en/home",
    logoDomain: "sendshort.ai",
  },
  {
    name: "Helium 10",
    description: "Amazon seller tools for product research and optimization.",
    href: "https://noxtools.com/secure/page/Helium10",
    logoDomain: "helium10.com",
  },
  {
    name: "Dropship.io",
    description: "All-in-one Shopify tool to find winning products and track competitors.",
    href: "https://app.dropship.io/login",
    logoDomain: "dropship.io",
  },
  {
    name: "Shophunter",
    description: "Sales Tracker Spy & Product Research Tool. Spy on Competitor Sales.",
    href: "https://app.shophunter.io/login",
    logoDomain: "shophunter.io",
  },
  {
    name: "Atria",
    description: "Discover winning products, ad creatives, store funnels, and market insights.",
    href: "https://app.tryatria.com/login",
    logoDomain: "tryatria.com",
  },
  {
    name: "Heygen",
    description: "AI video creation platform to generate talking avatars and multilingual videos.",
    href: "https://app.heygen.com/login",
    logoDomain: "heygen.com",
  },
  {
    name: "Fotor",
    description: "Create any image you want in real time with AI image creator.",
    href: "https://www.fotor.com/fr/",
    logoDomain: "fotor.com",
  },
  {
    name: "ForePlay",
    description: "Save ads, build briefs and produce high converting Facebook & TikTok ads.",
    href: "https://app.foreplay.co/login",
    logoDomain: "foreplay.co",
  },
  {
    name: "ElevenLabs",
    description: "AI-powered voice synthesis technology that creates realistic speech.",
    href: "https://elevenlabs.io/app/sign-in",
    logoDomain: "elevenlabs.io",
  },
  {
    name: "Runway",
    description: "AI-driven platform for creating, editing, and enhancing multimedia content.",
    href: "https://app.runwayml.com/login",
    logoDomain: "runwayml.com",
  },
  {
    name: "Higgsfield",
    description: "AI tool for generating product images and videos.",
    href: "https://higgsfield.ai/auth/login",
    logoDomain: "higgsfield.ai",
    badge: { label: "Newly Added", tone: "blue" },
  },
  {
    name: "Vmake",
    description: "AI talking-head videos, background removal, subtitles, upscaling.",
    href: "https://vmake.ai/workspace",
    logoDomain: "vmake.ai",
  },
  {
    name: "Freepik",
    description: "AI tools, smart features, and high-quality stock assets.",
    href: "https://www.freepik.com/log-in?client_id=freepik&lang=en",
    logoDomain: "freepik.com",
  },
  {
    name: "TurboScribe",
    description: "AI audio & video transcription, fast summaries, speaker detection.",
    href: "https://turboscribe.ai/login",
    logoDomain: "turboscribe.ai",
    badge: { label: "Newly Added !", tone: "blue" },
  },
];

function ToolLogo({ name, logoDomain }: { name: string; logoDomain?: string }) {
  const [errored, setErrored] = React.useState(false);
  const src = logoDomain ? `https://logo.clearbit.com/${logoDomain}` : "";

  if (!logoDomain || errored) {
    return (
      <div
        aria-hidden="true"
        className="w-16 h-16 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center"
        title={name}
      >
        <span className="text-2xl font-black text-black/60">{name.trim().slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      className="w-16 h-16 object-contain"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  );
}

function Badge({ label, tone = "blue" }: { label: string; tone?: "blue" | "orange" }) {
  const cls = tone === "orange" ? "bg-orange-500 text-white" : "bg-blue-600 text-white";
  return <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export default function ProToolsGrid({
  montserratClassName,
  openSansClassName,
}: {
  montserratClassName: string;
  openSansClassName: string;
}) {
  return (
    <>
      <Script src="https://t.contentsquare.net/uxa/af705d190c606.js" strategy="afterInteractive" />

      <div className="tools-grid mx-auto max-w-[1600px] grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group relative bg-white rounded-lg p-5 text-left no-underline",
              "border border-black shadow-[0_4px_8px_rgba(0,0,0,0.1),0_6px_20px_rgba(0,0,0,0.2)]",
              "transition-transform transition-shadow duration-300",
              "hover:-translate-y-2.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.4)] hover:border-black/70",
              "aspect-square flex flex-col",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
            ].join(" ")}
          >
            {tool.badge ? (
              <div className="absolute top-3 right-3">
                <Badge label={tool.badge.label} tone={tool.badge.tone} />
              </div>
            ) : null}

            <div className="mb-3">
              <ToolLogo name={tool.name} logoDomain={tool.logoDomain} />
            </div>

            <div className={["text-xl font-extrabold mb-2 text-[#111]", montserratClassName].join(" ")}>{tool.name}</div>

            <div className={["text-sm text-[#464646] leading-relaxed", openSansClassName].join(" ")}>{tool.description}</div>

            {tool.name === "+30 SEO Tools" ? (
              <div className="mt-4">
                <div className={["text-xs text-[#464646] mb-2", openSansClassName].join(" ")}>Includes:</div>
                <div className="flex flex-wrap items-center gap-2">
                  <ToolLogo name="Semrush" logoDomain="semrush.com" />
                  <ToolLogo name="Ubersuggest" logoDomain="ubersuggest.com" />
                  <ToolLogo name="Jungle Scout" logoDomain="junglescout.com" />
                  <ToolLogo name="Canva" logoDomain="canva.com" />
                  <span className="text-sm text-[#464646]">And more…</span>
                </div>
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </>
  );
}

