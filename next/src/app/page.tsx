import Footer from "@/components/Footer";
import HomeClientBoot from "@/components/HomeClientBoot";
import HomeClientSections from "@/components/HomeClientSections";
import NewHeroSection from "@/components/NewHeroSection";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import VideoSection from "@/components/VideoSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";

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
      <HomeClientBoot />
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
