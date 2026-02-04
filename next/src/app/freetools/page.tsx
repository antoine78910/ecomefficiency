import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

const CANONICAL = "/freetools";

export const metadata: Metadata = {
  title: "Free tools for ecommerce",
  description:
    "Free ecommerce tools by Ecom Efficiency. Use calculators and utilities built for dropshippers and ecom teams to make better decisions faster.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Free tools for ecommerce",
    description: "Free ecommerce calculators and utilities built for operators.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Free tools" }],
  },
};

const tools = [
  {
    slug: "break-even-roas-calculator",
    title: "Break even ROAS calculator",
    description: "Calculate break-even ROAS and max CPA using VAT, fees, shipping, and product cost.",
    primaryKeyword: "break even roas calculator",
  },
  {
    slug: "shopify-app-detector",
    title: "Shopify app detector",
    description: "Detect Shopify apps and the Shopify theme used by a store (best effort), including theme names like Dawn.",
    primaryKeyword: "shopify app detector",
  },
  {
    slug: "customer-lifetime-value-calculator",
    title: "Customer lifetime value calculator",
    description: "Estimate customer LTV, LTV:CAC ratio, and net profit per customer after marketing costs.",
    primaryKeyword: "customer lifetime value calculator",
  },
] as const;

export default function FreeToolsPage() {
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <header className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs text-purple-200">
            Free tools
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white">Free tools for ecommerce and dropshipping</h1>
          <p className="mt-4 text-gray-300 leading-relaxed">
            Simple, fast, and practical tools you can use right away. Each tool is designed for ecommerce operators who want clear numbers and better
            decisions, without guesswork.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.slug}
              href={`/freetools/${t.slug}`}
              title={t.title}
              className="rounded-2xl border border-white/10 bg-gray-900/20 p-5 hover:border-purple-500/30 transition-colors"
            >
              <div className="text-white font-semibold">{t.title}</div>
              <div className="text-sm text-gray-400 mt-2">{t.description}</div>
              <div className="mt-4 text-[11px] text-gray-500">
                Primary keyword: <span className="text-gray-300">{t.primaryKeyword}</span>
              </div>
            </Link>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}

