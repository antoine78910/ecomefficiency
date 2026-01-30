import type { Metadata } from "next";
import Footer from "@/components/Footer";
import ToolsScrollingSection from "@/components/ToolsScrollingSection";
import SavingsComparisonSection from "@/components/SavingsComparisonSection";
import HomePricingSection from "@/components/HomePricingSection";
import NewHeroSection from "@/components/NewHeroSection";
import NewNavbar from "@/components/NewNavbar";
import VideoSection from "@/components/VideoSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";

export const metadata: Metadata = {
  title: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
  description:
    "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster. Cancel anytime.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
    description:
      "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecom Efficiency — Access 50+ Ecom Spy, SEO & AI Tools for 99% Off",
    description:
      "Access 50+ premium e-commerce tools (Spy, SEO, AI) in one dashboard. Save $4,000+/month and scale faster.",
    images: ["/header_ee.png?v=8"],
  },
};

export default function Home() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I cancel my subscription at any time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, you can cancel your subscription at any time directly from your user area, with no obligation.",
        },
      },
      {
        "@type": "Question",
        name: "How can I get access to EcomEfficiency tools after I've registered?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After you register, you’ll be invited to our Discord server to access the community and tool logins.",
        },
      },
      {
        "@type": "Question",
        name: "Will I only have access to tool logins?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. You’ll also get access to our Discord community, free Shopify themes, curated content, and more.",
        },
      },
      {
        "@type": "Question",
        name: "What should I do if I have a problem with logins?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open a ticket in our Discord server explaining the issue and we’ll help you resolve it.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NewNavbar />
      <NewHeroSection />
      <VideoSection />
      <ToolsScrollingSection />
      <SavingsComparisonSection />
      <HomePricingSection />
      <FaqSection />
      <JoinMembersSection />
      <Footer />
    </div>
  );
}
