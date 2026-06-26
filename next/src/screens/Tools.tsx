"use client";
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import JoinMembersSection from "@/components/JoinMembersSection";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import { carouselTools } from "@/data/carouselTools";
import { resolveToolSlug } from "@/data/toolsCatalog";
import ToolImage from "@/components/ToolImage";

type GalleryTool = { id: number; name: string; description: string; icon: string };

const galleryTools: GalleryTool[] = carouselTools.map((t, i) => ({ id: i + 1, name: t.name, description: t.description, icon: t.icon }));

const STARTER_NAMES = [
  'ChatGPT','Midjourney','SendShort','Capcut','Helium10','Dropship.io','ShopHunter'
];
const PRO_NAMES = [
  'Flair.ai','ChatGPT','Claude','Midjourney','Exploding Topics','Pipiads','Kalodata','WinningHunter','Capcut','SendShort','Helium10','Dropship.io','ShopHunter','Atria','Heygen','Fotor','ForePlay','ElevenLabs','Runway','Freepik','TurboScribe',
  'Higgsfield','Vmake'
];

const SLUG_OVERRIDES: Record<string, string> = {
  WinningHunter: "winninghunter",
  "Winning Hunter": "winninghunter",
  Heygen: "heygen",
  HeyGen: "heygen",
};

