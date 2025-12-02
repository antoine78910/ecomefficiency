"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Conditionally loads DataFast tracking script only on the main domain
 * Prevents 403 errors on subdomains like tools.ecomefficiency.com
 */
export default function DataFastScript() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Only load DataFast on the main domain, not subdomains
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      // Load only on exact match or localhost (for development)
      const isMainDomain = 
        hostname === "ecomefficiency.com" || 
        hostname === "www.ecomefficiency.com" ||
        hostname === "localhost" ||
        hostname === "127.0.0.1";
      setShouldLoad(isMainDomain);

      // Suppress DataFast console errors on subdomains
      // This handles cases where the script might have been cached or loaded previously
      if (!isMainDomain) {
        const originalConsoleError = console.error;
        const errorInterceptor = (...args: any[]) => {
          const message = String(args[0] || '');
          // Suppress DataFast 403/pageview errors on subdomains
          if (message.includes('DataFast') && 
              (message.includes('403') || 
               message.includes('Failed to track pageview') ||
               message.includes('HTTP 403'))) {
            return; // Suppress the error silently
          }
          originalConsoleError.apply(console, args);
        };

        console.error = errorInterceptor;

        return () => {
          console.error = originalConsoleError;
        };
      }
    }
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Script
      id="datafast"
      defer
      data-website-id="68b204c706eb977058661627"
      data-domain="ecomefficiency.com"
      src="https://datafa.st/js/script.js"
      strategy="afterInteractive"
      onError={() => {
        // Script load errors are handled silently
      }}
    />
  );
}

