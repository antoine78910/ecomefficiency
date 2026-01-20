import AutoRedirectToApp from "@/components/AutoRedirectToApp";
import AuthHashRedirector from "@/components/AuthHashRedirector";
import Footer from "@/components/Footer";
import NewHeroSection from "@/components/NewHeroSection";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import SavingsComparisonSection from "@/components/SavingsComparisonSection";
import ToolsScrollingSection from "@/components/ToolsScrollingSection";
import VideoSection from "@/components/VideoSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <AutoRedirectToApp />
      <AuthHashRedirector />
      <NewNavbar />
      <NewHeroSection />
      <VideoSection />
      <ToolsScrollingSection />
      <SavingsComparisonSection />
      <PricingSection />
      <FaqSection />
      <JoinMembersSection />
      <Footer />
    </div>
  );
}
