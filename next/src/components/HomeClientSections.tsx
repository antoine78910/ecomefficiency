"use client";

import dynamic from "next/dynamic";

// These sections are below the fold; load them client-side to reduce initial JS.
const ToolsScrollingSection = dynamic(() => import("@/components/ToolsScrollingSection"), { ssr: false });
const SavingsComparisonSection = dynamic(() => import("@/components/SavingsComparisonSection"), { ssr: false });

export default function HomeClientSections() {
  return (
    <>
      <ToolsScrollingSection />
      <SavingsComparisonSection />
    </>
  );
}

