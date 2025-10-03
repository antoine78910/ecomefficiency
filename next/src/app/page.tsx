"use client";
import { useEffect, useMemo } from "react";
import Dashboard from "@/screens/App";
import AppTopNav from "@/components/AppTopNav";
import NewNavbar from "@/components/NewNavbar";
import NewHeroSection from "@/components/NewHeroSection";
import ToolsScrollingSection from "@/components/ToolsScrollingSection";
import PricingSection from "@/components/PricingSection";
import SavingsComparisonSection from "@/components/SavingsComparisonSection";
import FaqSection from "@/components/FaqSection";
import JoinMembersSection from "@/components/JoinMembersSection";
import Footer from "@/components/Footer";
import AuthHashRedirector from "@/components/AuthHashRedirector";
import VideoSection from "@/components/VideoSection";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const isApp = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    return host === 'app.localhost' || host.startsWith('app.');
  }, []);

  if (isApp) {
    return (
      <div className="theme-app min-h-screen bg-black text-white flex">
        <main className="flex-1 flex flex-col min-h-screen">
          <AppTopNav />
          <div className="flex-1">
            <Dashboard />
          </div>
        </main>
      </div>
    );
  }

  // Do not auto-redirect signed-in users to app.*; keep users on the landing page unless they navigate

  return (
    <div className="min-h-screen bg-black">
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
