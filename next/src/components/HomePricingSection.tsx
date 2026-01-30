import Link from "next/link";

export default function HomePricingSection() {
  return (
    <section className="py-16 md:py-24 bg-black relative overflow-hidden" id="pricing">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full text-purple-400 text-sm font-medium mb-4">
            ✦ PRICING
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white">Pick your plan</h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Fast checkout on the pricing page. No heavy geo-detection on the homepage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-white text-xl font-semibold">Starter</div>
            <div className="mt-2 text-gray-400 text-sm">Core access to the tool suite.</div>
            <div className="mt-6 text-3xl font-bold text-white">$19.99</div>
            <div className="text-gray-500 text-sm">/month</div>
            <div className="mt-6">
              <Link
                href="/pricing?checkout=starter&billing=monthly"
                prefetch={false}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 py-2.5 text-white font-medium"
              >
                Get Starter
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-400/30 bg-[linear-gradient(to_bottom,rgba(149,65,224,0.16),rgba(0,0,0,0.7))] p-6 shadow-[0_0_0_1px_rgba(149,65,224,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-white text-xl font-semibold">Pro</div>
              <div className="text-[11px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20">
                Most popular
              </div>
            </div>
            <div className="mt-2 text-gray-300/80 text-sm">Everything in Starter + more tools.</div>
            <div className="mt-6 text-3xl font-bold text-white">$29.99</div>
            <div className="text-gray-400 text-sm">/month</div>
            <div className="mt-6">
              <Link
                href="/pricing?checkout=pro&billing=monthly"
                prefetch={false}
                className="inline-flex w-full items-center justify-center rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 px-4 py-2.5 text-white font-semibold"
              >
                Get Pro
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-white text-xl font-semibold">Community</div>
            <div className="mt-2 text-gray-400 text-sm">White‑label SaaS for your audience.</div>
            <div className="mt-6 text-3xl font-bold text-white">Custom</div>
            <div className="text-gray-500 text-sm">pricing</div>
            <div className="mt-6">
              <Link
                href="https://partners.ecomefficiency.com/"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 py-2.5 text-white font-medium"
              >
                Become a partner
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link prefetch={false} href="/pricing" className="text-sm text-gray-300 hover:text-white underline underline-offset-4">
            See yearly billing, coupons, currency and full details →
          </Link>
        </div>
      </div>
    </section>
  );
}

