"use client";

import React from "react";
import DomainSignInClient from "@/app/domains/[domain]/signin/DomainSignInClient";
import DomainSignUpClient from "@/app/domains/[domain]/signup/DomainSignUpClient";
import DomainAppClient from "@/app/domains/_components/DomainAppClient";
import PartnerSimpleLanding from "@/components/PartnerSimpleLanding";
import FloatingPricingWidget from "@/components/FloatingPricingWidget";
import WhiteLabelPricingModal from "@/components/WhiteLabelPricingModal";

type PreviewConfig = {
  slug: string;
  saasName?: string;
  tagline?: string;
  logoUrl?: string;
  supportEmail?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  currency?: string;
  offerTitle?: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  annualDiscountPercent?: number;
  allowPromotionCodes?: boolean;
  defaultDiscountId?: string;
  faq?: { q: string; a: string }[];
  titleHighlight?: string;
  titleHighlightColor?: "accent" | "main" | "secondary";
  subtitleHighlight?: string;
  subtitleHighlightColor?: "accent" | "main" | "secondary";
};

function safeColor(hex: string | undefined, fallback: string) {
  const v = String(hex || "").trim();
  if (!v) return fallback;
  // accept #rgb/#rrggbb only
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return v;
  return fallback;
}

export default function TemplatePreview({ config }: { config: PreviewConfig }) {
  const [mode, setMode] = React.useState<"landing" | "signin" | "signup" | "app">("landing");
  const [previewBilling, setPreviewBilling] = React.useState<"month" | "year">("month");
  const [showPaywall, setShowPaywall] = React.useState(false);
  const lastModeRef = React.useRef<typeof mode>("landing");
  const title = config.saasName || "Your SaaS";
  const tagline = config.tagline || "A modern SaaS built for your audience.";

  const main = safeColor(config.colors?.main, "#9541e0");
  const secondary = safeColor(config.colors?.secondary, "#7c30c7");
  const accent = safeColor(config.colors?.accent, "#ab63ff");
  const background = safeColor(config.colors?.background, "#000000");

  const onPreviewNavigate = React.useCallback((path: "/signup" | "/signin" | "/app") => {
    if (path === "/signin") setMode("signin");
    else if (path === "/signup") setMode("signup");
    else {
      setMode("app");
      setShowPaywall(true);
    }
  }, []);

  // Ensure the paywall shows up again when switching the preview to "App" mode
  // (but allow closing it while staying in App mode).
  React.useEffect(() => {
    const prev = lastModeRef.current;
    if (mode === "app" && prev !== "app") setShowPaywall(true);
    if (mode !== "app") setShowPaywall(false);
    lastModeRef.current = mode;
  }, [mode]);


  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="text-xs text-gray-300">
          <span className="font-semibold text-white">Live preview</span> ÔÇó updates instantly
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(
              [
                ["landing", "Landing"],
                ["signin", "Signin"],
                ["signup", "Signup"],
                ["app", "App"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  mode === k ? "bg-white/10 text-white" : "text-gray-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[55%]">
            {config.slug ? `/${mode === "landing" ? "" : mode}`.replace(/\/$/, "") + ` ÔÇó partners.ecomefficiency.com/${config.slug}` : "partners.ecomefficiency.com"}
          </div>
        </div>
      </div>

      <div className="relative p-0 bg-black">
        {mode === "landing" ? (
          <div className="relative h-[740px] overflow-hidden">
            <div className="h-full overflow-auto">
              <PartnerSimpleLanding
                slug={config.slug}
                title={title}
                subtitle={tagline}
                logoUrl={config.logoUrl}
                supportEmail={config.supportEmail}
                preview
                onPreviewNavigate={onPreviewNavigate}
                hideFloatingPricingWidget
                colors={{
                  main,
                  secondary,
                  accent,
                  background,
                }}
                pricing={{
                  monthlyPrice: config.monthlyPrice,
                  yearlyPrice: config.yearlyPrice,
                  offerTitle: config.offerTitle,
                  annualDiscountPercent: 20,
                  currency: config.currency,
                  allowPromotionCodes: config.allowPromotionCodes,
                }}
                faq={config.faq || []}
                titleHighlight={config.titleHighlight}
                titleHighlightColor={config.titleHighlightColor}
                subtitleHighlight={config.subtitleHighlight}
                subtitleHighlightColor={config.subtitleHighlightColor}
              />
            </div>

            {/* Keep widget pinned to the preview viewport (not the scroll content) */}
            <FloatingPricingWidget
              slug={config.slug}
              saasName={title}
              offerTitle={config.offerTitle}
              supportEmail={config.supportEmail}
              preview
              onPreviewNavigate={onPreviewNavigate}
              monthlyPrice={config.monthlyPrice}
              yearlyPrice={config.yearlyPrice}
              annualDiscountPercent={config.annualDiscountPercent}
              currency={config.currency}
              allowPromotionCodes={config.allowPromotionCodes}
              main={main}
              secondary={secondary}
              accent={accent}
            />
          </div>
        ) : mode === "signin" ? (
          <DomainSignInClient
            title={title}
            subtitle="Sign in"
            logoUrl={config.logoUrl}
            colors={{ main, secondary, accent }}
            preview
          />
        ) : mode === "signup" ? (
          <DomainSignUpClient
            title={title}
            subtitle="Sign up"
            logoUrl={config.logoUrl}
            colors={{ main, secondary, accent }}
            preview
          />
        ) : (
          <div className="relative h-[740px] overflow-auto">
            <DomainAppClient title={title} logoUrl={config.logoUrl} slug={config.slug} colors={{ main, accent }} preview />
            {showPaywall ? (
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2"
                onClick={() => setShowPaywall(false)}
              >
                <div
                  className="bg-gray-900 border border-white/10 rounded-2xl p-4 w-full max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <WhiteLabelPricingModal
                    billing={previewBilling}
                    onPick={(b) => setPreviewBilling(b)}
                    onContinue={() => {}}
                    loading={false}
                    pricing={{
                      currency: config.currency,
                      offerTitle: config.offerTitle,
                      monthlyPrice: config.monthlyPrice,
                      yearlyPrice: config.yearlyPrice,
                      annualDiscountPercent: config.annualDiscountPercent,
                    }}
                    colors={{ main, accent }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}

        
      </div>
    </div>
  );
}

