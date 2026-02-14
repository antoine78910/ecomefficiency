import type { Metadata } from "next";

import ProToolsGrid from "./proToolsGrid";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.ecomefficiency.com"),
  title: "Ecom Efficiency Tools",
  description: "Ecom Efficiency pro tools hub.",
  alternates: { canonical: "/pro" },
  openGraph: {
    title: "Ecom Efficiency Tools",
    description: "Ecom Efficiency pro tools hub.",
    url: "/pro",
    type: "website",
  },
};

export default function ProToolsHubPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#ffffff",
        }}
      />

      <main className="relative z-10 px-4 pb-10">
        <h1 className="text-center font-black text-[#333] mb-6 mt-[50px] text-[40px]" style={{ fontFamily: "'Kanit', sans-serif" }}>
          Ecom Efficiency
        </h1>
        <ProToolsGrid />
      </main>
    </div>
  );
}

