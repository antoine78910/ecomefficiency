"use client";
import React from "react";

export default function AuthHashRedirector() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (/access_token=|refresh_token=/.test(hash)) {
      if (!window.location.pathname.startsWith('/app')) {
        // Redirect to /app while preserving the auth hash for Supabase to process
        window.location.replace(`/app${hash}`);
      }
    }
  }, []);
  return null;
}


