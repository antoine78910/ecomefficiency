"use client";

import * as React from "react";
import Script from "next/script";

type Tool = {
  name: string;
  description: string;
  href: string;
  imageSrc: string; // from /tools-images/*
  badge?: { label: string; tone?: "blue" | "orange" };
};

const TOOLS: Tool[] = [
  {
    name: "+30 SEO Tools",
    description: "",
    href: "https://rankerfox.com/login/",
    imageSrc: "/tools-images/seo.png",
  },
  {
    name: "Flair AI",
    description: "An AI-powered visual editor for product photography.",
    href: "https://app.flair.ai/explore",
    imageSrc: "/tools-images/flair.png",
  },
  {
    name: "Chat GPT Pro",
    description: "Chat helps you answer questions, write texts, provide advice and automate conversations.",
    href: "https://chatgpt.com/",
    imageSrc: "/tools-images/gpt.png",
  },
  {
    name: "Midjourney",
    description: "AI-driven platform that generates high-quality images from text prompts.",
    href: "https://www.midjourney.com/explore?tab=top",
    imageSrc: "/tools-images/mid.png",
  },
  {
    name: "Exploding Topics",
    description: "Tracks and identifies emerging trends using search data and online insights.",
    href: "https://www.semrush.com/app/exploding-topics/",
    imageSrc: "/tools-images/exp.png",
  },
  {
    name: "Pipiads",
    description: "The largest TikTok & Facebook ad library and powerful ad spy.",
    href: "https://www.pipiads.com/login",
    imageSrc: "/tools-images/pipi.png",
  },
  {
    name: "Kalodata",
    description: "Data analysis platform specialized in TikTok ecommerce.",
    href: "https://www.kalodata.com/login",
    imageSrc: "/tools-images/kalo.png",
  },
  {
    name: "Winning Hunter",
    description: "Spy tool for finding top-performing Facebook and TikTok ads.",
    href: "https://app.winninghunter.com/login",
    imageSrc: "/tools-images/win.png",
  },
  {
    name: "Capcut",
    description: "Create and edit stunning videos for social media.",
    href: "https://www.capcut.com/fr-fr/login",
    imageSrc: "/tools-images/cap.png",
  },
  {
    name: "SendShort",
    description: "AI tool for automatically generating and translating video subtitles.",
    href: "https://app.sendshort.ai/en/home",
    imageSrc: "/tools-images/send.png",
  },
  {
    name: "Helium 10",
    description: "Amazon seller tools for product research and optimization.",
    href: "https://noxtools.com/secure/page/Helium10",
    imageSrc: "/tools-images/h.png",
  },
  {
    name: "Dropship.io",
    description: "All-in-one Shopify tool to find winning products and track competitors.",
    href: "https://app.dropship.io/login",
    imageSrc: "/tools-images/dropship.png",
  },
  {
    name: "Shophunter",
    description: "Sales Tracker Spy & Product Research Tool. Spy on Competitor Sales.",
    href: "https://app.shophunter.io/login",
    imageSrc: "/tools-images/shophunter.png",
  },
  {
    name: "Atria",
    description: "Discover winning products, ad creatives, store funnels, and market insights.",
    href: "https://app.tryatria.com/login",
    imageSrc: "/tools-images/atria.png",
  },
  {
    name: "ForePlay",
    description: "Save ads, build briefs and produce high converting Facebook & TikTok ads.",
    href: "https://app.foreplay.co/login",
    imageSrc: "/tools-images/foreplay.png",
  },
  {
    name: "ElevenLabs",
    description: "AI-powered voice synthesis technology that creates realistic speech.",
    href: "https://elevenlabs.io/app/sign-in",
    imageSrc: "/tools-images/11.png",
  },
  {
    name: "Vmake",
    description: "AI talking-head videos, background removal, subtitles, upscaling.",
    href: "https://vmake.ai/workspace",
    imageSrc: "/tools-images/vmake.png",
  },
];

function ToolImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) {
    return (
      <div
        aria-hidden="true"
        className="w-[180px] h-[180px] rounded-lg bg-black/5 border border-black/10 flex items-center justify-center"
        title={alt}
      >
        <span className="text-4xl font-black text-black/50">{alt.trim().slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setErrored(true)} />;
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

      <div className="tools-grid mx-auto max-w-[1600px] grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group relative bg-white rounded-[10px] p-5 no-underline",
              "border border-black shadow-[0_4px_8px_rgba(0,0,0,0.1),0_6px_20px_rgba(0,0,0,0.2)]",
              "transition-transform transition-shadow duration-300",
              "hover:-translate-y-2.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.4)] hover:border-black/70",
              "aspect-square flex flex-col items-center text-center",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
            ].join(" ")}
          >
            {tool.badge ? (
              <div className="absolute top-3 right-3">
                <Badge label={tool.badge.label} tone={tool.badge.tone} />
              </div>
            ) : null}

            <div className="mb-2">
              <ToolImage src={tool.imageSrc} alt={tool.name} className="w-[180px] h-[180px] object-contain" />
            </div>

            <div className={["text-2xl font-extrabold mb-2 text-[#111] text-left self-stretch", montserratClassName].join(" ")}>{tool.name}</div>

            {tool.name === "+30 SEO Tools" ? (
              <div className="mt-2">
                <div className={["text-sm text-[#464646] mb-2", openSansClassName].join(" ")}>Includes:</div>
                <div className="flex flex-wrap justify-center items-center gap-2">
                  <ToolImage src="/tools-images/sem.png" alt="Semrush" className="w-10 h-10 object-contain" />
                  <ToolImage src="/tools-images/uber.png" alt="Ubersuggest" className="w-10 h-10 object-contain" />
                  <ToolImage src="/tools-images/js.png" alt="JungleScout" className="w-10 h-10 object-contain" />
                  <ToolImage src="/tools-images/canv.png" alt="Canva" className="w-10 h-10 object-contain" />
                </div>
                <div className={["text-sm text-[#464646] mt-2", openSansClassName].join(" ")}>And more ...</div>
              </div>
            ) : (
              <div className={["text-sm text-[#464646] leading-relaxed", openSansClassName].join(" ")}>{tool.description}</div>
            )}
          </a>
        ))}
      </div>
    </>
  );
}

