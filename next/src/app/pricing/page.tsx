import NewNavbar from "@/components/NewNavbar";
import PricingSection from "@/components/PricingSection";
import ToolsGrid from "@/components/ToolsGrid";
import Footer from "@/components/Footer";
import GoalClient from "@/components/GoalClient";

// Static marketing page to avoid runtime cost
export const dynamic = 'force-static';
export const revalidate = 60 * 60 * 24; // 1 day

function PricingClient() {
  return (
    <div className="min-h-screen bg-black">
      <GoalClient name="view_pricing" />
      <NewNavbar />
      <PricingSection />
      <Footer />
    </div>
  );
}

export default function PricingPage() {
  return <PricingClient />;
}


