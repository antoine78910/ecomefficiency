import type { Metadata } from "next";
import Footer from "@/components/Footer";
import HomeClientSections from "@/components/HomeClientSections";
import NewHeroSection from "@/components/NewHeroSection";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import VideoSection from "@/components/VideoSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";
import GoalClient from "@/components/GoalClient";
import { CANONICAL_ORIGIN } from "@/lib/canonicalOrigin";

export const metadata: Metadata = {
  title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
  description:
    "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
  alternates: { canonical: `${CANONICAL_ORIGIN}/` },
  openGraph: {
    url: `${CANONICAL_ORIGIN}/`,
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description:
      "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description:
      "#1 group buy for ecommerce & online businesses – Save $4,000+ every month",
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
        name: "Why is it so cheap?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Having thousands of subscribers, we manage to pay for all the subscriptions by pooling the budget. We take care of all the renewals; you can just enjoy the tools.",
        },
      },
      {
        "@type": "Question",
        name: "How do credits work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We regularly refill credits when needed across many tools. For AI tools or credit-based platforms, some features may be limited to keep the service stable and fair for all users.",
        },
      },
      {
        "@type": "Question",
        name: "What's your refund policy?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All sales are final. Upon payment, you receive immediate access to exclusive content and resources. For this reason, we do not offer refunds.",
        },
      },
      {
        "@type": "Question",
        name: "Can I cancel my subscription?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can cancel your subscription at any time, access will remain active until the end of your billing cycle.",
        },
      },
      {
        "@type": "Question",
        name: "Can I share the tools with more people?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sharing is strictly prohibited. We have automatic systems that detect data leakage, you would risk being banned without refund.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-black">
      <GoalClient name="view_home" metadata={{ path: "/" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <NewNavbar />

      {/* SEO-only headings (do not change the landing page UI) */}
      <div className="sr-only">
        <h1>EcomEfficiency - All-in-One Access to 50+ SEO, Spy &amp; AI Tools for Ecommerce</h1>
      </div>

      <NewHeroSection />
      <VideoSection />
      <HomeClientSections />
      <PricingSection />
      <FaqSection />
      <JoinMembersSection />
      <Footer />
    </div>
  );
}
