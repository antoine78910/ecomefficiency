import Image from "next/image";
import Link from "next/link";

export type CtaLogo = {
  src: string;
  alt: string;
  title?: string;
};

const DEFAULT_LOGOS: CtaLogo[] = [
  { src: "/tools-logos/semrush.png", alt: "Semrush" },
  { src: "/tools-logos/pipiads.png", alt: "Pipiads" },
  { src: "/tools-logos/chatgpt.png", alt: "ChatGPT" },
  { src: "/tools-logos/canva.png", alt: "Canva" },
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
  const shownLogos = logos.slice(0, 4);
  const remaining = Math.max(0, totalTools - shownLogos.length);

  return (
    <div
      className={[
        "rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent",
        compact ? "p-4" : "p-6",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className={compact ? "text-white font-semibold" : "text-white font-bold text-xl"}>
            Access 50+ ecom tools in one platform
          </p>
          <p className={compact ? "text-gray-300 mt-1 text-sm" : "text-gray-300 mt-2"}>
            <span className={compact ? "font-semibold text-white" : "font-bold text-white text-lg"}>$29.99/mo</span>{" "}
            <span className="text-gray-400">·</span> SEO / SPY / AI tools
          </p>
        </div>

        <div className="shrink-0">
          <div className="flex -space-x-3 justify-end">
            {shownLogos.map((l) => (
            <div
              key={l.src}
              className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-black ring-2 ring-black"
              title={l.title || l.alt}
            >
              <Image src={l.src} alt={l.alt} fill sizes="40px" loading="lazy" className="object-cover" />
            </div>
          ))}
            {remaining > 0 ? (
              <div
                className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-black ring-2 ring-black flex items-center justify-center"
                title={`${remaining} more tools`}
                aria-label={`${remaining} more tools`}
              >
                <span className="text-[11px] font-semibold text-white/90">+{remaining}</span>
              </div>
            ) : null}
          </div>
          {remaining > 0 ? (
            <div className="mt-2 flex items-center justify-end gap-2">
              <div className="flex items-center gap-1" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="w-1 h-1 rounded-full bg-white/30" />
              </div>
              <span className="text-[11px] text-gray-400">and more</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={compact ? "mt-4" : "mt-5"}>
        <Link href="/sign-up" title="Get access to 50+ ecom tools" className="flex-1">
          <button
            title="Try it now"
            className="w-full cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] px-5 py-3 rounded-xl border border-[#9541e0]/60 text-white font-medium group overflow-hidden hover:brightness-110 hover:shadow-[0_8px_40px_rgba(149,65,224,0.55)] transition-all duration-300"
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

