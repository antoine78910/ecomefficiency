import { readPartnerForDomain } from "./_domain";
import PartnerSimpleLanding from "@/components/PartnerSimpleLanding";

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
  const subtitle = String(cfg?.tagline || "A modern SaaS built for your audience.");
  const supportEmail = cfg?.supportEmail ? String(cfg.supportEmail) : undefined;
  const faq = Array.isArray((cfg as any)?.faq) ? ((cfg as any).faq as any[]) : [];
  const titleHighlight = String((cfg as any)?.titleHighlight || "");
  const titleHighlightColor = ((cfg as any)?.titleHighlightColor as any) || "accent";
  const subtitleHighlight = String((cfg as any)?.subtitleHighlight || "");
  const subtitleHighlightColor = ((cfg as any)?.subtitleHighlightColor as any) || "accent";

  return (
    <PartnerSimpleLanding
      slug={info.slug}
      title={title}
      subtitle={subtitle}
      supportEmail={supportEmail}
      domain={info.domain}
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
      titleHighlight={titleHighlight}
      titleHighlightColor={titleHighlightColor}
      subtitleHighlight={subtitleHighlight}
      subtitleHighlightColor={subtitleHighlightColor}
    />
  );
}

