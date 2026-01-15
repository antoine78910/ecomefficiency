"use client";

import React from "react";
import Dashboard from "@/screens/App";
import AppTopNav from "@/components/AppTopNav";

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
  const cssVars = {
    ["--wl-main" as any]: String(colors?.main || ""),
    ["--wl-accent" as any]: String(colors?.accent || ""),
  } as any;
  return (
    <div className="theme-app min-h-screen bg-black text-white flex" style={cssVars}>
      <main className="flex-1 flex flex-col min-h-screen">
        <AppTopNav brand={{ title, logoUrl, hideAffiliate: true, signInPath: "/signin" }} />
        <div className="flex-1">
          <Dashboard showAffiliateCta={false} partnerSlug={slug} brandColors={colors} preview={preview} />
        </div>
      </main>
    </div>
  );
}

