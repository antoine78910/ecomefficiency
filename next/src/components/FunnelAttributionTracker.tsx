"use client";

import { useEffect, useRef } from "react";
import { trackFunnelEvent } from "@/lib/funnelTrackingClient";

function hasFunnelChannelCookie(): boolean {
  try {
    return /(?:^|;\s*)ee_funnel_ch=(instagram|tiktok)(?:;|$)/.test(document.cookie || "");
  } catch {
    return false;
  }
}

function hasUtmBioSource(): boolean {
  try {
    const src = new URLSearchParams(window.location.search).get("utm_source") || "";
    return src === "instagram" || src === "tiktok";
  } catch {
    return false;
  }
}

/**
 * Marks the first landing after a /try or /start redirect (cookies or utm_source).
 */
export default function FunnelAttributionTracker() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || sentRef.current) return;
    if (!hasFunnelChannelCookie() && !hasUtmBioSource()) return;

    const path = window.location.pathname || "/";
    if (path.startsWith("/admin") || path.startsWith("/app")) return;

    sentRef.current = true;
    void trackFunnelEvent("landing", { landingPath: path });
  }, []);

  return null;
}
