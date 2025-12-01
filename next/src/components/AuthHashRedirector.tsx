"use client";
import React from "react";

export default function AuthHashRedirector() {
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      // Check if user just completed OAuth (has ?just=1 or ?code=... from Google)
      let url: URL;
      try {
        url = new URL(window.location.href);
      } catch (e) {
        // Invalid URL, skip processing
        return;
      }
      
      const justParam = url.searchParams.get('just');
      const code = url.searchParams.get('code');
      const hash = window.location.hash || '';
      
      if (justParam === '1' || code) {
        // Redirect to app subdomain after OAuth
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (!hostname) return; // Safety check
        
        // Only include port if it's not the default port for the protocol
        const shouldIncludePort = port && 
          !((protocol === 'https:' && port === '443') || 
            (protocol === 'http:' && port === '80'));
        
        let appUrl: string;
        try {
          if (hostname.startsWith('app.')) {
            // Already on app, no redirect needed
            return;
          } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            appUrl = `${protocol}//app.localhost${shouldIncludePort ? `:${port}` : ''}/`;
          } else {
            const cleanHost = hostname.replace(/^www\./, '');
            appUrl = `${protocol}//app.${cleanHost}${shouldIncludePort ? `:${port}` : ''}/`;
          }
          
          // Validate the URL before using it
          const testUrl = new URL(appUrl);
          if (!testUrl.hostname || !testUrl.protocol) {
            throw new Error('Invalid redirect URL constructed');
          }
        } catch (urlError) {
          // Skip redirect if URL construction fails
          console.error('[AuthHashRedirector] Failed to construct redirect URL:', urlError);
          return;
        }
        
        // Preserve hash and code for session exchange
        const fullUrl = `${appUrl}${url.search}${hash}`;
        try {
          // Final validation before redirect
          new URL(fullUrl);
          window.location.href = fullUrl;
        } catch {
          console.error('[AuthHashRedirector] Invalid final redirect URL');
        }
        return;
      }
      
      if (/access_token=|refresh_token=/.test(hash)) {
        // If we have auth tokens in hash but NOT on app subdomain, redirect to app
        const hostname = window.location.hostname;
        
        if (!hostname) return; // Safety check
        
        if (hostname.startsWith('app.')) {
          // Already on app subdomain, let Supabase client parse the hash
          return;
        }
        
        // Redirect to app subdomain with the tokens
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // Only include port if it's not the default port for the protocol
        const shouldIncludePort = port && 
          !((protocol === 'https:' && port === '443') || 
            (protocol === 'http:' && port === '80'));
        
        let appUrl: string;
        try {
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            appUrl = `${protocol}//app.localhost${shouldIncludePort ? `:${port}` : ''}/`;
          } else {
            const cleanHost = hostname.replace(/^www\./, '');
            appUrl = `${protocol}//app.${cleanHost}${shouldIncludePort ? `:${port}` : ''}/`;
          }
          
          // Validate the URL before using it
          const testUrl = new URL(appUrl);
          if (!testUrl.hostname || !testUrl.protocol) {
            throw new Error('Invalid redirect URL constructed');
          }
        } catch (urlError) {
          // Skip redirect if URL construction fails
          console.error('[AuthHashRedirector] Failed to construct redirect URL:', urlError);
          return;
        }
        
        const redirectUrl = `${appUrl}${hash}`;
        try {
          // Final validation before redirect
          new URL(redirectUrl);
          window.location.href = redirectUrl;
        } catch {
          console.error('[AuthHashRedirector] Invalid final redirect URL');
        }
      }
    } catch (error) {
      // Silently handle any errors to prevent console errors
      // This component should not break the page if something goes wrong
    }
  }, []);
  return null;
}


