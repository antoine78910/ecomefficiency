import type { Metadata } from "next";
import Footer from "@/components/Footer";
import HomeClientSections from "@/components/HomeClientSections";
import NewHeroSection from "@/components/NewHeroSection";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import VideoSection from "@/components/VideoSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";

export const metadata: Metadata = {
  title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
  description:
    "All-in-one access to 50+ SEO, ad spy & AI tools for dropshippers and ecommerce brands. Find winners, analyze ads, optimize SEO, and scale faster.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description:
      "All-in-one access to 50+ SEO, ad spy & AI tools for dropshippers and ecommerce brands. Find winners, analyze ads, optimize SEO, and scale faster.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Ecom Efficiency" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EcomEfficiency - All-in-One Access to 50+ SEO, Spy & AI Tools for Ecommerce",
    description:
      "All-in-one access to 50+ SEO, ad spy & AI tools for dropshippers and ecommerce brands. Find winners, analyze ads, optimize SEO, and scale faster.",
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
      <HomeClientSections />
      <PricingSection />
      <FaqSection />
      <JoinMembersSection />
      <Footer />
    </div>
  );
}
