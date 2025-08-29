import NewNavbar from "@/components/NewNavbar";
import NewHeroSection from "@/components/NewHeroSection";
// import NewDashboardPreview from "@/components/NewDashboardPreview";
import ToolsScrollingSection from "@/components/ToolsScrollingSection";
//import ToolsCarousel from "@/components/ToolsCarousel";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";
import Footer from "@/components/Footer";
import AuthHashRedirector from "@/components/AuthHashRedirector";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <AuthHashRedirector />
      <NewNavbar />
      <NewHeroSection />
      {/* <NewDashboardPreview /> */}
      <ToolsScrollingSection />
      {/*<ToolsCarousel />*/}
      <PricingSection />
      <FaqSection />
      <JoinMembersSection />
      <Footer />
    </div>
  );
}
