"use client";

import React from "react";
import Image from "next/image";
import NewNavbar from "@/components/NewNavbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Partner = {
  name: string;
  description: string;
  offer: string;
  websiteUrl: string;
  logoSrc: string;
};

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
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-normal">
              Partner websites & offers
            </h1>
            <p className="mt-4 text-gray-300 text-base md:text-lg">
              A curated list of partner sites, with clear descriptions, the offer, and a direct link.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((p) => (
              <Card
                key={p.name}
                className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 flex flex-col"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                    <Image
                      src={p.logoSrc}
                      alt={`${p.name} logo`}
                      fill
                      sizes="48px"
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">Partner</div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-300 leading-relaxed">{p.description}</p>

                <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
                  <div className="text-xs font-semibold text-purple-200">Offer</div>
                  <div className="mt-1 text-sm text-purple-100">{p.offer}</div>
                </div>

                <div className="mt-6 pt-2 mt-auto">
                  <a href={p.websiteUrl} target="_blank" rel="noreferrer noopener">
                    <Button className="w-full cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.45)] border border-[#9541e0] hover:brightness-110">
                      Go to the website
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

