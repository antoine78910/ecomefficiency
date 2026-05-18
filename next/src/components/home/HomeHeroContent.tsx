"use client";

import BlurText from "@/components/BlurText";
import NewHeroAnimatedWord from "@/components/NewHeroAnimatedWord";
import { BLUR_TEXT_PRESETS } from "@/lib/blurTextPresets";

const { titleDelay, subtitleDelay, stepDuration } = BLUR_TEXT_PRESETS.home;

const headingClass =
  "text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.06] tracking-normal justify-center";

export default function HomeHeroContent() {
  return (
    <>
      <div className="mb-4 space-y-1">
        <BlurText
          as="p"
          text="Access the"
          delay={titleDelay - 40}
          stepDuration={stepDuration}
          animateBy="words"
          direction="top"
          className={headingClass}
        />

        <div className="flex flex-wrap items-baseline justify-center gap-x-2">
          <BlurText
            as="span"
            text="Most Powerful"
            delay={titleDelay}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className={`${headingClass} inline-flex`}
          />
          <NewHeroAnimatedWord />
          <BlurText
            as="span"
            text="Tools"
            delay={titleDelay + 60}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className={`${headingClass} inline-flex`}
          />
        </div>

        <BlurText
          as="p"
          text="for 99% OFF in one click"
          delay={titleDelay + 100}
          stepDuration={stepDuration}
          animateBy="words"
          direction="top"
          className={`${headingClass} text-purple-400`}
        />
      </div>

      <BlurText
        as="p"
        text="Boost your productivity while minimizing your costs"
        delay={subtitleDelay}
        stepDuration={stepDuration}
        animateBy="words"
        direction="top"
        className="text-xl text-gray-400 mb-6 md:mb-8 max-w-3xl mx-auto justify-center"
      />
    </>
  );
}
