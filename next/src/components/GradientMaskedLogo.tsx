"use client";

import React from "react";

export default function GradientMaskedLogo({
  src,
  alt,
  main,
  accent,
  className,
}: {
  src: string;
  alt: string;
  main: string;
  accent: string;
  className?: string;
}) {
  // Works best with transparent PNG/SVG: we use the alpha as a mask and fill with a gradient.
  const url = `url("${src}")`;
  return (
    <div
      aria-label={alt}
      role="img"
      className={className || ""}
      style={{
        background: `linear-gradient(135deg, ${main}, ${accent})`,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}


