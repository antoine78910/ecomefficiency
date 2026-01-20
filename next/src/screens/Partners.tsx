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
          {/* Offers by our partners */}
          <div className="mt-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white">Offers by our partners</h2>
              <p className="mt-3 text-gray-300 text-base md:text-lg">Take advantage of unique terms and discounts</p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {partners.map((p) => (
                <Card
                  key={p.name}
                  className="bg-[#0d0e12] border border-white/10 rounded-3xl p-6 flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                >
                  {/* Logo banner */}
                  <div className="relative rounded-2xl border border-white/10 bg-black/50 p-4 h-24 flex items-center justify-center overflow-hidden">
                    <div className="relative w-full h-full">
                      <Image
                        src={p.logoSrc}
                        alt={`${p.name} logo`}
                        fill
                        sizes="(max-width: 768px) 80vw, 320px"
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-white font-semibold text-lg">{p.name}</div>
                    <div className="mt-2 text-sm text-gray-200 leading-relaxed">{p.description}</div>
                    <div className="mt-3 text-sm text-purple-300 font-medium">{p.offer}</div>
                  </div>

                  <div className="mt-6 pt-2 mt-auto">
                    <a href={p.websiteUrl} target="_blank" rel="noreferrer noopener">
                      <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        Go to website
                      </Button>
                    </a>
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

