import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/integrations/supabase/server";
import PartnerSlugClient from "./PartnerSlugClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readPublicConfig(slug: string) {
  const safeSlug = cleanSlug(slug);
  if (!safeSlug) return { slug: safeSlug };
  if (!supabaseAdmin) return { slug: safeSlug };
  try {
    const key = `partner_config:${safeSlug}`;
    const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    const raw = (data as any)?.value;
    const cfg = (() => {
      if (!raw) return {};
      if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      return raw;
    })();
    const colors = (cfg as any)?.colors || {};
    return {
      slug: safeSlug,
      saasName: cfg?.saasName ? String(cfg.saasName) : undefined,
      tagline: cfg?.tagline ? String(cfg.tagline) : undefined,
      logoUrl: cfg?.logoUrl ? String(cfg.logoUrl) : undefined,
      faviconUrl: (cfg as any)?.faviconUrl ? String((cfg as any).faviconUrl) : undefined,
      colors: {
        main: colors?.main ? String(colors.main) : undefined,
        secondary: colors?.secondary ? String(colors.secondary) : undefined,
        accent: colors?.accent ? String(colors.accent) : undefined,
        background: colors?.background ? String(colors.background) : undefined,
      },
      monthlyPrice: cfg?.monthlyPrice ? String(cfg.monthlyPrice) : undefined,
      yearlyPrice: cfg?.yearlyPrice ? String(cfg.yearlyPrice) : undefined,
      annualDiscountPercent: cfg?.annualDiscountPercent !== undefined && cfg?.annualDiscountPercent !== null ? Number(cfg.annualDiscountPercent) : undefined,
      currency: cfg?.currency ? String(cfg.currency) : undefined,
      allowPromotionCodes: typeof cfg?.allowPromotionCodes === "boolean" ? cfg.allowPromotionCodes : undefined,
      defaultDiscountId: cfg?.defaultDiscountId ? String(cfg.defaultDiscountId) : undefined,
    };
  } catch {
    return { slug: safeSlug };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cfg = await readPublicConfig(slug);
  const title = cfg.saasName || "Your SaaS";
  const description = cfg.tagline || "A modern SaaS built for your audience.";
  const icon = (cfg as any)?.faviconUrl ? String((cfg as any).faviconUrl) : undefined;
  return {
    title,
    description,
    icons: icon ? { icon } : undefined,
  };
}

export default async function PartnerSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = await readPublicConfig(slug);

  const title = cfg.saasName || "Your SaaS";
  const tagline = cfg.tagline || "A modern SaaS built for your audience.";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(149,65,224,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_40%,rgba(124,48,199,0.12),transparent_55%)]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {cfg.logoUrl ? (
              <img src={cfg.logoUrl} alt={`${title} logo`} className="h-10 w-auto object-contain" />
            ) : (
              <Image src="/ecomefficiency.png" alt="Ecom Efficiency" width={160} height={52} priority className="h-10 w-auto object-contain opacity-90" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{title}</div>
              <div className="text-xs text-gray-400 truncate">{cfg.slug ? `partners.ecomefficiency.com/${cfg.slug}` : "partners.ecomefficiency.com"}</div>
            </div>
          </div>

          <Link
            href={`/signin`}
            className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2"
          >
            Admin sign in
          </Link>
        </div>

        <div className="mt-14">
          <div className="text-4xl md:text-5xl font-semibold leading-tight">
            {title}
          </div>
          <div className="mt-4 text-lg text-gray-300 max-w-2xl">
            {tagline}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] shadow-[0_8px_40px_rgba(149,65,224,0.35)] hover:brightness-110"
            >
              Start now
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              How it works
            </a>
          </div>
        </div>

        <div id="how" className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["All-in-one", "Everything you need in one place."],
            ["Fast setup", "Get started in minutes."],
            ["Secure payments", "Powered by Stripe Checkout."],
          ].map(([h, d]) => (
            <div key={h} className="rounded-2xl border border-white/10 bg-black/60 p-5 shadow-[0_20px_80px_rgba(149,65,224,0.08)]">
              <div className="text-sm font-semibold">{h}</div>
              <div className="mt-2 text-sm text-gray-400">{d}</div>
            </div>
          ))}
        </div>

        <div id="pricing" className="mt-12">
          <div className="text-xl font-semibold">Checkout</div>
          <div className="mt-2 text-sm text-gray-400">
            Subscribe in a few clicks. Payments are handled securely by Stripe.
          </div>

          <PartnerSlugClient config={cfg as any} />
        </div>

        <div className="mt-14 text-xs text-gray-600">
          Powered by <span className="text-gray-400">Ecom Efficiency Partners</span>
        </div>
      </div>
    </div>
  );
}

