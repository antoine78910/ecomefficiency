"use client";

import React from "react";
import AppTopNav from "@/components/AppTopNav";
import App from "@/screens/App";

export default function DomainAppClient({
  title,
  logoUrl,
  slug,
  colors,
  preview,
}: {
  title: string;
  logoUrl?: string;
  slug: string;
  colors?: { main?: string; accent?: string };
  preview?: boolean;
}) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__wl_partner_slug = slug;
    (window as any).__wl_main = colors?.main || "";
    (window as any).__wl_accent = colors?.accent || "";
  }, [slug, colors?.main, colors?.accent]);

  return (
    <div className="min-h-screen bg-black">
      <AppTopNav
        brand={{
          title,
          logoUrl,
          signInPath: "/signin",
        }}
      />
      <App showAffiliateCta={false} partnerSlug={slug} brandColors={colors} preview={preview} />
    </div>
  );
}

