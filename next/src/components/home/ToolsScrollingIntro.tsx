"use client";

import BlurText from "@/components/BlurText";
import { BLUR_TEXT_PRESETS } from "@/lib/blurTextPresets";

const { titleDelay, subtitleDelay, stepDuration } = BLUR_TEXT_PRESETS.home;

type ToolsScrollingIntroProps = {
  variant: "mobile-title" | "desktop" | "mobile-body";
};

export default function ToolsScrollingIntro({ variant }: ToolsScrollingIntroProps) {
  if (variant === "mobile-title") {
    return (
      <BlurText
        as="h2"
        text="The only subscription You'll ever need"
        delay={titleDelay}
        stepDuration={stepDuration}
        animateBy="words"
        direction="top"
        className="text-3xl font-bold text-white mb-2"
      />
    );
  }

  if (variant === "mobile-body") {
    return (
      <BlurText
        as="p"
        text="Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO & Spy tools—without paying for them individually."
        delay={subtitleDelay}
        stepDuration={stepDuration}
        animateBy="words"
        direction="top"
        className="text-base text-gray-400"
      />
    );
  }

  return (
    <>
      <BlurText
        as="h2"
        text="The only subscription You'll ever need"
        delay={titleDelay}
        stepDuration={stepDuration}
        animateBy="words"
        direction="top"
        className="text-4xl md:text-5xl font-bold text-white mb-4"
      />
      <BlurText
        as="p"
        text="Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO & Spy tools—without paying for them individually."
        delay={subtitleDelay}
        stepDuration={stepDuration}
        animateBy="words"
        direction="top"
        className="text-xl text-gray-400 max-w-2xl"
      />
    </>
  );
}
