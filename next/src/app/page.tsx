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
import type { Metadata } from "next";
import AutoRedirectToApp from "@/components/AutoRedirectToApp";
import PartnerSlugClient from "@/app/(partners)/[slug]/PartnerSlugClient";
import { supabaseAdmin } from "@/integrations/supabase/server";
import PartnerSimpleLanding from "@/components/PartnerSimpleLanding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
    const isApp = host.includes("app.localhost") || (host.startsWith("app.") && !host.includes("localhost"));
    const bareHost = host.split(":")[0].replace(/^www\./, "");

    if (isApp) return {};

    const isKnown =
      bareHost === "ecomefficiency.com" ||
      bareHost.endsWith(".ecomefficiency.com") ||
      bareHost.endsWith("localhost");

    if (isKnown || !supabaseAdmin) return {};

    const key = `partner_domain:${bareHost}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const mapping = parseMaybeJson((data as any)?.value) as any;
    const slug = mapping?.slug as string | undefined;
    if (!slug) return {};

    const cfgKey = `partner_config:${slug}`;
    const { data: cfgRow } = await supabaseAdmin.from("app_state").select("value").eq("key", cfgKey).maybeSingle();
    const cfg = parseMaybeJson((cfgRow as any)?.value) || {};
    const title = String((cfg as any)?.saasName || slug);
    const description = String((cfg as any)?.tagline || "A modern SaaS built for your audience.");
    const icon = (cfg as any)?.faviconUrl ? String((cfg as any).faviconUrl) : undefined;

    return {
      title,
      description,
      icons: icon ? { icon } : undefined,
    };
  } catch {
    return {};
  }
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
        const subtitle = String(cfg?.tagline || 'A modern SaaS built for your audience.');
        const faq = Array.isArray((cfg as any)?.faq) ? ((cfg as any).faq as any[]) : [];

        return (
          <PartnerSimpleLanding
            slug={slug}
            title={title}
            subtitle={subtitle}
            logoUrl={cfg?.logoUrl ? String(cfg.logoUrl) : undefined}
            colors={{
              main: colors?.main,
              secondary: colors?.secondary,
              accent: colors?.accent,
              background: colors?.background,
            }}
            pricing={{
              monthlyPrice: cfg?.monthlyPrice,
              yearlyPrice: cfg?.yearlyPrice,
              annualDiscountPercent: cfg?.annualDiscountPercent,
              currency: cfg?.currency,
              allowPromotionCodes: cfg?.allowPromotionCodes,
            }}
            faq={faq as any}
          />
        );
      }
    } catch {
      // fall through to main marketing site
    }

    // If the request is for a custom domain but we don't have a mapping yet,
    // show a helpful setup page (avoid "blank page" confusion).
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-6">
          <div className="text-lg font-semibold">Domain not connected yet</div>
          <div className="mt-2 text-sm text-gray-300">
            We received a request for <span className="font-mono text-gray-100">{bareHost || "unknown-host"}</span>, but it’s not mapped to any partner slug.
          </div>
          <div className="mt-4 text-sm text-gray-400 space-y-2">
            <div>
              - **In your Partners dashboard**: set this domain in “Custom domain”, click “Verify DNS”, and make sure it shows <span className="text-gray-200">Verified ✅</span>.
            </div>
            <div>
              - **In Vercel**: the domain must be added to this project (domain ownership). If the domain is attached to another project, it will not serve this template.
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://partners.ecomefficiency.com/dashboard"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110"
            >
              Open Partners dashboard
            </a>
            <a
              href={`https://partners.ecomefficiency.com/dashboard?tab=settings`}
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Domain setup
            </a>
          </div>
          <div className="mt-5 text-[11px] text-gray-500">
            If you still see an empty page, open DevTools Console and share any errors — it usually means the domain isn’t pointing to this deployment or a runtime error is blocking rendering.
          </div>
        </div>
      </div>
    );
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
