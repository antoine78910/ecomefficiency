import Image from "next/image";
import Link from "next/link";

const LOGOS = [
  { src: "/tools-logos/semrush.png", alt: "Semrush" },
  { src: "/tools-logos/pipiads.png", alt: "Pipiads" },
  { src: "/tools-logos/chatgpt.png", alt: "ChatGPT" },
  { src: "/tools-logos/canva.png", alt: "Canva" },
] as const;

export default function EcomToolsCta({ compact }: { compact?: boolean }) {
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

        <div className="flex -space-x-3 shrink-0">
          {LOGOS.map((l) => (
            <div
              key={l.src}
              className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 bg-black ring-2 ring-black"
              title={l.alt}
            >
              <Image src={l.src} alt={l.alt} fill sizes="40px" loading="lazy" className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className={compact ? "mt-4 flex gap-2" : "mt-5 flex gap-3"}>
        <Link href="/sign-up" title="Get access to 50+ ecom tools" className="flex-1">
          <button
            title="Get access to 50+ ecom tools"
            className="w-full cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.55)] px-5 py-3 rounded-xl border border-[#9541e0]/60 text-white font-medium"
          >
            Get access
          </button>
        </Link>
        <Link
          href="/pricing"
          title="View pricing"
          className="inline-flex items-center justify-center px-4 rounded-xl border border-white/15 text-white/90 hover:text-white hover:border-white/25 transition-colors"
        >
          Pricing
        </Link>
      </div>
    </div>
  );
}

