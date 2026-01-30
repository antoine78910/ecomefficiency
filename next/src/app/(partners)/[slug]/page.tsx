import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/integrations/supabase/server";
import PartnerSimpleLanding from "@/components/PartnerSimpleLanding";

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

function isClearlyNotAPartnerSlug(rawSlug: string) {
  const s = String(rawSlug || "").trim();
  if (!s) return true;
  // If it looks like a filename (e.g. sitemapss.xml), do NOT treat it as a partner slug route.
  if (s.includes(".")) return true;
  return false;
}

async function readPublicConfig(slug: string) {
  const safeSlug = cleanSlug(slug);
  if (!safeSlug) return { slug: safeSlug, exists: false as const };
  if (!supabaseAdmin) return { slug: safeSlug, exists: false as const };
  try {
    const key = `partner_config:${safeSlug}`;
    const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", key).maybeSingle();
    const exists = Boolean(data);
    const raw = (data as any)?.value;
    const cfg = (() => {
      if (!raw) return {};
      if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      return raw;
    })();
    const colors = (cfg as any)?.colors || {};
    const faq = Array.isArray((cfg as any)?.faq) ? ((cfg as any).faq as any[]) : [];
    return {
      slug: safeSlug,
      exists,
      saasName: cfg?.saasName ? String(cfg.saasName) : undefined,
      tagline: cfg?.tagline ? String(cfg.tagline) : undefined,
      logoUrl: cfg?.logoUrl ? String(cfg.logoUrl) : undefined,
      supportEmail: (cfg as any)?.supportEmail ? String((cfg as any).supportEmail) : undefined,
      faviconUrl: (cfg as any)?.faviconUrl ? String((cfg as any).faviconUrl) : undefined,
      titleHighlight: (cfg as any)?.titleHighlight ? String((cfg as any).titleHighlight) : "",
      titleHighlightColor: (cfg as any)?.titleHighlightColor ? String((cfg as any).titleHighlightColor) : "accent",
      subtitleHighlight: (cfg as any)?.subtitleHighlight ? String((cfg as any).subtitleHighlight) : "",
      subtitleHighlightColor: (cfg as any)?.subtitleHighlightColor ? String((cfg as any).subtitleHighlightColor) : "accent",
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
      faq,
    };
  } catch {
    return { slug: safeSlug, exists: false as const };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (isClearlyNotAPartnerSlug(slug)) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const cfg = await readPublicConfig(slug);
  if (!(cfg as any)?.exists) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
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
  if (isClearlyNotAPartnerSlug(slug)) notFound();
  const cfg = await readPublicConfig(slug);
  if (!(cfg as any)?.exists) notFound();

  const title = cfg.saasName || "Your SaaS";
  const subtitle = cfg.tagline || "A modern SaaS built for your audience.";

  return (
    <PartnerSimpleLanding
      slug={cfg.slug}
      title={title}
      subtitle={subtitle}
      logoUrl={cfg.logoUrl}
      supportEmail={(cfg as any).supportEmail as any}
      colors={cfg.colors as any}
      pricing={{
        monthlyPrice: (cfg as any).monthlyPrice,
        yearlyPrice: (cfg as any).yearlyPrice,
        annualDiscountPercent: (cfg as any).annualDiscountPercent,
        currency: (cfg as any).currency,
        allowPromotionCodes: (cfg as any).allowPromotionCodes,
      }}
      faq={(cfg as any).faq as any}
      titleHighlight={(cfg as any).titleHighlight as any}
      titleHighlightColor={(cfg as any).titleHighlightColor as any}
      subtitleHighlight={(cfg as any).subtitleHighlight as any}
      subtitleHighlightColor={(cfg as any).subtitleHighlightColor as any}
    />
  );
}

