"use client";
import React from 'react';
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
  let initialSrc: string;
  if (icon.startsWith('/tools-images/')) {
    initialSrc = icon;
  } else if (icon.startsWith('/tools-logos/')) {
    // If it's tools-logos, try tools-images first
    initialSrc = icon.replace('/tools-logos/', '/tools-images/');
  } else if (icon.startsWith('/')) {
    initialSrc = icon;
  } else {
    // Try tools-images first
    initialSrc = `/tools-images/${normalizedName}.png`;
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget as HTMLImageElement;
    const currentSrc = target.src;
    const retryCount = parseInt((target as any).dataset.retryCount || '0', 10);

    // Fallback chain
    if (retryCount === 0) {
      // First fallback: try /tools-logos/
      const toolsLogosPath = `/tools-logos/${normalizedName}.png`;
      if (!currentSrc.includes('/tools-logos/')) {
        (target as any).dataset.retryCount = '1';
        target.src = toolsLogosPath;
        return;
      }
    }

    if (retryCount <= 1) {
      // Second fallback: try Clearbit
      const domain = logoDomainMap[toolName.toLowerCase()];
      if (domain && !currentSrc.includes('logo.clearbit.com')) {
        (target as any).dataset.retryCount = '2';
        target.src = `https://logo.clearbit.com/${domain}`;
        return;
      }
    }

    // Final fallback: placeholder
    if (!currentSrc.includes('/placeholder.svg')) {
      (target as any).dataset.retryCount = '3';
      target.src = '/placeholder.svg';
    }
  };

  return (
    <img
      src={initialSrc}
      alt={alt || toolName}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
}
