import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

export const metadata: Metadata = {
  title: "Alternatives to tool bundles for ecommerce | Ecom Efficiency",
  description:
    "Honest, reader-first comparisons of popular SaaS bundles—ToolSuite and SpyCrew alternatives for dropshippers and ecommerce teams. Pricing, features, and who each option fits.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    title: "Alternatives to tool bundles for ecommerce | Ecom Efficiency",
    description:
      "Honest comparison pages for ecommerce teams comparing bundled tool access. ToolSuite vs Ecom Efficiency, SpyCrew vs Ecom Efficiency.",
    url: "/alternatives",
    type: "website",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency" }],
  },
};

export default function AlternativesIndexPage() {
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />
      <main className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Alternatives for ecommerce tool bundles</h1>
        <p className="text-lg text-gray-300 mb-8">
          These pages are written for operators—not hype. We compare popular bundled access so you can pick the right model
          (price, tool mix, and how the product evolves). Always verify the latest pricing and inclusions on any provider
          you consider.
        </p>
        <ul className="space-y-4">
          <li>
            <Link
              href="/alternatives/toolsuite"
              className="text-purple-200 hover:text-white underline underline-offset-4 text-lg font-medium"
              title="ToolSuite alternative: comparison with Ecom Efficiency"
            >
              ToolSuite alternative (vs Ecom Efficiency)
            </Link>
            <p className="text-sm text-gray-400 mt-1">
              For searches like <span className="text-gray-300">toolsuite</span>, <span className="text-gray-300">ToolSuite
              Pro</span>, <span className="text-gray-300">ToolSuite AI</span>, <span className="text-gray-300">ToolSuite
              review</span>, and <span className="text-gray-300">ToolSuite VIP</span> access.
            </p>
          </li>
          <li>
            <Link
              href="/alternatives/spycrew"
              className="text-purple-200 hover:text-white underline underline-offset-4 text-lg font-medium"
              title="SpyCrew alternative: comparison with Ecom Efficiency"
            >
              SpyCrew alternative (vs Ecom Efficiency)
            </Link>
            <p className="text-sm text-gray-400 mt-1">
              For searches like <span className="text-gray-300">spycrew</span>, <span className="text-gray-300">SpyCrew AI</span>,{" "}
              <span className="text-gray-300">SpyCrew browser</span>, and <span className="text-gray-300">SpyCrew review</span>.
            </p>
          </li>
        </ul>
        <div className="mt-10">
          <Link href="/tools" className="text-sm text-gray-400 hover:text-white" title="Browse all tools">
            ← Back to all tools
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
