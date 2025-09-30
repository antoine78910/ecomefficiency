"use client";
import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import ToolsGrid from "@/components/ToolsGrid";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { postGoal } from "@/lib/analytics";

export default function PricingPage() {
  useEffect(() => { postGoal('view_pricing'); }, []);
  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />
      <PricingSection />
      <Footer />
    </div>
  );
}


