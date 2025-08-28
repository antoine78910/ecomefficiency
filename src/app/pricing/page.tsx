"use client";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import ToolsGrid from "@/components/ToolsGrid";
import Footer from "@/components/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />
      <PricingSection />
      <ToolsGrid />
      <Footer />
    </div>
  );
}


