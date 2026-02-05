import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import LtvCalculator from "./LtvCalculator";

const CANONICAL = "/freetools/customer-lifetime-value-calculator";

export const metadata: Metadata = {
  title: "Customer Lifetime Value (LTV) Calculator",
  description:
    "Free customer lifetime value calculator for ecommerce. Estimate customer LTV (lifetime profit), LTV:CAC ratio, and net profit after marketing costs.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Customer Lifetime Value (LTV) Calculator",
    description:
      "Customer lifetime value calculator: estimate LTV, LTV:CAC ratio, and net profit per customer after marketing costs for ecommerce and dropshipping.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Customer lifetime value calculator" }],
  },
};

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

function SubTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-28 text-xl md:text-2xl font-semibold text-white mt-8 mb-3">
      {children}
    </h3>
  );
}

export default function CustomerLifetimeValueCalculatorPage() {
  const toc: TocItem[] = [
    { id: "calculator", label: "Calculator", level: 2 },
    { id: "why-ltv-matters", label: "Why LTV is the most important metric in ecommerce", level: 2 },
    { id: "what-ltv-tells-you", label: "What LTV actually tells you", level: 2 },
    { id: "how-to-improve-ltv", label: "How to improve LTV (practical levers)", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-04T00:00:00.000Z").toISOString();

  const faqItems = [
    {
      q: "What is customer lifetime value (LTV)?",
      a: "Customer lifetime value is how much profit a customer generates over the full relationship with your brand. This calculator uses lifetime profit (not revenue).",
    },
    {
      q: "What is a good LTV:CAC ratio?",
      a: "As a simple benchmark, many operators aim for 3.0+ over time. The right target depends on margins, cash flow, and growth stage.",
    },
    {
      q: "Why is LTV more important than ROAS?",
      a: "ROAS describes performance on a single purchase window. LTV shows what happens across repeat purchases, retention, and upsells, which is what makes scaling sustainable.",
    },
    {
      q: "Is this a lifetime value of a customer calculator or an LTV calculator?",
      a: "Both. People search it as a lifetime value of a customer calculator, and the goal is the same: estimate LTV, compare to CAC, and understand true unit economics.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Customer Lifetime Value (LTV) Calculator",
    description: metadata.description,
    datePublished: publishedIso,
    dateModified: publishedIso,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.ecomefficiency.com${CANONICAL}` },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" },
    },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebPage) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

        <Link
          href="/freetools"
          title="Back to free tools"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <span className="text-sm">← Back to free tools</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Free tool</span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("en-US")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Read time: ~5 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Customer lifetime value calculator</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>customer lifetime value calculator</strong> (also searched as a <strong>lifetime value of a customer calculator</strong>) helps you
            estimate LTV, LTV:CAC ratio, and net profit per customer after marketing costs.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block lg:sticky lg:top-24 self-start flex flex-col">
            <div
              className="min-h-0 overflow-y-auto pr-1
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: "calc(100vh - 7rem - 220px)" }}
            >
              <ToolToc items={toc} defaultActiveId={toc[0]?.id} collapseSubheadings />
            </div>
            <div className="mt-6">
              <EcomToolsCta compact totalTools={50} />
            </div>
          </aside>

          <div className="min-w-0 max-w-none">
            <SectionTitle id="calculator">Calculator</SectionTitle>
            <LtvCalculator />

            <SectionTitle id="why-ltv-matters">Why LTV is the most important metric in ecommerce</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Not all ecommerce stores grow the same way. Some constantly chase new customers. Others build long term, profitable brands. The difference often
              comes down to one metric: LTV.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              LTV measures how much value a customer generates over the entire relationship with your brand. In saturated markets, improving LTV is what
              separates scalable businesses from fragile ones.
            </p>

            <SectionTitle id="what-ltv-tells-you">What LTV actually tells you</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Your true acquisition ceiling</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  CPA and ROAS are not enough without LTV. If a customer buys 3, 5, or 10 times, you can spend more to acquire them and still stay profitable.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Lower dependence on ads</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Stores with strong LTV monetize through email, SMS, repeat purchases, upsells, bundles, and subscriptions. That creates predictable revenue
                  when ad costs rise.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Protection in saturated markets</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Products get copied and CPMs increase. Brands that survive retain customers longer, increase AOV over time, and build habits instead of one
                  off purchases.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Better long term decisions</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  With LTV, you stop optimizing for short term wins and build systems: onboarding, post purchase experience, and smart product expansion. The
                  question becomes: does this customer stay?
                </p>
              </div>
            </div>

            <SubTitle id="how-to-improve-ltv">How to improve LTV (practical levers)</SubTitle>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Increase profit per order with bundles, better offers, and pricing discipline.</li>
              <li>Increase purchase frequency with post purchase email and SMS flows.</li>
              <li>Extend lifespan with better product quality, support, and retention hooks.</li>
              <li>Track LTV by cohort so you see long term performance, not just short term ROAS.</li>
            </ul>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

