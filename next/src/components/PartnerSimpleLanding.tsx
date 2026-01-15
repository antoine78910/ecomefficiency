"use client";

import { PARTNER_TOOLS } from "@/components/partnerTools";
import PartnerNavbar from "@/components/PartnerNavbar";
import FloatingPricingWidget from "@/components/FloatingPricingWidget";
import PartnerPolicies from "@/components/PartnerPolicies";
import Link from "next/link";
import { bestTextColorOn, hexWithAlpha, mixHex, normalizeHex } from "@/lib/color";

export type PartnerFaqItem = { q: string; a: string };

function renderHighlighted(text: string, word: string, color: string) {
  const t = String(text || "");
  const w = String(word || "").trim();
  if (!w) return <>{t}</>;
  const idx = t.toLowerCase().indexOf(w.toLowerCase());
  if (idx < 0) return <>{t}</>;
  const before = t.slice(0, idx);
  const match = t.slice(idx, idx + w.length);
  const after = t.slice(idx + w.length);
  return (
    <>
      {before}
      <span style={{ color }} className="font-semibold">
        {match}
      </span>
      {after}
    </>
  );
}

export default function PartnerSimpleLanding({
  slug,
  title,
  subtitle,
  logoUrl,
  preview,
  onPreviewNavigate,
  hideFloatingPricingWidget,
  supportEmail,
  domain,
  colors,
  pricing,
  faq,
  titleHighlight,
  titleHighlightColor,
  subtitleHighlight,
  subtitleHighlightColor,
}: {
  slug: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
  preview?: boolean;
  onPreviewNavigate?: (path: "/signup" | "/signin" | "/app") => void;
  hideFloatingPricingWidget?: boolean;
  supportEmail?: string;
  domain?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  pricing?: {
    offerTitle?: string;
    monthlyPrice?: string | number;
    yearlyPrice?: string | number;
    annualDiscountPercent?: number;
    currency?: string;
    allowPromotionCodes?: boolean;
  };
  faq?: PartnerFaqItem[];
  titleHighlight?: string;
  titleHighlightColor?: "accent" | "main" | "secondary";
  subtitleHighlight?: string;
  subtitleHighlightColor?: "accent" | "main" | "secondary";
}) {
  const main = normalizeHex(String(colors?.main || "#9541e0"), "#9541e0");
  const secondary = normalizeHex(String(colors?.secondary || "#7c30c7"), "#7c30c7");
  const accent = normalizeHex(String(colors?.accent || "#ab63ff"), "#ab63ff");
  const background = normalizeHex(String(colors?.background || "#000000"), "#000000");
  const pick = (k: "accent" | "main" | "secondary" | undefined) => (k === "main" ? main : k === "secondary" ? secondary : accent);
  const primaryCtaText = bestTextColorOn(mixHex(main, secondary, 0.5));
  const cardShadow = `0 20px 80px ${hexWithAlpha(accent, 0.12)}`;

  const safeFaq = Array.isArray(faq) ? faq.filter((x) => x && (x.q || x.a)) : [];
  const preventNav = (e: any) => {
    if (!preview) return;
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch {}
  };

  const previewNav = (path: "/signup" | "/signin" | "/app") => {
    if (!preview) return;
    if (onPreviewNavigate) onPreviewNavigate(path);
  };

  return (
    <div className="min-h-screen text-white">
      <div className={`min-h-screen ${preview ? "relative" : ""}`} style={{ background: background }}>
        <PartnerNavbar
          logoUrl={logoUrl}
          title={title}
          preview={preview}
          onPreviewNavigate={
            onPreviewNavigate
              ? (p) => {
                  if (p === "/") {
                    try {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } catch {}
                    return;
                  }
                  onPreviewNavigate(p as any);
                }
              : undefined
          }
          colors={{ main, secondary, accent }}
        />

        {/* Floating pricing (bottom-right) */}
        {!hideFloatingPricingWidget ? (
          <FloatingPricingWidget
            slug={slug}
            saasName={title}
            preview={preview}
            onPreviewNavigate={onPreviewNavigate}
            supportEmail={supportEmail}
            monthlyPrice={pricing?.monthlyPrice}
            yearlyPrice={pricing?.yearlyPrice}
            annualDiscountPercent={pricing?.annualDiscountPercent}
            currency={pricing?.currency}
            allowPromotionCodes={pricing?.allowPromotionCodes}
            main={main}
            secondary={secondary}
            accent={accent}
          />
        ) : null}

        {/* Hero (centered) */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
              maskImage: "linear-gradient(to bottom, white 0%, white 60%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, white 0%, white 60%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 10%, ${main}2e, transparent 50%)` }} />
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 80% 40%, ${secondary}24, transparent 55%)` }} />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, transparent 0%, transparent 55%, ${hexWithAlpha(background, 1)} 100%)` }}
            />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16 text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.06] tracking-normal">
              {renderHighlighted(title, titleHighlight || "", pick(titleHighlightColor))}
            </h1>
            <p className="mt-5 text-xl text-gray-400 max-w-3xl mx-auto">
              {renderHighlighted(subtitle, subtitleHighlight || "", pick(subtitleHighlightColor))}
            </p>
            <div className="mt-8 flex flex-row flex-wrap gap-4 justify-center">
              <Link
                href="/signup"
                onClick={(e) => {
                  preventNav(e);
                  previewNav("/app");
                }}
                className="cursor-pointer px-6 py-3 rounded-xl border-[1px] font-medium group h-[48px] min-w-[160px] inline-flex items-center justify-center"
                style={{
                  background: `linear-gradient(to bottom, ${main}, ${secondary})`,
                  borderColor: main,
                  color: primaryCtaText,
                  boxShadow: `0 4px 32px ${hexWithAlpha(mixHex(main, secondary, 0.5), 0.7)}`,
                }}
              >
                <div className="relative overflow-hidden w-full text-center">
                  <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                  <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    const el = document.getElementById("tools");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  } catch {}
                }}
                className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border-[1px] border-white/20 text-white font-medium w-[160px] h-[48px]"
              >
                See tools
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div
            id="tools"
            className="mt-10 rounded-2xl border border-white/10 bg-black/60 p-6"
            style={{ boxShadow: cardShadow }}
          >
            <div className="text-sm font-semibold text-white">Tools included</div>
            <div className="mt-2 text-sm text-gray-400">Everything you need, in one place.</div>
            <ol className="mt-5 space-y-2 text-sm">
              {PARTNER_TOOLS.map((t, idx) => (
                <li key={`${t.name}-${idx}`} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-gray-200 font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.description}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            id="faq"
            className="mt-10 rounded-2xl border border-white/10 bg-black/60 p-6"
            style={{ boxShadow: cardShadow }}
          >
            <div className="text-sm font-semibold text-white">FAQ</div>
            <div className="mt-2 text-sm text-gray-400">Quick answers to common questions.</div>
            {safeFaq.length ? (
              <div className="mt-5 space-y-3">
                {safeFaq.map((item, idx) => (
                  <details key={`${idx}-${item.q}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <summary className="cursor-pointer text-sm text-gray-200 font-medium">{item.q || `Question ${idx + 1}`}</summary>
                    <div className="mt-2 text-sm text-gray-400 whitespace-pre-wrap">{item.a || ""}</div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">No FAQ yet.</div>
            )}
          </div>

          <div id="policies">
            <PartnerPolicies saasName={title} supportEmail={supportEmail} domain={domain} />
          </div>

          
        </div>
      </div>
    </div>
  );
}

