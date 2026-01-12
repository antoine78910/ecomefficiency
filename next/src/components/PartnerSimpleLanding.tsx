import Link from "next/link";
import PartnerPricingClient from "@/components/PartnerPricingClient";
import { PARTNER_TOOLS } from "@/components/partnerTools";

export type PartnerFaqItem = { q: string; a: string };

export default function PartnerSimpleLanding({
  slug,
  title,
  subtitle,
  logoUrl,
  colors,
  pricing,
  faq,
}: {
  slug: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
  colors?: { main?: string; secondary?: string; accent?: string; background?: string };
  pricing?: {
    monthlyPrice?: string | number;
    yearlyPrice?: string | number;
    annualDiscountPercent?: number;
    currency?: string;
    allowPromotionCodes?: boolean;
  };
  faq?: PartnerFaqItem[];
}) {
  const main = String(colors?.main || "#9541e0");
  const secondary = String(colors?.secondary || "#7c30c7");
  const accent = String(colors?.accent || "#ab63ff");
  const background = String(colors?.background || "#000000");

  const safeFaq = Array.isArray(faq) ? faq.filter((x) => x && (x.q || x.a)) : [];

  return (
    <div className="min-h-screen text-white">
      <div
        className="min-h-screen"
        style={{
          background:
            `radial-gradient(circle at 30% 10%, ${main}2e, transparent 50%),` +
            `radial-gradient(circle at 80% 40%, ${secondary}24, transparent 55%),` +
            `radial-gradient(circle at 55% 85%, ${accent}1f, transparent 60%),` +
            `linear-gradient(to bottom, ${background}ff, ${background}ff)`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={`${title} logo`} className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-sm font-semibold">{title}</span>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{title}</div>
                <div className="text-xs text-gray-400 truncate">{subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-12">
            <div className="text-4xl md:text-5xl font-semibold leading-tight">{title}</div>
            <div className="mt-4 text-lg text-gray-300 max-w-2xl">{subtitle}</div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-6">
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

          <div className="mt-10">
            <PartnerPricingClient
              config={{
                slug,
                colors: { main, secondary },
                monthlyPrice: pricing?.monthlyPrice,
                yearlyPrice: pricing?.yearlyPrice,
                annualDiscountPercent: pricing?.annualDiscountPercent,
                currency: pricing?.currency,
                allowPromotionCodes: pricing?.allowPromotionCodes,
              }}
            />
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-6">
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

          <div className="mt-10 text-xs text-gray-600">
            Powered by <span className="text-gray-400">Ecom Efficiency Partners</span>
          </div>
        </div>
      </div>
    </div>
  );
}

