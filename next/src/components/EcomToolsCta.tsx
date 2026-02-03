import Image from "next/image";
import Link from "next/link";

export type CtaLogo = {
  src: string;
  alt: string;
  title?: string;
};

// CDN cache-bust for static CTA logo assets.
// Update this string when swapping any CTA logo file.
const CTA_LOGO_VERSION = "2026-01-31-01";

const DEFAULT_LOGOS: CtaLogo[] = [
  { src: `/tools-logos/cta-logo-1.png?v=${CTA_LOGO_VERSION}`, alt: "Higgsfield" },
  { src: `/tools-logos/cta-logo-2.png?v=${CTA_LOGO_VERSION}`, alt: "Kalodata" },
  { src: `/tools-logos/cta-logo-3.png?v=${CTA_LOGO_VERSION}`, alt: "Canva" },
  { src: `/tools-logos/cta-logo-4.png?v=${CTA_LOGO_VERSION}`, alt: "Semrush" },
  { src: `/tools-logos/cta-logo-5.png?v=${CTA_LOGO_VERSION}`, alt: "Pipiads" },
] as const;

export default function EcomToolsCta({
  compact,
  logos = DEFAULT_LOGOS,
  totalTools = 50,
}: {
  compact?: boolean;
  logos?: CtaLogo[];
  totalTools?: number;
}) {
  const shownLogos = logos.slice(0, 5);
  const remaining = Math.max(0, totalTools - shownLogos.length);

  return (
    <div
      className={[
        "rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent",
        compact ? "p-4" : "p-6",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={compact ? "text-white font-semibold" : "text-white font-bold text-xl"}>
          Access 50+ Ecom tools in one platform
        </p>
        <div className="shrink-0 text-right">
          <div className={compact ? "text-sm text-white font-semibold" : "text-white font-bold text-lg"}>$29.99/mo</div>
          <div className="text-xs text-gray-400">SEO / SPY / AI tools</div>
        </div>
      </div>

      <div className={compact ? "mt-3" : "mt-4"}>
        <div className="flex items-center justify-start">
          <div className="flex -space-x-3">
          {shownLogos.map((l) => (
            <div
              key={l.src}
              className={["relative rounded-full overflow-hidden border border-white/15 bg-black ring-2 ring-black", compact ? "w-9 h-9" : "w-10 h-10"].join(" ")}
              title={l.title || l.alt}
            >
              <Image src={l.src} alt={l.alt} fill sizes={compact ? "36px" : "40px"} loading="lazy" className="object-cover" />
            </div>
          ))}
          {remaining > 0 ? (
            <div
              className={[
                "relative rounded-full overflow-hidden border border-white/15 bg-black ring-2 ring-black flex items-center justify-center",
                compact ? "w-9 h-9" : "w-10 h-10",
              ].join(" ")}
              title={`${remaining} more tools`}
              aria-label={`${remaining} more tools`}
            >
              <span className="text-[11px] font-semibold text-white/90">+{remaining}</span>
            </div>
          ) : null}
          </div>
          {remaining > 0 ? <span className="text-[11px] text-gray-400 ml-3">and more</span> : null}
        </div>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        <Link href="/sign-up" title="Get access to 50+ Ecom tools" className="flex-1">
          <button
            title="Try it now"
            className={[
              "w-full cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] rounded-xl border border-[#9541e0]/60 text-white font-medium group overflow-hidden hover:brightness-110 hover:shadow-[0_8px_40px_rgba(149,65,224,0.55)] transition-all duration-300",
              compact ? "px-4 py-2.5 text-sm" : "px-5 py-3",
            ].join(" ")}
          >
            <span className="relative overflow-hidden w-full text-center block">
              <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[900ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                Try it now
              </span>
              <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[900ms] ease-[cubic-bezier(0.19,1,0.22,1)]">
                Try it now
              </span>
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}

