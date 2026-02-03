import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";

export const metadata: Metadata = {
  title: "30+ SEO tools included | Ecom Efficiency",
  description: "Browse the 30+ SEO tools included in Ecom Efficiency. Click any tool to see a full review, pricing, workflows, and best use cases.",
  alternates: { canonical: "/tools/seo" },
};

export default function SeoToolsPage() {
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white">30+ SEO Tools</h1>
          <p className="mt-4 text-gray-300 max-w-3xl">
            Included tools with short descriptions. Click any tool to open the full page (what it does, features, pricing, workflows, and alternatives).
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seoToolsCatalog.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/seo/${tool.slug}`}
              title={`${tool.name} SEO tool page`}
              className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
            >
              <div className="text-white font-semibold">{tool.name}</div>
              <div className="text-sm text-gray-400 mt-1">{tool.shortDescription}</div>
              <div className="mt-3 text-xs text-gray-300/90">{tool.pricing}</div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}


