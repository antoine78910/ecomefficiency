"use client";
import React from "react";
import Dashboard from "@/screens/App";
import { supabase } from "@/integrations/supabase/client";

export default function AppPage() {
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const hasAuthHash = /access_token=|refresh_token=/.test(window.location.hash || '');
      if (!hasAuthHash) return;
      let cancelled = false;
      const clean = () => {
        const url = window.location.pathname + window.location.search;
        history.replaceState(null, '', url);
      };
      const waitForSession = async () => {
        const start = Date.now();
        while (!cancelled && Date.now() - start < 8000) {
          const { data } = await supabase.auth.getSession();
          if (data.session) { clean(); return; }
          await new Promise(r => setTimeout(r, 250));
        }
        // timeout fallback: still clean to avoid leaking tokens in URL
        if (!cancelled) clean();
      };
      waitForSession();
      return () => { cancelled = true; };
    } catch {}
  }, []);
  return <Dashboard />;
}


