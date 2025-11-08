"use client";
import React from "react";
import Dashboard from "@/screens/App";
import { supabase } from "@/integrations/supabase/client";
import { postGoal } from "@/lib/analytics";

export default function AppPage() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') { setReady(true); return; }
        const hash = window.location.hash || '';
        const m = hash.match(/access_token=([^&]+).*refresh_token=([^&]+)/);
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const just = url.searchParams.get('just') === '1';
        if (m && m[1] && m[2]) {
          // Set Supabase session on app domain from tokens passed in hash
          try {
            await supabase.auth.setSession({ access_token: decodeURIComponent(m[1]), refresh_token: decodeURIComponent(m[2]) });
          } catch {}
          // Clean URL to remove tokens
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
          // Consider this a completed signup (OAuth flow)
          try {
            const { data } = await supabase.auth.getUser();
            const email = data.user?.email;
            const userId = data.user?.id;
            if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
          } catch {}
        } else if (code) {
          // Magic link/email verification flow: exchange code and mark complete_signup
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } catch {}
          try {
            const { data } = await supabase.auth.getUser();
            const email = data.user?.email;
            const userId = data.user?.id;
            if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
          } catch {}
          // Clean URL (remove code/state)
          try { history.replaceState(null, '', window.location.pathname); } catch {}
        } else if (just) {
          // As a last-resort fallback: after being redirected with ?just=1 and session already present
          try {
            const { data } = await supabase.auth.getUser();
            const email = data.user?.email;
            const userId = data.user?.id;
            if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
          } catch {}
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


