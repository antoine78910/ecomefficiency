import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

export const metadata: Metadata = {
  title: "Articles | Ecom Efficiency",
  description: "Guides SEO et playbooks e-commerce par Ecom Efficiency.",
  alternates: { canonical: "/articles" },
  openGraph: {
    title: "Articles | Ecom Efficiency",
    description: "Guides SEO et playbooks e-commerce par Ecom Efficiency.",
    url: "/articles",
    type: "website",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency Articles" }],
  },
};

const articles = [
  {
    slug: "dropshipping-baking-supplies",
    title: "Dropshipping de baking supplies : le guide complet (produits, fournisseurs, marges, SEO)",
    excerpt:
      "Un playbook actionnable pour vendre des accessoires et ingrédients de pâtisserie en dropshipping : sélection produit, conformité food-contact, sourcing, branding, pricing, SEO et acquisition.",
    readTime: "25 min",
    category: "Dropshipping",
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
            Des guides concrets pour trouver des produits, lancer des offres, et scaler proprement.
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
                className="group bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02]"
              >
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

