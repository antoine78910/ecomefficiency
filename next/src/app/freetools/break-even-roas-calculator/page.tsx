import type { Metadata } from "next";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

import BreakEvenRoasCalculator from "./BreakEvenRoasCalculator";

const CANONICAL = "/freetools/break-even-roas-calculator";

export const metadata: Metadata = {
  title: "Break Even ROAS Calculator",
  description:
    "Free break even ROAS calculator for ecommerce and dropshipping. Calculate break-even ROAS and max CPA using real costs like VAT, fees, shipping and COGS.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Break Even ROAS Calculator",
    description:
      "Calculate break-even ROAS and max CPA for ecommerce and dropshipping with real costs like VAT, fees, shipping and product cost.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Break even ROAS calculator" }],
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

export default function BreakEvenRoasCalculatorPage() {
  const toc: TocItem[] = [
    { id: "calculator", label: "Calculator", level: 2 },
    { id: "what-you-get", label: "What you get (ROAS + CPA)", level: 2 },
    { id: "how-to-use", label: "How to use it", level: 2 },
    { id: "how-it-works", label: "How the math works", level: 2 },
    { id: "faq", label: "FAQ", level: 2 },
  ];

  const publishedIso = new Date("2026-02-04T00:00:00.000Z").toISOString();
  const faqItems = [
    {
      q: "What is a break even ROAS calculator?",
      a: "A break even ROAS calculator tells you the minimum ROAS required to avoid losing money, based on your selling price, VAT, and per-order costs.",
    },
    {
      q: "What is break-even CPA?",
      a: "Break-even CPA is the maximum acquisition cost you can afford per purchase. Above that number, the sale becomes unprofitable.",
    },
    {
      q: "Should I use selling price or net revenue for ROAS?",
      a: "Ad platforms typically calculate ROAS using the selling price (gross conversion value). This calculator uses selling price for ROAS and net revenue (after VAT) for CPA.",
    },
    {
      q: "Why include VAT, fees, and shipping?",
      a: "Because real profitability depends on your true cost per sale. Leaving out VAT, processing fees, or shipping often makes ROAS benchmarks inaccurate.",
    },
  ];

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Break Even ROAS Calculator",
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
            <span className="text-xs text-gray-500">Read time: ~4 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Break even ROAS calculator</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            This <strong>break even ROAS calculator</strong> helps ecommerce operators and dropshippers find the exact ROAS required to break even, plus the
            maximum CPA they can afford, based on real costs.
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
            <BreakEvenRoasCalculator />

            <SectionTitle id="what-you-get">What you get (ROAS + CPA)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              In paid acquisition, the hard part is not launching campaigns. It is knowing when campaigns are actually profitable.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              This calculator gives you two numbers you can use immediately: your break-even ROAS and your break-even CPA. That means you can make
              data-driven decisions without guesswork, questionable tactics, or margin-killing mistakes.
            </p>

            <SubTitle id="how-to-use">How to use it</SubTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Step 1: Enter real costs</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Add your selling price, VAT, product cost, shipping, and any per-order fees. These numbers define your true profit baseline.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
                <div className="text-white font-semibold mb-2">Step 2: Read the thresholds</div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Your break-even CPA is the maximum you can pay to acquire a customer. Your break-even ROAS is the minimum ROAS you need to avoid losing
                  money.
                </p>
              </div>
            </div>

            <SectionTitle id="how-it-works">How the math works</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Most calculators only compare ad spend to revenue. That is rarely enough to reflect reality.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              This break even ROAS calculator accounts for product cost, shipping, payment fees, and VAT. It then shows how your break-even point moves when
              you change variables such as AOV, shipping, or fees.
            </p>
            <div className="rounded-2xl border border-white/10 bg-gray-900/20 p-5">
              <div className="text-white font-semibold mb-2">Interpretation</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">
                <li>
                  If your actual ROAS is below break-even, you are losing money on each purchase (before LTV effects).
                </li>
                <li>
                  If your actual ROAS is above break-even, you can decide whether to stabilize or scale based on the profit targets shown.
                </li>
                <li>
                  If you want to reduce SaaS costs across your stack, you can compare with{" "}
                  <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline" title="Ecom Efficiency pricing">
                    Ecom Efficiency pricing
                  </Link>
                  .
                </li>
              </ul>
            </div>

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

