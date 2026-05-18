"use client";

import BlurText from "@/components/BlurText";
import { cn } from "@/lib/utils";

type LpSectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  titleDelay?: number;
  subtitleDelay?: number;
  centered?: boolean;
};

export default function LpSectionHeader({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  titleDelay = 70,
  subtitleDelay = 110,
  centered = false,
}: LpSectionHeaderProps) {
  return (
    <div className={cn(centered && "text-center", className)}>
      <BlurText
        as="h2"
        text={title}
        delay={titleDelay}
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
          delay={subtitleDelay}
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
