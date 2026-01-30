import { headers } from "next/headers";
import PlayButtonVideo from "@/components/PlayButtonVideo";

function cleanHost(h: string) {
  return String(h || "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

function isPartnersHost(host: string) {
  const bare = cleanHost(host);
  return bare === "partners.localhost" || bare.startsWith("partners.");
}

export default async function VideoSection() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const partners = isPartnersHost(host);

  return (
    <section className="relative bg-black -mt-px">
      {/* Violet bridge gradient, lifted into header; combines radial + linear for smooth blend */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-96 w-[90%] sm:w-[48rem] md:w-[60rem] lg:w-[72rem] xl:w-[80rem] bg-gradient-to-b from-purple-600/15 to-transparent blur-3xl rounded-full"
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        {partners ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative mx-auto w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src="/demo.mp4"
                  poster="/ecomefficiency.png"
                  loop
                  playsInline
                  muted
                  autoPlay
                  preload="auto"
                  controls={false}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
            {/* Show a preview image while loading, then try autoplay. If autoplay is blocked, keep a Play button overlay. */}
            <PlayButtonVideo
              src="/demo.mp4"
              poster="/ecomefficiency.png"
              title="Ecom Efficiency demo"
              autoPlayOnVisible
              loop
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
