"use client";
import React from "react";
import Dashboard from "@/screens/App";
import { supabase } from "@/integrations/supabase/client";

export default function AppPage() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') { setReady(true); return; }
        const hash = window.location.hash || '';
        const m = hash.match(/access_token=([^&]+).*refresh_token=([^&]+)/);
        if (m && m[1] && m[2]) {
          // Set Supabase session on app domain from tokens passed in hash
          try {
            await supabase.auth.setSession({ access_token: decodeURIComponent(m[1]), refresh_token: decodeURIComponent(m[2]) });
          } catch {}
          // Clean URL to remove tokens
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="text-gray-300 text-sm">Loading your workspace…</div>
      </div>
    );
  }
  return <Dashboard />;
}


