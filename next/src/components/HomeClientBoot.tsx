"use client";

import dynamic from "next/dynamic";

// Defer non-critical client logic to reduce initial JS + TBT
const AutoRedirectToApp = dynamic(() => import("@/components/AutoRedirectToApp"), { ssr: false });
const AuthHashRedirector = dynamic(() => import("@/components/AuthHashRedirector"), { ssr: false });

export default function HomeClientBoot() {
  return (
    <>
      <AutoRedirectToApp />
      <AuthHashRedirector />
    </>
  );
}

