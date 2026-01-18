"use client";

import Script from "next/script";
import React from "react";

function shouldEnableCrisp(hostname: string) {
  const h = (hostname || "").toLowerCase().replace(/:\d+$/, "");
  const bare = h.replace(/^www\./, "");
  // Enable only on main brand domains (avoid loading Crisp on custom domains).
  return bare === "ecomefficiency.com" || bare.endsWith(".ecomefficiency.com") || bare.endsWith("localhost");
}

export default function CrispScript() {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    try {
      setEnabled(shouldEnableCrisp(window.location.hostname));
    } catch {
      setEnabled(false);
    }
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script id="crisp-config" strategy="beforeInteractive">
        {`window.$crisp=[];window.CRISP_WEBSITE_ID="69577169-0422-43d4-a553-a7d4776fde6f";`}
      </Script>
      <Script id="crisp-loader" strategy="afterInteractive" src="https://client.crisp.chat/l.js" />
    </>
  );
}

