"use client";

import React from "react";
import Dashboard from "@/screens/App";
import AppTopNav from "@/components/AppTopNav";

export default function DomainAppClient({
  title,
  logoUrl,
}: {
  title: string;
  logoUrl?: string;
}) {
  return (
    <div className="theme-app min-h-screen bg-black text-white flex">
      <main className="flex-1 flex flex-col min-h-screen">
        <AppTopNav brand={{ title, logoUrl, hideAffiliate: true, signInPath: "/signin" }} />
        <div className="flex-1">
          <Dashboard showAffiliateCta={false} />
        </div>
      </main>
    </div>
  );
}

