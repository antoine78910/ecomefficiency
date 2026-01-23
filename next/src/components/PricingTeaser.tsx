import Link from "next/link";

export default function PricingTeaser() {
  return (
    <section className="bg-black py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Simple pricing. <span className="gradient-text">Maximum savings.</span>
          </h2>
          <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
            Access 45+ premium SEO / SPY / AI tools in one platform and save $4000+ every month.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-gray-900/40 p-6">
            <p className="text-sm text-gray-400 mb-2">Starter</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-white tabular-nums">$19.99</span>
              <span className="text-sm text-gray-400 mb-1">/mo</span>
            </div>
            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>Access to 45+ premium tools</li>
              <li>Fast onboarding</li>
              <li>Community access</li>
            </ul>
            <Link href="/pricing" title="See Starter plan details">
              <button className="w-full h-[46px] rounded-xl border border-white/10 bg-black text-white hover:border-purple-500/40 transition-colors">
                See pricing details
              </button>
            </Link>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-[linear-gradient(to_bottom,rgba(149,65,224,0.18),rgba(124,48,199,0.10))] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-200">Pro</p>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
                Most popular
              </span>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-bold text-white tabular-nums">$29.99</span>
              <span className="text-sm text-gray-300 mb-1">/mo</span>
            </div>
            <ul className="text-sm text-gray-200 space-y-2 mb-6">
              <li>Everything in Starter</li>
              <li>Best-in-class tool stack</li>
              <li>Priority onboarding</li>
            </ul>
            <Link href="/sign-up" title="Try Ecom Efficiency now">
              <button className="w-full h-[46px] rounded-xl bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-white shadow-[0_4px_32px_0_rgba(149,65,224,0.35)] border border-[#9541e0]/60 hover:brightness-110 transition-all">
                Try it now
              </button>
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" title="View full pricing page" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all plan details →
          </Link>
        </div>
      </div>
    </section>
  );
}

