import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

export const metadata: Metadata = {
  title: "Articles | Ecom Efficiency",
  description: "SEO guides and e-commerce playbooks from Ecom Efficiency.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "Articles | Ecom Efficiency",
    description: "SEO guides and e-commerce playbooks from Ecom Efficiency.",
    url: "/articles",
    type: "website",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency Articles" }],
  },
};

const articles = [
  {
    slug: "dropship-io-2026-product-research",
    title: "Dropship.io in 2026: why it’s #1 despite tracking limits",
    excerpt:
      "Shopify tracking is degraded. Learn to read signals (curves + filters) and use Dropship.io to find brand-ready products you can scale cleanly.",
    readTime: "8 min",
    category: "Dropshipping",
    image: "/articles/dropship-io-2026-product-research/og.png?v=1",
  },
  {
    slug: "ecommerce-niche-research",
    title: "E-commerce niche research: why it’s the real growth lever",
    excerpt:
      "Stop chasing “magic products”. Learn a reliable niche research method with practical tools, checklists, common traps, and a 7‑day plan to avoid wasted tests.",
    readTime: "8 min",
    category: "Strategy",
    image: "/header_ee.png?v=8",
  },
  {
    slug: "dropshipping-product-research-2026",
    title: "Dropshipping product research (2026): PipiAds + Dropship.io method",
    excerpt:
      "A real, repeatable process to find profitable dropshipping products: criteria, PipiAds scanning, Dropship.io validation, mistakes to avoid, checklist, and a 7‑day plan.",
    readTime: "9 min",
    category: "Dropshipping",
    image: "/articles/dropshipping-product-research-2026/og.png?v=1",
  },
  {
    slug: "dropshipping-baking-supplies",
    title: "Dropshipping baking supplies: the complete guide (products, suppliers, margins & SEO)",
    excerpt:
      "An actionable playbook to sell baking tools and supplies via dropshipping: product selection, food-contact compliance, sourcing, branding, pricing, SEO, and acquisition.",
    readTime: "25 min",
    category: "Dropshipping",
    image: "/articles/dropshipping-baking-supplies/og.png?v=1",
  },
  {
    slug: "profitable-saturated-products",
    title: "How to be profitable on any saturated product in e-commerce",
    excerpt:
      "A repeatable framework to scale competitive products without gimmicks: win with stronger hooks, a best‑of product page, and continuous offer testing.",
    readTime: "7 min",
    category: "Scaling",
    image: "/articles/profitable-saturated-products/og.png?v=1",
  },
  {
    slug: "china-ecommerce-supply-chain",
    title: "China e-commerce supply chain: real costs & trusted agents",
    excerpt:
      "Understand where margins get hidden (agents, traders, shipping lines) and use a simple framework to audit pricing, verify partners, and scale with a structured China supply chain.",
    readTime: "10 min",
    category: "Supply chain",
    image: "/articles/china-ecommerce-supply-chain/og.png?v=1",
  },
] as const;

export default function ArticlesIndexPage() {
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <section className="py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Ecom Efficiency <span className="gradient-text">Articles</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Practical guides to find products, launch offers, and scale profitably.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                title={a.title}
                className="group bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02]"
              >
                <div className="relative w-full aspect-[16/9] bg-black/30 overflow-hidden">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={a.slug === "dropship-io-2026-product-research"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {a.category}
                    </span>
                    <span className="text-xs text-gray-500">{a.readTime}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {a.title}
                  </h2>
                  <p className="text-gray-400 text-sm line-clamp-3">{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

