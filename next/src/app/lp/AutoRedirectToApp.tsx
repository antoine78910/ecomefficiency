"use client";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Partners LP helper:
 * - Only runs on partners.* hosts
 * - If authenticated, redirect to partners dashboard (not /app)
 */
export default function AutoRedirectToApp() {
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Never run this on the main marketing domain (ecomefficiency.com) or other hosts.
        const host = (window.location.hostname || "").toLowerCase().replace(/^www\./, "");
        const isPartnersHost = host === "partners.localhost" || host.startsWith("partners.");
        if (!isPartnersHost) return;

        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          // partners portal uses /dashboard (we don't want /app to exist on partners.*)
          window.location.replace("/dashboard");
        }
      } catch (error) {
        // Silently fail - user is not authenticated
        // eslint-disable-next-line no-console
        console.log("[lp] User not authenticated, staying on LP");
      }
    };

    checkAuthAndRedirect();
  }, []);

  return null;
}
