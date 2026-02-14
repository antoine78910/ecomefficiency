"use client";

import * as React from "react";
import Script from "next/script";

type Tool = {
  name: string;
  description: string;
  href: string;
  imageSrc: string; // primary: from /tools-images/*
  fallbackSrc?: string; // fallback: from /tools-logos/*
  badge?: { label: string; tone?: "blue" | "orange" };
};

const TOOLS: Tool[] = [
  {
    name: "+30 SEO Tools",
    description: "",
    href: "https://rankerfox.com/login/",
    imageSrc: "/tools-images/seo.png",
    fallbackSrc: "/tools-logos/seo.png",
  },
  {
    name: "Flair AI",
    description: "An AI-powered visual editor for product photography. Drag and drop to create high-quality ecommerce photoshoots in seconds.",
    href: "https://app.flair.ai/explore",
    imageSrc: "/tools-images/flair.png",
    fallbackSrc: "/tools-logos/flair.png",
  },
  {
    name: "Chat GPT Pro",
    description: "Chat helps you answer questions, write texts, provide advice and automate conversations in a variety of fields.",
    href: "https://chatgpt.com/",
    imageSrc: "/tools-images/gpt.png",
    fallbackSrc: "/tools-logos/chatgpt.png",
  },
  {
    name: "Midjourney",
    description:
      "MidJourney is an AI-driven platform that generates high-quality images from text prompts, enabling users to create unique visuals quickly",
    href: "https://www.midjourney.com/explore?tab=top",
    imageSrc: "/tools-images/mid.png",
    fallbackSrc: "/tools-logos/midjourney.png",
  },
  {
    name: "Exploding Topics",
    description: "Tracks and identifies emerging trends using search data and online insights",
    href: "https://www.semrush.com/app/exploding-topics/",
    imageSrc: "/tools-images/exp.png",
    fallbackSrc: "/tools-logos/exploding.png",
  },
  {
    name: "Pipiads",
    description:
      "The largest TikTok & Facebook ad library, and the most powerful tiktok ad spy, facebook adspy, tiktok shop data tool",
    href: "https://www.pipiads.com/login",
    imageSrc: "/tools-images/pipi.png",
    fallbackSrc: "/tools-logos/pipiads.png",
  },
  {
    name: "Kalodata",
    description: "Data analysis platform specialized in TikTok ecommerce.",
    href: "https://www.kalodata.com/login",
    imageSrc: "/tools-images/kalo.png",
    fallbackSrc: "/tools-logos/kalodata.png",
  },
  {
    name: "Winning Hunter",
    description: "Spy tool for finding top-performing Facebook and TikTok ads.",
    href: "https://app.winninghunter.com/login",
    imageSrc: "/tools-images/win.png",
    fallbackSrc: "/tools-logos/winninghunter.png",
  },
  {
    name: "Capcut",
    description:
      "Create and edit stunning videos for social media and personal projects using CapCut's intuitive interface and advanced editing features.",
    href: "https://www.capcut.com/fr-fr/login",
    imageSrc: "/tools-images/cap.png",
    fallbackSrc: "/tools-logos/capcut.png",
  },
  {
    name: "SendShort",
    description: "An AI tool for automatically generating and translating video subtitles",
    href: "https://app.sendshort.ai/en/home",
    imageSrc: "/tools-images/send.png",
    fallbackSrc: "/tools-logos/sendshort.png",
  },
  {
    name: "Helium 10",
    description: "Amazon seller tools for product research and optimization.",
    href: "https://noxtools.com/secure/page/Helium10",
    imageSrc: "/tools-images/h.png",
    fallbackSrc: "/tools-logos/helium10.png",
  },
  {
    name: "Dropship.io",
    description: "All-in-one Shopify tool to find winning products and track competitors with real-time sales and ad data.",
    href: "https://app.dropship.io/login",
    imageSrc: "/tools-images/dropship.png",
    fallbackSrc: "/tools-logos/dropship.png",
  },
  {
    name: "Shophunter",
    description: "Sales Tracker Spy & Product Research Tool. Spy on Competitor Sales.",
    href: "https://app.shophunter.io/login",
    imageSrc: "/tools-images/shophunter.png",
    fallbackSrc: "/tools-logos/shophunter.png",
  },
  {
    name: "Atria",
    description: "A tool to discover winning products, ad creatives, store funnels, and market insights — all in one place.",
    href: "https://app.tryatria.com/login",
    imageSrc: "/tools-images/atria.png",
    fallbackSrc: "/tools-logos/atria.png",
  },
  {
    name: "Heygen",
    description: "AI video creation platform to generate talking avatars, product demos, and multilingual videos from text in minutes.",
    href: "https://app.heygen.com/login",
    imageSrc: "/tools-images/heygen.png",
    fallbackSrc: "/tools-logos/heygen.png",
  },
  {
    name: "Fotor",
    description:
      "Create any image you want in real time with our AI image creator. Type your description and turn text into images and AI art",
    href: "https://www.fotor.com/fr/",
    imageSrc: "/tools-images/fotor.png",
    fallbackSrc: "/tools-logos/fotor.png",
  },
  {
    name: "ForePlay",
    description: "Save ads, build briefs and produce high converting Facebook & TikTok ads.",
    href: "https://app.foreplay.co/login",
    imageSrc: "/tools-images/foreplay.png",
    fallbackSrc: "/tools-logos/foreplay.png",
  },
  {
    name: "ElevenLabs",
    description:
      "AI-powered voice synthesis technology that creates realistic and customizable human-like speech for various applications",
    href: "https://elevenlabs.io/app/sign-in",
    imageSrc: "/tools-images/11.png",
    fallbackSrc: "/tools-logos/elevenlabs.png",
  },
  {
    name: "Runway",
    description: "AI-driven platform for creating, editing, and enhancing multimedia content, including images and videos.",
    href: "https://app.runwayml.com/login",
    imageSrc: "/tools-images/runway.png",
    fallbackSrc: "/tools-logos/runway.png",
  },
  {
    name: "Higgsfield",
    description: "AI tool for generating product images and videos.",
    href: "https://higgsfield.ai/auth/login",
    imageSrc: "/tools-images/higgsfield.png",
    fallbackSrc: "/tools-logos/higgsfield.png",
  },
  {
    name: "Vmake",
    description: "AI talking-head videos, background removal, subtitles, upscaling.",
    href: "https://vmake.ai/workspace",
    imageSrc: "/tools-images/vmake.png",
    fallbackSrc: "/tools-logos/vmake.png",
  },
  {
    name: "Freepik",
    description: "AI tools, smart features, and high-quality stock assets to design and create without ever leaving Freepik",
    href: "https://www.freepik.com/log-in?client_id=freepik&lang=en",
    imageSrc: "/tools-images/freepik.png",
    fallbackSrc: "https://logo.clearbit.com/freepik.com",
  },
  {
    name: "Turboscribe",
    description: "AI audio & video transcription, fast summaries, speaker detection, and export-ready text.",
    href: "https://turboscribe.ai/login",
    imageSrc: "/tools-images/turboscribe.png",
    fallbackSrc: "https://logo.clearbit.com/turboscribe.ai",
    badge: { label: "Newly Added !", tone: "blue" },
  },
];

