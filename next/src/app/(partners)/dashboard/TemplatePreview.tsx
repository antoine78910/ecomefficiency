"use client";

import React from "react";
import Image from "next/image";
import PartnerSlugClient from "@/app/(partners)/[slug]/PartnerSlugClient";

type PreviewConfig = {
  slug: string;
  saasName?: string;
  tagline?: string;
  logoUrl?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  currency?: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  annualDiscountPercent?: number;
  allowPromotionCodes?: boolean;
  defaultDiscountId?: string;
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
  const title = config.saasName || "Your SaaS";
  const tagline = config.tagline || "A modern SaaS built for your audience.";

  const main = safeColor(config.colors?.main, "#9541e0");
  const secondary = safeColor(config.colors?.secondary, "#7c30c7");
  const accent = safeColor(config.colors?.accent, "#ab63ff");
  const background = safeColor(config.colors?.background, "#000000");

  const externalUrl =
    mode === "signin"
      ? "https://ecomefficiency.com/signin"
      : mode === "signup"
        ? "https://ecomefficiency.com/signup"
        : mode === "app"
          ? "https://ecomefficiency.com/app"
          : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="text-xs text-gray-300">
          <span className="font-semibold text-white">Live preview</span> • updates instantly
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
            {config.slug ? `/${mode === "landing" ? "" : mode}`.replace(/\/$/, "") + ` • partners.ecomefficiency.com/${config.slug}` : "partners.ecomefficiency.com"}
          </div>
        </div>
      </div>

      <div
        className="relative p-6"
        style={{
          background:
            `radial-gradient(circle at 30% 10%, ${main}2e, transparent 50%),` +
            `radial-gradient(circle at 80% 40%, ${secondary}24, transparent 55%),` +
            `radial-gradient(circle at 55% 85%, ${accent}1f, transparent 60%),` +
            `linear-gradient(to bottom, ${background}cc, ${background}cc)`,
        }}
      >
        {mode === "landing" ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(config.logoUrl)} alt={`${title} logo`} className="h-9 w-auto object-contain" />
                ) : (
                  <Image
                    src="/ecomefficiency.png"
                    alt="Ecom Efficiency"
                    width={160}
                    height={52}
                    priority
                    className="h-9 w-auto object-contain opacity-90"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{title}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {config.slug ? `partners.ecomefficiency.com/${config.slug}` : "partners.ecomefficiency.com"}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 border border-white/10 bg-white/5 rounded-xl px-3 py-2">Preview</div>
            </div>

            <div className="mt-10">
              <div className="text-3xl md:text-4xl font-semibold leading-tight">{title}</div>
              <div className="mt-3 text-base text-gray-300 max-w-2xl">{tagline}</div>
            </div>

            <div className="mt-10">
              <div className="text-xl font-semibold">Checkout</div>
              <div className="mt-2 text-sm text-gray-400">Subscribe in a few clicks. Payments are handled securely by Stripe.</div>

              <PartnerSlugClient
                config={{
                  slug: config.slug,
                  saasName: config.saasName,
                  tagline: config.tagline,
                  logoUrl: config.logoUrl,
                  colors: config.colors,
                  currency: config.currency,
                  monthlyPrice: config.monthlyPrice,
                  yearlyPrice: config.yearlyPrice,
                  annualDiscountPercent: config.annualDiscountPercent,
                  allowPromotionCodes: config.allowPromotionCodes,
                  defaultDiscountId: config.defaultDiscountId,
                } as any}
              />
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-white">
                {mode === "signin" ? "Signin (exact)" : mode === "signup" ? "Signup (exact)" : "App (exact)"}
              </div>
              {externalUrl ? (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-300 hover:text-purple-200 inline-flex items-center gap-2"
                >
                  Open <span className="opacity-70">{externalUrl.replace(/^https?:\/\//, "")}</span>
                </a>
              ) : null}
            </div>

            {/* Exact copy of current pages (external). If the site sends X-Frame-Options, use Open link above. */}
            {externalUrl ? (
              <iframe
                src={externalUrl}
                className="w-full h-[780px] rounded-2xl border border-white/10 bg-black"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        )}

        <div className="mt-10 text-xs text-gray-600">
          Powered by <span className="text-gray-400">Ecom Efficiency Partners</span>
        </div>
      </div>
    </div>
  );
}

