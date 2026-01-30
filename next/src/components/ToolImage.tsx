"use client";
import React from "react";
import Image from "next/image";
import { logoDomainMap } from "@/data/carouselTools";

interface ToolImageProps {
  toolName: string;
  icon: string;
  className?: string;
  alt?: string;
}

/**
 * Component that handles tool image loading with fallback chain:
 * 1. /tools-images/{name}.png
 * 2. /tools-logos/{name}.png
 * 3. Clearbit logo (if domain mapping exists)
 * 4. /placeholder.svg
 */
export default function ToolImage({ toolName, icon, className = "w-full h-full object-contain bg-black", alt }: ToolImageProps) {
  const normalizedName = toolName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/&/g, '')
    .replace(/[^a-z0-9]/g, '');

  // Determine initial src
  // For carousel, prioritize tools-logos (as per user request)
  let initialSrc: string;
  if (icon.startsWith('/tools-logos/')) {
    initialSrc = icon;
  } else if (icon.startsWith('/tools-images/')) {
    // If it's tools-images, try tools-logos first for carousel
    initialSrc = icon.replace('/tools-images/', '/tools-logos/');
  } else if (icon.startsWith('/')) {
    initialSrc = icon;
  } else {
    // Try tools-logos first for carousel
    initialSrc = `/tools-logos/${normalizedName}.png`;
  }

  const [src, setSrc] = React.useState<string>(initialSrc);
  const retryRef = React.useRef(0);

  // If toolName/icon changes, reset fallback chain.
  React.useEffect(() => {
    retryRef.current = 0;
    setSrc(initialSrc);
  }, [initialSrc]);

  const handleError = () => {
    const currentSrc = src;
    const retryCount = retryRef.current;

    // Fallback chain
    if (retryCount === 0) {
      // First fallback: try /tools-images/ (if we started with tools-logos)
      const toolsImagesPath = `/tools-images/${normalizedName}.png`;
      if (!currentSrc.includes("/tools-images/")) {
        retryRef.current = 1;
        setSrc(toolsImagesPath);
        return;
      }
    }

    if (retryCount <= 1) {
      // Second fallback: try Clearbit (rendered as plain <img/> below)
      const domain = logoDomainMap[toolName.toLowerCase()];
      if (domain && !currentSrc.includes("logo.clearbit.com")) {
        retryRef.current = 2;
        setSrc(`https://logo.clearbit.com/${domain}`);
        return;
      }
    }

    // Final fallback: placeholder
    if (!currentSrc.includes("/placeholder.svg")) {
      retryRef.current = 3;
      setSrc("/placeholder.svg");
    }
  };

  const isRemote = /^https?:\/\//.test(src);

  return (
    <div className="relative w-full h-full">
      {isRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || toolName}
          title={alt || toolName}
          className={className}
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <Image
          src={src}
          alt={alt || toolName}
          title={alt || toolName}
          fill
          className={className}
          sizes="(max-width: 768px) 96px, (max-width: 1024px) 128px, 160px"
          quality={70}
          onError={handleError}
        />
      )}
    </div>
  );
}
