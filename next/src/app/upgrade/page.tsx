"use client";

import React from "react";
import NewNavbar from "@/components/NewNavbar";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";
// Use dedicated FAQ for the upgrade page to avoid changing landing page FAQ

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NewNavbar />
      <main className="flex-1">
        {/* Avantages Section */}
        <section className="py-14 md:py-20 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">All your +50 Sublaunch tools access plus…</h1>
            <p className="text-center text-sm text-gray-300 mb-8">Access nearly $300 worth of additional tools</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-purple-500/30 bg-[linear-gradient(180deg,rgba(149,65,224,0.06)_0%,rgba(124,48,199,0.06)_100%)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/tools-logos/trendtrack.png" alt="TrendTrack" className="w-16 h-16 object-contain" />
                  <h3 className="text-lg font-semibold">TrendTrack</h3>
                </div>
                <p className="text-sm text-gray-300">Exclusive access to the best tool of the market to track trending shops and ads</p>
                <div className="mt-3 inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Worth $899</div>
                <div className="mt-3 inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">Pro exclusive</div>
              </div>
              <div className="rounded-2xl border border-blue-500/30 bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,rgba(37,99,235,0.06)_100%)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/tools-logos/pipiads.png" alt="Pipiads" className="w-16 h-16 object-contain" />
                  <h3 className="text-lg font-semibold">Pipiads</h3>
                </div>
                <p className="text-sm text-gray-300">Ad spy access for your research workflow.</p>
                <div className="mt-3 inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Worth $99</div>
                <div className="mt-3 text-green-300 font-semibold drop-shadow-[0_0_10px_rgba(74,222,128,0.45)]">+1 additional 100k credits account</div>
              </div>
              <div className="rounded-2xl border border-orange-500/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.06)_0%,rgba(234,88,12,0.06)_100%)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/tools-logos/elevenlabs.png" alt="ElevenLabs" className="w-16 h-16 object-contain" />
                  <h3 className="text-lg font-semibold">ElevenLabs</h3>
                </div>
                <p className="text-sm text-gray-300">AI voice generation for content and ads.</p>
                <div className="mt-3 inline-flex items-center text-[11px] px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Worth $99</div>
                <div className="mt-3 text-green-300 font-semibold drop-shadow-[0_0_10px_rgba(74,222,128,0.45)]">+1 additional 500k credits account</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section (same as landing) */}
        <PricingSection />

        {/* FAQ */}
        <section className="py-14 md:py-20 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-12">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold font-sans mb-4">Frequently asked questions</h2>
                <p className="text-gray-300 text-sm mb-5">Still have questions? Contact our support team.</p>
              </div>
              <UpgradeFaq />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function UpgradeFaq() {
  const items = [
    { 
      q: 'What happens to my $15 legacy plan?', 
      a: "Your legacy plan will be replaced with the new plan you choose. You'll immediately get access to all new features and tools included in your upgraded plan." 
    },
    { 
      q: 'Can I keep my $15 plan?', 
      a: "The $15 plan is a legacy plan that is no longer actively maintained. While it will continue to work, you won't get access to new features or TrendTrack unless you upgrade." 
    },
    { 
      q: 'What if I run out of credits on my current plan?', 
      a: "That's a sign you need to upgrade! The Pro plan includes expanded access so you won't face this issue again." 
    },
    { 
      q: 'Is TrendTrack really exclusive to Pro?', 
      a: 'Yes, TrendTrack is only available on the Pro plan.' 
    },
    { 
      q: 'Can I cancel my upgraded plan?', 
      a: "Yes, you can cancel anytime from your account settings. We also offer a 30-day money-back guarantee if you're not satisfied." 
    },
  ];
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-2xl bg-[#0d0f14] border border-white/10">
          <button 
            onClick={() => setOpen(open===idx?null:idx)} 
            className="w-full text-left px-4 md:px-5 py-4 md:py-5 flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="text-sm md:text-base text-white/90">{it.q}</span>
            <span className={`w-5 h-5 text-white/80 transition-transform ${open===idx?'rotate-45':''}`}>+</span>
          </button>
          {open===idx && (<div className="px-4 md:px-5 pb-5 text-sm text-gray-300">{it.a}</div>)}
        </div>
      ))}
    </div>
  );
}

