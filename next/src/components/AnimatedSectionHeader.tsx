"use client";

import BlurText from "@/components/BlurText";
import { BLUR_TEXT_PRESETS, type BlurTextPreset } from "@/lib/blurTextPresets";
import { cn } from "@/lib/utils";

type AnimatedSectionHeaderProps = {
  title: string;
  subtitle?: string;
  preset?: BlurTextPreset;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  titleDelay?: number;
  subtitleDelay?: number;
  stepDuration?: number;
  centered?: boolean;
};

export default function AnimatedSectionHeader({
  title,
  subtitle,
  preset = "home",
  className,
  titleClassName,
  subtitleClassName,
  titleDelay,
  subtitleDelay,
  stepDuration,
  centered = false,
}: AnimatedSectionHeaderProps) {
  const p = BLUR_TEXT_PRESETS[preset];
  const titleMs = titleDelay ?? p.titleDelay;
  const subtitleMs = subtitleDelay ?? p.subtitleDelay;
  const stepSec = stepDuration ?? p.stepDuration;

  return (
    <div className={cn(centered && "text-center", className)}>
      <BlurText
        as="h2"
        text={title}
        delay={titleMs}
        stepDuration={stepSec}
        animateBy="words"
        direction="top"
        className={cn(
          "text-3xl md:text-5xl font-bold text-white leading-tight",
          centered && "justify-center",
          titleClassName
        )}
      />
      {subtitle ? (
        <BlurText
          as="p"
          text={subtitle}
          delay={subtitleMs}
          stepDuration={stepSec}
          animateBy="words"
          direction="top"
          className={cn(
            "mt-4 text-gray-300",
            centered && "justify-center max-w-3xl mx-auto",
            subtitleClassName
          )}
        />
      ) : null}
    </div>
  );
}


