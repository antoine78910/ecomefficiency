"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, useMemo } from "react";

const buildKeyframes = (
  from: Record<string, unknown>,
  steps: Record<string, unknown>[]
) => {
  const keys = new Set([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);
  const keyframes: Record<string, unknown[]> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

type BlurTextAs = "p" | "h1" | "h2" | "h3" | "span";

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  as?: BlurTextAs;
  animateBy?: "words" | "chars";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, unknown>;
  animationTo?: Record<string, unknown>[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  /** Use inline-flex for embedding next to other inline elements (e.g. hero animated word). */
  inline?: boolean;
};

export default function BlurText({
  text = "",
  delay = 200,
  className = "",
  as: Tag = "p",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  inline = false,
}: BlurTextProps) {
  const elements =
    animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isInViewport = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh && rect.bottom > 0;
    };

    if (isInViewport()) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && ref.current) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  // `motion` typings are strict about keyframe/value shapes. We keep a permissive
  // runtime shape (filter/opacity/y) and cast to avoid TS rejecting valid targets.
  const fromSnapshot = (animationFrom ?? defaultFrom) as any;
  const toSnapshots = (animationTo ?? defaultTo) as any[];

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from(
    { length: stepCount },
    (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1))
  );

  return (
    <Tag
      ref={ref as never}
      className={`blur-text ${className} ${inline ? "inline-flex flex-wrap" : "flex flex-wrap"}`}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(
          fromSnapshot as Record<string, unknown>,
          toSnapshots as Record<string, unknown>[]
        ) as any;

        const spanTransition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            className="inline-block text-inherit will-change-[transform,filter,opacity]"
            key={index}
            initial={fromSnapshot as any}
            animate={(inView ? animateKeyframes : fromSnapshot) as any}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Tag>
  );
}
