"use client";
import React from "react";

export default function AuthHashRedirector() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (/access_token=|refresh_token=/.test(hash)) {
      // Do not force redirect to /app anymore; keep user on current path
      // Supabase client will parse the hash from the URL as-is.
    }
  }, []);
  return null;
}


