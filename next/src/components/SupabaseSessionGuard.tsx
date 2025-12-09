"use client";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guards against stale/invalid Supabase refresh tokens.
 * If the refresh token is invalid/already used, we clear the local session and reload
 * to force a clean auth flow, preventing noisy console errors.
 */
export default function SupabaseSessionGuard() {
  useEffect(() => {
    let cancelled = false;
    const STORAGE_KEY = "ecom-efficiency-auth";

    const clearSession = async () => {
      try {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      } catch {}
    };

    const checkSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error && /invalid refresh token/i.test(error.message) && /already used/i.test(error.message)) {
          await clearSession();
          // Reload without hash to restart a clean flow
          try {
            const url = window.location.pathname + window.location.search;
            window.location.replace(url);
          } catch {
            window.location.reload();
          }
        }
      } catch {
        // ignore
      }
    };

    // Initial check
    checkSession();

    // Also listen to auth changes; if session disappears unexpectedly, re-check
    const { data: listener } = supabase.auth.onAuthStateChange((_event, _session) => {
      // no-op; we rely on the initial check, but keep subscription for potential future extension
      // (could inspect events for errors if supabase-js exposes them)
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}

