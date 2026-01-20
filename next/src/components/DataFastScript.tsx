"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * Conditionally loads DataFast tracking script on selected domains/subdomains.
 * We intentionally avoid loading it on some subdomains (e.g. tools.*) and on custom white-label domains
 * to prevent 403 errors and unwanted cross-domain tracking.
 */
export default function DataFastScript() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = (window.location.hostname || "").toLowerCase().replace(/:\d+$/, "");
      const bare = hostname.replace(/^www\./, "");

      // Track the main marketing site + the app + the partners portal.
      // Do NOT track tools.* (historically returns 403) and do NOT track custom white-label domains.
      const isProdRoot = bare === "ecomefficiency.com";
      const isAppSubdomain = bare === "app.ecomefficiency.com";
      const isPartnersSubdomain = bare === "partners.ecomefficiency.com";
      const isLocal = bare === "localhost" || bare === "127.0.0.1";

      const isTrackableDomain = isProdRoot || isAppSubdomain || isPartnersSubdomain || isLocal;
      setShouldLoad(isTrackableDomain);

      // Suppress DataFast console errors
      // Always suppress HTTP 0 errors (network failures) on all domains
      // On subdomains, also suppress 403 errors
        const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
        const errorInterceptor = (...args: any[]) => {
          const message = String(args[0] || '');
        if (message.includes('DataFast')) {
          // Always suppress HTTP 0 errors (network failures)
          if (message.includes('HTTP 0') || 
               message.includes('Failed to track pageview') ||
              message.includes('Failed to track custom')) {
            return; // Suppress network failure errors silently
          }
          // On subdomains, also suppress 403 errors
          if (!isTrackableDomain && (message.includes('403') || message.includes('HTTP 403'))) {
            return; // Suppress 403 errors on subdomains
          }
          }
          originalConsoleError.apply(console, args);
        };
      
      const warnInterceptor = (...args: any[]) => {
        const message = String(args[0] || '');
        // Suppress DataFast warnings about HTTP 0
        if (message.includes('DataFast') && message.includes('HTTP 0')) {
          return; // Suppress the warning silently
        }
        originalConsoleWarn.apply(console, args);
      };

        console.error = errorInterceptor;
      console.warn = warnInterceptor;

        return () => {
          console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        };
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

