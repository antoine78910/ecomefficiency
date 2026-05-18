"use client";

import BlurText from "@/components/BlurText";

export default function PartnersLpHero() {
  return (
    <div className="max-w-4xl">
      <BlurText
        as="p"
        text="You focus on marketing & community. We handle everything painful."
        delay={60}
        animateBy="words"
        direction="top"
        className="text-sm text-purple-200/90"
      />

      <div className="mt-4 space-y-1">
        <BlurText
          as="h1"
          text="Launch Your Own SaaS."
          delay={80}
          animateBy="words"
          direction="top"
          className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-normal text-white"
        />
        <BlurText
          as="h1"
          text="Without Building One."
          delay={120}
          animateBy="words"
          direction="top"
          className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-normal text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)]"
        />
      </div>

      <BlurText
        as="p"
        text="White-label a fully operational SaaS with 50+ premium e-commerce & AI tools, under your brand, your Stripe, your rules."
        delay={90}
        animateBy="words"
        direction="top"
        className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl"
      />

      <BlurText
        as="p"
        text="Used by communities, agencies & creators with thousands of users."
        delay={100}
        animateBy="words"
        direction="top"
        className="mt-4 text-sm text-gray-400"
      />
    </div>
  );
}
