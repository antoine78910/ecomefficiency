"use client";
import React from "react";
import Dashboard from "@/screens/App";

export default function AppPage() {
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        const clean = window.location.pathname + window.location.search;
        if (window.location.hash && window.location.pathname === '/app') {
          history.replaceState(null, '', clean);
        }
      }
    } catch {}
  }, []);
  return <Dashboard />;
}


