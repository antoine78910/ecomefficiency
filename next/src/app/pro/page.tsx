import type { Metadata } from "next";
import { Kanit, Montserrat, Open_Sans } from "next/font/google";

import ProToolsGrid from "./proToolsGrid";

const kanit = Kanit({ subsets: ["latin"], weight: ["400", "700", "800", "900"] });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "600", "700"] });

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#f4f4f4",
          backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.10) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <main className="relative z-10 px-4 py-10">
        <h1
          className={[
            "text-center text-4xl font-black tracking-tight",
            "text-[#333] mb-8",
            kanit.className,
          ].join(" ")}
        >
          Ecom Efficiency
        </h1>
        <ProToolsGrid montserratClassName={montserrat.className} openSansClassName={openSans.className} />
      </main>
    </div>
  );
}

