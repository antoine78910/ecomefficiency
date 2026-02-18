import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import GoalClient from "@/components/GoalClient";

// Static marketing page to avoid runtime cost
export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

function PriceClient() {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Ecom Efficiency (Legacy upgrade pricing)",
    description:
      "Pricing for legacy customers upgrading to the new Pro plan. Includes additional credit accounts for Pro: +500k ElevenLabs credits and +200k Pipiads credits.",
    brand: { "@type": "Brand", name: "Ecom Efficiency" },
    url: "https://www.ecomefficiency.com/price",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "19.99",
      highPrice: "29.99",
      availability: "https://schema.org/InStock",
      url: "https://www.ecomefficiency.com/price",
    },
  };

  return (
    <div className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <GoalClient name="view_price" />
      <NewNavbar />
      <PricingSection
        proBonusBullets={[
          "500k credits ElevenLabs account",
          "200k credits Pipiads account",
        ]}
      />

      <Footer />
    </div>
  );
}

export default function PricePage() {
  return <PriceClient />;
}

