"use client";

import React from "react";
import Image from "next/image";
import NewNavbar from "@/components/NewNavbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PartnerService = {
  title: string;
  description: string;
  href: string;
  logoSrc: string;
};

type Partner = {
  name: string;
  description: string;
  offer: string;
  websiteUrl: string;
  logoSrc: string;
};

const partnerServices: PartnerService[] = [
  // Replace these placeholders with your real partner services.
  {
    title: "Proxies",
    description: "Real-user and residential IPs for safer multi-accounting.",
    href: "/partners",
    logoSrc: "/ecomefficiency.png",
  },
  {
    title: "Payment processing",
    description: "Vetted PSPs and payment solutions for your business.",
    href: "/partners",
    logoSrc: "/ecomefficiency.png",
  },
  {
    title: "Anti-detect browser",
    description: "Manage multiple profiles and accounts under one roof.",
    href: "/partners",
    logoSrc: "/ecomefficiency.png",
  },
  {
    title: "Automation / lead gen",
    description: "Automate workflows to scale outreach and acquisition.",
    href: "/partners",
    logoSrc: "/ecomefficiency.png",
  },
];

const partners: Partner[] = [
  // Replace these placeholders with your real partners.
  {
    name: "Partner #1",
    description: "Short description of what this partner does and why it matters to your audience.",
    offer: "Exclusive offer: -20% for Ecom Efficiency members",
    websiteUrl: "https://example.com",
    logoSrc: "/ecomefficiency.png",
  },
  {
    name: "Partner #2",
    description: "Another partner description. Keep it to 1–2 lines for best readability.",
    offer: "Exclusive offer: free trial + bonus credits",
    websiteUrl: "https://example.com",
    logoSrc: "/ecomefficiency.png",
  },
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-black text-white">
      <NewNavbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />

        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full text-purple-300 text-sm font-medium">
              ✦ PARTNERS
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-normal">Partners</h1>
            <p className="mt-4 text-gray-300 text-base md:text-lg">
              Get the best deals and discounts from partners we trust.
            </p>
          </div>

          {/* Partner services (Uproas-like) */}
          <div className="mt-10">
            <div className="text-sm font-semibold text-white">Partner Services</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {partnerServices.map((s) => (
                <Card
                  key={s.title}
                  className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 flex flex-col"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                      <Image
                        src={s.logoSrc}
                        alt={`${s.title} logo`}
                        fill
                        sizes="48px"
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{s.title}</div>
                      <div className="text-xs text-gray-400">Partner service</div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-gray-300 leading-relaxed">{s.description}</p>

                  <div className="mt-6 pt-2 mt-auto">
                    <a href={s.href} className="inline-block">
                      <Button
                        variant="outline"
                        className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        Learn more
                      </Button>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Offers by our partners */}
          <div className="mt-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Offers by our partners</h2>
            <p className="mt-3 text-gray-300">Take advantage of unique terms and discounts.</p>

            <div className="mt-8 space-y-4">
              {partners.map((p) => (
                <Card
                  key={p.name}
                  className="bg-[#0d0e12] border border-white/10 rounded-2xl p-5 md:p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="relative h-12 w-12 rounded-xl border border-white/10 bg-black/30 overflow-hidden flex-shrink-0">
                        <Image
                          src={p.logoSrc}
                          alt={`${p.name} logo`}
                          fill
                          sizes="48px"
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-white font-semibold">{p.name}</div>
                        <div className="mt-1 text-sm text-gray-300 leading-relaxed">{p.description}</div>
                        <div className="mt-3 text-sm text-white/95">
                          <span className="font-semibold">Offer:</span> <span className="text-gray-200">{p.offer}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <a href={p.websiteUrl} target="_blank" rel="noreferrer noopener">
                        <Button className="w-full md:w-auto cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.45)] border border-[#9541e0] hover:brightness-110">
                          Go to website
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

