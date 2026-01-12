"use client";

import React from "react";
import Image from "next/image";
import DomainSignInClient from "@/app/domains/[domain]/signin/DomainSignInClient";
import DomainSignUpClient from "@/app/domains/[domain]/signup/DomainSignUpClient";
import { PARTNER_TOOLS } from "@/components/partnerTools";

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
  faq?: { q: string; a: string }[];
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

            <div className="mt-10 rounded-2xl border border-white/10 bg-black/60 p-6">
              <div className="text-sm font-semibold text-white">Tools included</div>
              <div className="mt-2 text-sm text-gray-400">Everything you need, in one place.</div>
              <ol className="mt-5 space-y-2 text-sm">
                {PARTNER_TOOLS.slice(0, 10).map((t, idx) => (
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
              <div className="mt-4 text-xs text-gray-500">(+ {Math.max(PARTNER_TOOLS.length - 10, 0)} more)</div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-6">
              <div className="text-sm font-semibold text-white">Pricing</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {(config.monthlyPrice || "29.99").toString()}
                <span className="text-base text-gray-400 font-normal">€</span>
                <span className="text-base text-gray-400 font-normal">/month</span>
              </div>
              <div className="mt-2 text-sm text-gray-400">Preview only (checkout disabled).</div>
              <button
                type="button"
                disabled
                className="mt-5 w-full h-11 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 text-gray-400 cursor-not-allowed"
              >
                Subscribe with Stripe
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/60 p-6">
              <div className="text-sm font-semibold text-white">FAQ</div>
              <div className="mt-2 text-sm text-gray-400">Editable in Dashboard → Page.</div>
              {Array.isArray(config.faq) && config.faq.length ? (
                <div className="mt-4 space-y-3">
                  {config.faq.slice(0, 3).map((item, idx) => (
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
          </>
        ) : mode === "signin" ? (
          <DomainSignInClient title={title} subtitle="Sign in" logoUrl={config.logoUrl} preview />
        ) : mode === "signup" ? (
          <DomainSignUpClient title={title} subtitle="Sign up" logoUrl={config.logoUrl} preview />
        ) : (
          <div className="min-h-[420px]">
            <div className="text-xl font-semibold">App</div>
            <div className="mt-2 text-sm text-gray-400">Preview of the app experience (exact UI is served on custom domains at /app).</div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ["AdsPower", "Step-by-step login"],
                ["Canva", "Access + templates"],
                ["Brain.fm", "Focus music"],
              ].map(([h, d]) => (
                <div key={h} className="rounded-2xl border border-white/10 bg-black/60 p-5">
                  <div className="text-sm font-semibold">{h}</div>
                  <div className="mt-2 text-xs text-gray-400">{d}</div>
                  <div className="mt-4 h-9 rounded-xl border border-white/10 bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-xs text-gray-600">
          Powered by <span className="text-gray-400">Ecom Efficiency Partners</span>
        </div>
      </div>
    </div>
  );
}

