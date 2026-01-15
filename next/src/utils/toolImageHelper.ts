import { logoDomainMap } from "@/data/carouselTools";

/**
 * Get the image URL for a tool icon.
 * Priority:
 * 1. /tools-images/{toolName}.png (if exists)
 * 2. /tools-logos/{toolName}.png (fallback)
 * 3. Clearbit logo (if domain mapping exists)
 * 4. /placeholder.svg (final fallback)
 */
export function getToolImageUrl(toolName: string, customIconPath?: string): string {
  // If a custom icon path is provided and it starts with '/', use it directly
  if (customIconPath?.startsWith('/')) {
    return customIconPath;
  }

  // Normalize tool name to filename format (lowercase, replace spaces/special chars)
  const normalizedName = toolName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/&/g, '')
    .replace(/[^a-z0-9]/g, '');

  // Try /tools-images/ first
  const toolsImagesPath = `/tools-images/${normalizedName}.png`;
  
  // Fallback to /tools-logos/
  const toolsLogosPath = `/tools-logos/${normalizedName}.png`;

  // Return tools-images path (browser will handle 404 and trigger onError)
  // The component's onError handler will then try the fallback
  return toolsImagesPath;
}

/**
 * Get fallback image URL when primary image fails to load.
 */
export function getToolImageFallback(toolName: string, customIconPath?: string): string {
  // If custom path was provided, try /tools-logos/ version
  if (customIconPath?.startsWith('/tools-logos/')) {
    return customIconPath;
  }

  const normalizedName = toolName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/&/g, '')
    .replace(/[^a-z0-9]/g, '');

  // Try /tools-logos/ as first fallback
  const toolsLogosPath = `/tools-logos/${normalizedName}.png`;

  // Then try Clearbit
  const domain = logoDomainMap[toolName.toLowerCase()];
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }

  // Final fallback
  return '/placeholder.svg';
}
