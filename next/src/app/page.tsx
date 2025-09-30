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

  useEffect(() => {
    (async () => {
      try {
        const host = window.location.hostname.toLowerCase()
        const port = window.location.port ? `:${window.location.port}` : ''
        const appOrigin = host === 'localhost'
          ? `http://app.localhost${port}`
          : `${window.location.protocol}//app.${host.replace(/^app\./, '')}`
        console.log('[landing] probe start', { host, port, appOrigin })
        // First: if a Supabase session exists on this origin, redirect immediately
        try {
          const { data } = await supabase.auth.getSession();
          console.log('[landing] supabase session on main?', Boolean(data?.session))
          if (data?.session) {
            console.log('[landing] redirect via supabase session')
            window.location.href = `${appOrigin}/`;
            return;
          }
        } catch {}
        // Fallback: ask app.* if user is logged in (will work if cookies are sendable cross-site)
        try {
          console.log('[landing] fetching app auth status...')
          const res = await fetch(`${appOrigin}/api/auth/status`, { credentials: 'include' })
          const j = await res.json().catch(() => ({}))
          console.log('[landing] app auth status', j)
          if (j?.loggedIn) {
            console.log('[landing] redirect via app auth status')
            window.location.href = `${appOrigin}/`
            return;
          }
        } catch {}
        console.log('[landing] no redirect conditions met')
      } catch {}
    })()
  }, [])

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
