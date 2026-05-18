"use client";

import BlurText from "@/components/BlurText";
import NewHeroAnimatedWord from "@/components/NewHeroAnimatedWord";
import { BLUR_TEXT_PRESETS } from "@/lib/blurTextPresets";

const { titleDelay, stepDuration } = BLUR_TEXT_PRESETS.home;

const headingClass =
  "text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.06] tracking-normal justify-center";

export default function HomeHeroContent() {
  return (
    <>
      <div className="mb-4 leading-[1.06] tracking-normal">
        <BlurText
          as="div"
          text="Access the"
          delay={titleDelay - 30}
          stepDuration={stepDuration}
          animateBy="words"
          direction="top"
          className={`${headingClass} block`}
        />

        <div className="block">
          <span className="inline-flex items-baseline justify-center flex-wrap gap-x-2">
            <BlurText
              as="span"
              inline
              text="Most Powerful"
              delay={titleDelay}
              stepDuration={stepDuration}
              animateBy="words"
              direction="top"
              className={`${headingClass} !flex-nowrap`}
            />
            <NewHeroAnimatedWord />
            <BlurText
              as="span"
              inline
              text="Tools"
              delay={titleDelay + 40}
              stepDuration={stepDuration}
              animateBy="words"
              direction="top"
              className={`${headingClass} !flex-nowrap`}
            />
          </span>
        </div>

        <div className={`${headingClass} block`}>
          <BlurText
            as="span"
            inline
            text="for"
            delay={titleDelay + 70}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className="!flex-nowrap text-white"
          />
          {"\u00A0"}
          <BlurText
            as="span"
            inline
            text="99% OFF"
            delay={titleDelay + 90}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className="!flex-nowrap text-purple-400"
          />
          {"\u00A0"}
          <BlurText
            as="span"
            inline
            text="in one click"
            delay={titleDelay + 110}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className="!flex-nowrap text-white"
          />
        </div>
      </div>

      <p className="text-xl text-gray-400 mb-6 md:mb-8 max-w-3xl mx-auto">
        Boost your productivity while minimizing your costs
      </p>
    </>
  );
}
