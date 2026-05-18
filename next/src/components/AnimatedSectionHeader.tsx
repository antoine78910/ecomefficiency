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
  centered?: boolean;
};

export default function AnimatedSectionHeader({
  title,
  subtitle,
  preset = "home",
  className,
  titleClassName,
  subtitleClassName,
  centered = false,
}: AnimatedSectionHeaderProps) {
  if (preset === "home") {
    return (
      <div className={cn(centered && "text-center", className)}>
        <h2
          className={cn(
            "text-3xl md:text-5xl font-bold text-white leading-tight",
            titleClassName
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={cn(
              "mt-4 text-gray-300",
              centered && "max-w-3xl mx-auto",
              subtitleClassName
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  }

  const p = BLUR_TEXT_PRESETS.lp;
  return (
    <div className={cn(centered && "text-center", className)}>
      <BlurText
        as="h2"
        text={title}
        delay={p.titleDelay}
        stepDuration={p.stepDuration}
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
          delay={p.subtitleDelay}
          stepDuration={p.stepDuration}
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
