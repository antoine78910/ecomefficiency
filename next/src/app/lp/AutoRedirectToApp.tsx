"use client";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Component that automatically redirects authenticated users to /app
 * This prevents logged-in users from seeing the landing page
 */
export default function AutoRedirectToApp() {
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          console.log('[lp] User is authenticated, redirecting to /app');
          window.location.href = "/app";
        }
      } catch (error) {
        // Silently fail - user is not authenticated
        console.log('[lp] User not authenticated, staying on LP');
      }
    };

    checkAuthAndRedirect();
  }, []);

  return null;
}