const Tools = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tier, setTier] = useState<'starter'|'pro'>("pro");

  const byTier = React.useMemo(() => {
    if (tier === 'starter') return galleryTools.filter(t => STARTER_NAMES.includes(t.name))
    return galleryTools
  }, [tier])

  const filteredTools = byTier.filter(tool => {
    const q = searchTerm.toLowerCase().trim();
    return tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
  });

  // Monthly price indicators per tool
  const PRICE_MAP: Record<string, number> = {
    'Pipiads': 280,
    'Atria': 159,
    'Runway': 95,
    'Heygen': 80,
    'Flair.ai': 149,
    'Exploding Topics': 39,
    'Trendtrack': 89,
    'ElevenLabs': 220,
    'Fotor': 15,
    'ForePlay': 149,
    'Kalodata': 129.99,
    'Helium10': 79,
    'Dropship.io': 49,
    'WinningHunter': 79,
    'ShopHunter': 75,
    'Midjourney': 72,
    'Canva': 449,
    'Freepik': 40,
    'TurboScribe': 20,
    'ChatGPT': 20,
    'Claude': 200,
    'Semrush': 399,
    'Similarweb': 199,
    
    'Higgsfield': 250,
    'Vmake': 29.99,
    'SendShort': 59,
    'Capcut': 23,
    'Brain.fm': 9.99,
  }

  const renderPrice = (name: string) => {
    const price = PRICE_MAP[name]
    if (!price) return null
    return (
      <span className="absolute top-2 right-2 z-10 text-[10px] leading-none px-2 py-1 rounded-full border text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] bg-gradient-to-tr from-purple-500/30 to-purple-400/20 border-purple-400/30 md:top-auto md:bottom-3 md:right-3 md:text-sm md:px-2.5 md:py-1">
        ${price.toFixed(price % 1 ? 2 : 0)}/mo
      </span>
    )
  }

  const isProOnly = (name: string) => {
    const normalized = name.replace(/\s+/g, ' ').trim().toLowerCase()
    return (
      PRO_NAMES.map(n => n.replace(/\s+/g, ' ').trim().toLowerCase()).includes(normalized) &&
      !STARTER_NAMES.map(n => n.replace(/\s+/g, ' ').trim().toLowerCase()).includes(normalized)
    )
  }

  // Removed tier badges per request

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <NewNavbar />

      {/* Hero Section with Back Button */}
      <div className="py-8 md:py-16 px-6 lg:px-8 bg-gradient-to-b from-black to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 md:mb-6">
              +50 <span className="gradient-text">Premium Tools</span>
            </h1>
            <p className="text-xl text-gray-400 mb-4 md:mb-8 max-w-3xl mx-auto">
              Access the best Ecom tools
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="py-6 md:py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 md:mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Glass radio group toggle (Starter / Pro) */}
            <div className="relative inline-flex items-center overflow-hidden rounded-2xl backdrop-blur-md border border-white/15 bg-white/10 shadow-[inset_1px_1px_4px_rgba(255,255,255,0.2),inset_-1px_-1px_6px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.15)] self-start shrink-0" role="radiogroup">
              {/* Glider */}
              <div
                className="absolute top-0 bottom-0 w-1/2 rounded-xl transition-transform duration-[400ms] [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]"
                style={{ transform: `translateX(${tier==='starter' ? '0%' : '100%'})`, background: tier==='starter' ? 'linear-gradient(135deg, rgba(192,192,192,0.35), rgba(224,224,224,0.8))' : 'linear-gradient(135deg, rgba(255,215,0,0.35), rgba(255,204,0,0.8))', boxShadow: tier==='starter' ? '0 0 12px rgba(192,192,192,0.45), inset 0 0 8px rgba(255,255,255,0.35)' : '0 0 12px rgba(255,215,0,0.45), inset 0 0 8px rgba(255,235,150,0.35)'}}
              />
              {(['starter','pro'] as const).map((opt) => (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={tier === opt}
                  aria-label={`Filter ${opt}`}
                  onClick={() => setTier(opt)}
                  className={`relative z-[1] min-w-[92px] h-9 px-4 text-sm font-semibold tracking-wide capitalize transition-colors ${tier===opt ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Grid - using same visual style as the carousel cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-6">
            {filteredTools.map((tool) => {
              const toolNameLower = String(tool.name || '').trim().toLowerCase();
              const isFreepik = toolNameLower === 'freepik';
              const isClaude = toolNameLower === 'claude';
              const cardIcon = isFreepik ? '/tools-logos/freepik.png' : tool.icon;
              const card = (
                <Card
                  className="relative p-2.5 md:p-4 bg-gray-900 border border-white/10 rounded-2xl cursor-default"
                >
                  {isProOnly(tool.name) && (
                    <span className="absolute -top-2 -left-2 text-[10px] px-2 py-0.5 rounded-full bg-[linear-gradient(135deg,#ffd70055,#ffcc00)] text-white border border-[#ffcc00]/30 shadow-[0_0_12px_rgba(255,215,0,0.45)]">
                      Pro only
                    </span>
                  )}
                  {renderPrice(tool.name)}
                  <div className="w-full h-24 md:h-40 rounded-xl overflow-hidden mb-2 md:mb-4 bg-black flex items-center justify-center">
                    <ToolImage
                      toolName={tool.name}
                      icon={cardIcon}
                      className={
                        isClaude
                          ? "w-full h-full object-contain bg-black p-2 md:p-3"
                          : "w-full h-full object-contain bg-black"
                      }
                    />
                  </div>
                  <h3 className="text-white font-semibold text-sm md:text-base mb-1">{tool.name}</h3>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{tool.description}</p>
                </Card>
              );

              const rawName = String(tool.name || "");
              const cleanName = rawName.trim();
              const normalizedKey = cleanName.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
              const forcedSlug =
                normalizedKey === "winninghunter"
                  ? "winninghunter"
                  : normalizedKey === "shophunter"
                    ? "shophunter"
                    : normalizedKey === "brainfm"
                      ? "brain-fm"
                      : null;
              const slug = forcedSlug || resolveToolSlug(cleanName) || SLUG_OVERRIDES[cleanName] || SLUG_OVERRIDES[rawName] || null;
              const href = slug ? `/tools/${slug}` : null;

              return (
                <div key={tool.id}>
                  {href ? (
                    <Link href={href} title={`${tool.name} tool page`} className="block">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </div>
              );
            })}
          </div>
          {/* No Results */}
          {filteredTools.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No tools found matching your search.</p>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center py-16">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to access all these tools?
            </h3>
            {/* Arc gradient removed per request */}
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Get instant access to all premium tools at a fraction of the cost.
            </p>
            <Link href="/sign-up">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]">
                <div className="relative overflow-hidden w-full text-center">
                  <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">Get Started</p>
                  <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">Get Started</p>
                </div>
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* JoinMembersSection removed on /tools per request */}
      <Footer />
    </div>
  );
};

export default Tools;
