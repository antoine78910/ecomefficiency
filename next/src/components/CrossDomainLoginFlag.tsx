"use client";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Runs only on app.* pages (mounted from app/(app)/layout).
 * If a Supabase session exists, drops a cross-subdomain hint cookie so www.*
 * can redirect to app.* even without shared localStorage.
 */
export default function CrossDomainLoginFlag() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const session = data?.session;

        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        const isProd =
          /\.ecomefficiency\.com$/i.test(hostname) ||
          hostname === "ecomefficiency.com" ||
          hostname === "www.ecomefficiency.com";
        const domainAttr = isProd ? "; Domain=.ecomefficiency.com" : "";

        if (session) {
          // 7 jours de durée pour limiter les requêtes
          document.cookie = `ee_logged_in=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${domainAttr}`;
        } else {
          document.cookie = `ee_logged_in=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
        }
      } catch {
        // fail silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

