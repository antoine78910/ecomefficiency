"use client";

import BlurText from "@/components/BlurText";
import { BLUR_TEXT_PRESETS } from "@/lib/blurTextPresets";

export default function FaqSectionTitle() {
  const { titleDelay, stepDuration } = BLUR_TEXT_PRESETS.home;
  return (
    <BlurText
      as="h2"
      text="Frequently Asked Questions"
      delay={titleDelay}
      stepDuration={stepDuration}
      animateBy="words"
      direction="top"
      className="text-3xl md:text-4xl font-bold mb-12 text-center text-white justify-center"
    />
  );
}
