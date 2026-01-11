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
import { headers } from "next/headers";
import AutoRedirectToApp from "@/components/AutoRedirectToApp";
import PartnerSlugClient from "@/app/(partners)/[slug]/PartnerSlugClient";
import { supabaseAdmin } from "@/integrations/supabase/server";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

export default async function Home() {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase();
  const isApp = host.includes('app.localhost') || (host.startsWith('app.') && !host.includes('localhost'));
  const bareHost = host.split(':')[0].replace(/^www\./, '');

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

  // Custom domain -> serve partner template at root.
  // We only activate this for hosts that are NOT our own known domains/subdomains.
  const isKnown =
    bareHost === 'ecomefficiency.com' ||
    bareHost.endsWith('.ecomefficiency.com') ||
    bareHost.endsWith('localhost');

  if (!isKnown && supabaseAdmin) {
    try {
      const key = `partner_domain:${bareHost}`;
      const { data } = await supabaseAdmin.from('app_state').select('value').eq('key', key).maybeSingle();
      const mapping = parseMaybeJson((data as any)?.value) as any;
      const slug = mapping?.slug as string | undefined;
      if (slug) {
        // Read partner config to hydrate the template (same shape used by /[slug] page)
        const cfgKey = `partner_config:${slug}`;
        const { data: cfgRow } = await supabaseAdmin.from('app_state').select('value').eq('key', cfgKey).maybeSingle();
        const cfg = parseMaybeJson((cfgRow as any)?.value) || {};
        const colors = (cfg as any)?.colors || {};
        const title = String(cfg?.saasName || slug);
        const tagline = String(cfg?.tagline || 'A modern SaaS built for your audience.');

        return (
          <div className="min-h-screen bg-black text-white">
            <div className="relative max-w-5xl mx-auto px-6 py-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {cfg?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(cfg.logoUrl)} alt={`${title} logo`} className="h-10 w-auto object-contain" />
                  ) : (
                    <span className="text-sm font-semibold">{title}</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{title}</div>
                    <div className="text-xs text-gray-400 truncate">{tagline}</div>
                  </div>
                </div>
                <a href={`https://partners.ecomefficiency.com/dashboard?slug=${encodeURIComponent(slug)}`} className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2">
                  Admin
                </a>
              </div>

              <div className="mt-12">
                <div className="text-4xl md:text-5xl font-semibold leading-tight">{title}</div>
                <div className="mt-4 text-lg text-gray-300 max-w-2xl">{tagline}</div>
              </div>

              <div className="mt-10">
                <PartnerSlugClient
                  config={{
                    slug,
                    saasName: cfg?.saasName,
                    tagline: cfg?.tagline,
                    logoUrl: cfg?.logoUrl,
                    colors: {
                      main: colors?.main,
                      secondary: colors?.secondary,
                      accent: colors?.accent,
                      background: colors?.background,
                    },
                    monthlyPrice: cfg?.monthlyPrice,
                    yearlyPrice: cfg?.yearlyPrice,
                    annualDiscountPercent: cfg?.annualDiscountPercent,
                    currency: cfg?.currency,
                    allowPromotionCodes: cfg?.allowPromotionCodes,
                    defaultDiscountId: cfg?.defaultDiscountId,
                  }}
                />
              </div>
            </div>
          </div>
        );
      }
    } catch {
      // fall through to main marketing site
    }
  }

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
