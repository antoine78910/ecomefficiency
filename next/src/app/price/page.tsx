import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import GoalClient from "@/components/GoalClient";
import { getSublaunchCreditsSnapshot } from "@/lib/sublaunchCredits";

// Static marketing page to avoid runtime cost
export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function PriceClient() {
  const credits = getSublaunchCreditsSnapshot();

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Ecom Efficiency (Legacy upgrade pricing)",
    description:
      "Pricing for legacy customers upgrading to the new Pro plan. Includes extra subscriptions: +500k ElevenLabs credits and +200k Pipiads credits (Sublaunch bundle).",
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

      <main className="w-full">
        <section className="pt-14 md:pt-20 pb-8 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full text-purple-300 text-sm font-medium mb-5 border border-purple-500/30">
                Legacy customers • Sublaunch upgrade
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Upgrade to the new plan (more credits included)</h1>
              <p className="text-gray-300 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
                This pricing page is for older customers who want to move to the current <strong>Pro</strong> plan and unlock extra bundled subscriptions.
                You’ll keep the full tools access, plus you get <strong>additional credit accounts</strong> for your creative and research workflow.
              </p>
            </div>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-orange-500/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.06)_0%,rgba(234,88,12,0.06)_100%)] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/tools-logos/elevenlabs.png" alt="ElevenLabs" className="w-14 h-14 object-contain" />
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-lg">ElevenLabs</div>
                    <div className="text-gray-300 text-sm">Included with Pro (Sublaunch users)</div>
                  </div>
                </div>
                <div className="text-green-300 font-semibold drop-shadow-[0_0_10px_rgba(74,222,128,0.35)]">
                  +1 additional {formatInt(credits.elevenLabs.includedCredits)} credits account
                </div>
                <div className="mt-3 text-sm text-gray-300">
                  Current credits:{" "}
                  <span className="text-white font-semibold">
                    {credits.elevenLabs.currentCredits === null ? "—" : formatInt(credits.elevenLabs.currentCredits)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400">Updated daily • {new Date(credits.updatedAtIso).toLocaleDateString("en-US")}</div>
              </div>

              <div className="rounded-2xl border border-blue-500/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,rgba(37,99,235,0.06)_100%)] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/tools-logos/pipiads.png" alt="Pipiads" className="w-14 h-14 object-contain" />
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-lg">Pipiads</div>
                    <div className="text-gray-300 text-sm">Included with Pro (Sublaunch users)</div>
                  </div>
                </div>
                <div className="text-green-300 font-semibold drop-shadow-[0_0_10px_rgba(74,222,128,0.35)]">
                  +1 additional {formatInt(credits.pipiads.includedCredits)} credits account
                </div>
                <div className="mt-3 text-sm text-gray-300">
                  Current credits:{" "}
                  <span className="text-white font-semibold">
                    {credits.pipiads.currentCredits === null ? "—" : formatInt(credits.pipiads.currentCredits)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-400">Updated daily • {new Date(credits.updatedAtIso).toLocaleDateString("en-US")}</div>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />
      </main>

      <Footer />
    </div>
  );
}

export default function PricePage() {
  return <PriceClient />;
}