function ToolImage({
  src,
  fallbackSrc,
  alt,
  className,
  errorContainerClassName,
  errorTextClassName,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className: string;
  errorContainerClassName?: string;
  errorTextClassName?: string;
}) {
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    setCurrentSrc(src);
    setErrored(false);
  }, [src]);

  if (errored) {
    return (
      <div
        aria-hidden="true"
        className={errorContainerClassName || "w-[180px] h-[180px] rounded-lg bg-black/5 border border-black/10 flex items-center justify-center"}
        title={alt}
      >
        <span className={errorTextClassName || "text-4xl font-black text-black/50"}>{alt.trim().slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        setErrored(true);
      }}
    />
  );
}

function Badge({ label, tone = "blue" }: { label: string; tone?: "blue" | "orange" }) {
  const cls = tone === "orange" ? "bg-orange-500 text-white" : "bg-blue-600 text-white";
  return <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export default function ProToolsGrid({
}: Record<string, never>) {
  return (
    <>
      <Script src="https://t.contentsquare.net/uxa/af705d190c606.js" strategy="afterInteractive" />

      <div className="tools-grid mx-auto max-w-[1600px] grid gap-5 p-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] xl:grid-cols-6">
        {TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group relative bg-white rounded-[10px] no-underline overflow-hidden",
              "border border-black shadow-[0_4px_8px_rgba(0,0,0,0.1),0_6px_20px_rgba(0,0,0,0.2)]",
              "transition-transform transition-shadow duration-300",
              "hover:-translate-y-2.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.4)] hover:border-black/70",
              // Slightly taller than wide (not perfectly square)
              "aspect-[6/7]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
            ].join(" ")}
          >
            <div className="absolute inset-0 p-5 flex flex-col">
            {tool.badge ? (
              <div className="absolute top-3 right-3">
                <Badge label={tool.badge.label} tone={tool.badge.tone} />
              </div>
            ) : null}

            {/* Top ~3/4: centered logo */}
            <div className="flex-[3] w-full flex items-center justify-center">
              <ToolImage
                src={tool.imageSrc}
                fallbackSrc={tool.fallbackSrc}
                alt={tool.name}
                className="w-full h-full max-w-[180px] max-h-[180px] object-contain"
              />
            </div>

            {/* Bottom: title then description */}
            <div className="flex-[1] w-full">
              <div
                className="text-[22px] font-bold mb-2 text-left"
                style={{ fontFamily: "'Montserrat', sans-serif", color: "#333333" }}
              >
                {tool.name}
              </div>

              {tool.name === "+30 SEO Tools" ? (
                <div>
                  <div className="text-sm mb-1" style={{ fontFamily: "'Open Sans', sans-serif", color: "#333333" }}>
                    Includes:
                  </div>
                  <div className="flex flex-wrap justify-center items-center gap-2">
                    <ToolImage
                      src="/tools-images/sem.png"
                      fallbackSrc="/tools-logos/semrush.png"
                      alt="Semrush"
                      className="w-[18px] h-[18px] object-contain"
                      errorContainerClassName="w-[18px] h-[18px] rounded-sm bg-black/5 border border-black/10 flex items-center justify-center"
                      errorTextClassName="text-[10px] font-black text-black/50 leading-none"
                    />
                    <ToolImage
                      src="/tools-images/uber.png"
                      fallbackSrc="/tools-logos/ubersuggest.png"
                      alt="Ubersuggest"
                      className="w-[18px] h-[18px] object-contain"
                      errorContainerClassName="w-[18px] h-[18px] rounded-sm bg-black/5 border border-black/10 flex items-center justify-center"
                      errorTextClassName="text-[10px] font-black text-black/50 leading-none"
                    />
                    <ToolImage
                      src="/tools-images/js.png"
                      fallbackSrc="/tools-logos/seo.png"
                      alt="JungleScout"
                      className="w-[18px] h-[18px] object-contain"
                      errorContainerClassName="w-[18px] h-[18px] rounded-sm bg-black/5 border border-black/10 flex items-center justify-center"
                      errorTextClassName="text-[10px] font-black text-black/50 leading-none"
                    />
                    <ToolImage
                      src="/tools-images/canv.png"
                      fallbackSrc="/tools-logos/canva.png"
                      alt="Canva"
                      className="w-[18px] h-[18px] object-contain"
                      errorContainerClassName="w-[18px] h-[18px] rounded-sm bg-black/5 border border-black/10 flex items-center justify-center"
                      errorTextClassName="text-[10px] font-black text-black/50 leading-none"
                    />
                  </div>
                  <div className="text-sm mt-2" style={{ fontFamily: "'Open Sans', sans-serif", color: "#333333" }}>
                    And more ...
                  </div>
                </div>
              ) : (
                <div className="text-sm leading-relaxed" style={{ fontFamily: "'Open Sans', sans-serif", color: "#333333" }}>
                  {tool.description}
                </div>
              )}
            </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

