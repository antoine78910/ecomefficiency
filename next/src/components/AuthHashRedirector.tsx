"use client";
import React from "react";

export default function AuthHashRedirector() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if user just completed OAuth (has ?just=1 or ?code=... from Google)
    const url = new URL(window.location.href);
    const justParam = url.searchParams.get('just');
    const code = url.searchParams.get('code');
    const hash = window.location.hash || '';
    
    if (justParam === '1' || code) {
      // Redirect to app subdomain after OAuth
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      let appUrl;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        appUrl = `${protocol}//app.localhost${port}/`;
      } else if (hostname.startsWith('app.')) {
        // Already on app, no redirect needed
        return;
      } else {
        const cleanHost = hostname.replace(/^www\./, '');
        appUrl = `${protocol}//app.${cleanHost}${port}/`;
      }
      
      // Preserve hash and code for session exchange
      const fullUrl = `${appUrl}${url.search}${hash}`;
      window.location.href = fullUrl;
      return;
    }
    
    if (/access_token=|refresh_token=/.test(hash)) {
      // If we have auth tokens in hash but NOT on app subdomain, redirect to app
      const hostname = window.location.hostname;
      
      if (hostname.startsWith('app.')) {
        // Already on app subdomain, let Supabase client parse the hash
        return;
      }
      
      // Redirect to app subdomain with the tokens
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      let appUrl;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        appUrl = `${protocol}//app.localhost${port}/`;
      } else {
        const cleanHost = hostname.replace(/^www\./, '');
        appUrl = `${protocol}//app.${cleanHost}${port}/`;
      }
      
      window.location.href = `${appUrl}${hash}`;
    }
  }, []);
  return null;
}


