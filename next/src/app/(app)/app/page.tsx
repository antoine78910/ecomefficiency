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
        
        // Check for OAuth errors first
        let url: URL;
        try {
          url = new URL(window.location.href);
        } catch (e) {
          // Invalid URL, skip processing
          setReady(true);
          return;
        }
        
        const oauthError = url.searchParams.get('error');
        const oauthErrorDescription = url.searchParams.get('error_description');
        
        if (oauthError) {
          // Handle OAuth errors (e.g., access_denied, user cancelled)
          console.warn('[AppPage] OAuth error:', oauthError, oauthErrorDescription);
          // Clean URL to remove error parameters
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('error');
            cleanUrl.searchParams.delete('error_description');
            cleanUrl.hash = '';
            history.replaceState(null, '', cleanUrl.toString());
          } catch {}
          // Redirect to sign-in page with error message
          try {
            const signInUrl = new URL('/sign-in', window.location.origin);
            signInUrl.searchParams.set('error', 'oauth_cancelled');
            window.location.href = signInUrl.toString();
            return;
          } catch {
            window.location.href = '/sign-in';
            return;
          }
        }
        
        const hash = window.location.hash || '';
        const m = hash.match(/access_token=([^&]+).*refresh_token=([^&]+)/);
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
            // if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
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
            // if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
          } catch {}
          // Clean URL (remove code/state)
          try { history.replaceState(null, '', window.location.pathname); } catch {}
        } else if (just) {
          // As a last-resort fallback: after being redirected with ?just=1 and session already present
          try {
            const { data } = await supabase.auth.getUser();
            const email = data.user?.email;
            const userId = data.user?.id;
            // if (email || userId) await postGoal('complete_signup', { ...(email?{email:String(email)}:{}), ...(userId?{user_id:String(userId)}:{}) });
          } catch {}
        } else {
          // Final safeguard removed
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


