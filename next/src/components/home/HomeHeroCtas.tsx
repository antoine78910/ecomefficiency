"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import BlurText from "@/components/BlurText";
import { BLUR_TEXT_PRESETS } from "@/lib/blurTextPresets";

const { titleDelay, stepDuration } = BLUR_TEXT_PRESETS.home;
const ctaDelay = titleDelay + 140;

export default function HomeHeroCtas() {
  return (
    <>
      <div className="flex flex-row flex-wrap gap-4 justify-center mb-6">
        <Link href="/sign-up">
          <button
            type="button"
            className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]"
          >
            <div className="relative overflow-hidden w-full text-center">
              <BlurText
                as="p"
                text="Get Started"
                delay={ctaDelay}
                stepDuration={stepDuration}
                animateBy="words"
                direction="top"
                className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap justify-center !flex-nowrap text-white"
              />
              <BlurText
                as="p"
                text="Get Started"
                delay={ctaDelay}
                stepDuration={stepDuration}
                animateBy="words"
                direction="top"
                className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap justify-center !flex-nowrap text-white"
              />
            </div>
          </button>
        </Link>
        <Link href="/tools">
          <button
            type="button"
            className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border border-white/20 text-white font-medium group w-[160px] h-[48px]"
          >
            <div className="flex items-center justify-center gap-2">
              <BlurText
                as="span"
                inline
                text="See tools"
                delay={ctaDelay + 30}
                stepDuration={stepDuration}
                animateBy="words"
                direction="top"
                className="!flex-nowrap text-white"
              />
              <ArrowRight className="w-4 h-4 shrink-0" />
            </div>
          </button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-12">
        <div className="flex items-center text-gray-300">
          <Check className="w-5 h-5 text-purple-400 mr-2 shrink-0" />
          <BlurText
            as="span"
            inline
            text="Access +50 SEO / SPY / AI tools"
            delay={ctaDelay + 60}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className="!flex-nowrap text-gray-300"
          />
        </div>
        <div className="flex items-center text-gray-300">
          <Check className="w-5 h-5 text-purple-400 mr-2 shrink-0" />
          <BlurText
            as="span"
            inline
            text="Save $4000+ every month"
            delay={ctaDelay + 90}
            stepDuration={stepDuration}
            animateBy="words"
            direction="top"
            className="!flex-nowrap text-gray-300"
          />
        </div>
      </div>
    </>
  );
}
