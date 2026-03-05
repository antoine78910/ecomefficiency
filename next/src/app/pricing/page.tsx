import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import ToolsGrid from "@/components/ToolsGrid";
import Footer from "@/components/Footer";
import GoalClient from "@/components/GoalClient";
import { CANONICAL_ORIGIN } from "@/lib/canonicalOrigin";
import type { Metadata } from "next";

// Static marketing page to avoid runtime cost
export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
};

function PricingClient() {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Ecom Efficiency",
    description: "Access 45+ premium SEO / SPY / AI tools and save $4000+ every month.",
    brand: { "@type": "Brand", name: "Ecom Efficiency" },
    url: `${CANONICAL_ORIGIN}/pricing`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "19.99",
      highPrice: "29.99",
      availability: "https://schema.org/InStock",
      url: `${CANONICAL_ORIGIN}/pricing`,
    },
  };

  return (
    <div className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <GoalClient name="view_pricing" />
      <NewNavbar />
      <PricingSection />
      <Footer />
    </div>
  );
}

export default function PricingPage() {
  return <PricingClient />;
}


