import Link from "next/link";
import PartnerSlugClient from "@/app/(partners)/[slug]/PartnerSlugClient";
import { readPartnerForDomain } from "./_domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DomainRootPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg = info.cfg || {};

  if (!info.slug) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-6">
          <div className="text-lg font-semibold">Domain not connected yet</div>
          <div className="mt-2 text-sm text-gray-300">
            We received a request for <span className="font-mono text-gray-100">{info.domain || domain}</span>, but it’s not mapped to any partner slug.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://partners.ecomefficiency.com/dashboard?tab=settings"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110"
            >
              Open domain setup
            </a>
            <a
              href="/signin"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  const colors = (cfg as any)?.colors || {};
  const title = String(cfg?.saasName || info.slug);
  const tagline = String(cfg?.tagline || "A modern SaaS built for your audience.");

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
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2"
            >
              Sign in
            </Link>
            <a
              href={`https://partners.ecomefficiency.com/dashboard?slug=${encodeURIComponent(info.slug)}`}
              className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2"
            >
              Admin
            </a>
          </div>
        </div>

        <div className="mt-12">
          <div className="text-4xl md:text-5xl font-semibold leading-tight">{title}</div>
          <div className="mt-4 text-lg text-gray-300 max-w-2xl">{tagline}</div>
        </div>

        <div className="mt-10">
          <PartnerSlugClient
            config={{
              slug: info.slug,
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

