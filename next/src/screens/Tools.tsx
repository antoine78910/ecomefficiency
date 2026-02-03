"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import JoinMembersSection from "@/components/JoinMembersSection";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import { carouselTools } from "@/data/carouselTools";
import { resolveToolSlug } from "@/data/toolsCatalog";
import { seoToolsCatalog } from "@/data/seoToolsCatalog";
import ToolImage from "@/components/ToolImage";
import { useRouter, usePathname } from "next/navigation";

type GalleryTool = { id: number; name: string; description: string; icon: string };

const galleryTools: GalleryTool[] = carouselTools.map((t, i) => ({ id: i + 1, name: t.name, description: t.description, icon: t.icon }));

const STARTER_NAMES = [
  'ChatGPT','Midjourney','SendShort','Capcut','Helium10','Dropship.io','ShopHunter','WinningHunter'
];
const PRO_NAMES = [
  'Flair.ai','ChatGPT','Midjourney','Exploding Topics','Pipiads','Kalodata','WinningHunter','Capcut','SendShort','Helium10','Dropship.io','ShopHunter','Atria','Heygen','Fotor','ForePlay','ElevenLabs','Runway','Freepik','TurboScribe',
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
  const [seoOpen, setSeoOpen] = useState(false)
  const router = useRouter();
  const pathname = usePathname();

  const normalizeSeoName = React.useCallback((input: string) => {
    return String(input || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\+/g, " ")
      .replace(/\./g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const seoSlugByName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of seoToolsCatalog) {
      m.set(normalizeSeoName(t.name), t.slug);
    }
    return m;
  }, [normalizeSeoName]);

  React.useEffect(() => {
    try {
      let p: string = '';
      if (pathname) {
        p = pathname;
      } else if (typeof window !== 'undefined') {
        try {
          p = window.location.pathname || '';
        } catch {
          p = '';
        }
      }
      if (p && p.endsWith('/tools/seo')) {
        setSeoOpen(true);
      } else {
        setSeoOpen(false);
      }
    } catch (error) {
      // Silently handle errors
      setSeoOpen(false);
    }
  }, [pathname])

  // Build list with "+30 SEO Tools" tile replacing Ubersuggest/Semrush
  const withSeoTile: GalleryTool[] = React.useMemo(() => {
    const list = galleryTools.filter(t => t.name !== 'Ubersuggest' && t.name !== 'Semrush')
    const seoTile: GalleryTool = { id: 0, name: '+30 SEO Tools', description: 'Includes: Semrush, Ubersuggest, …', icon: '/tools-logos/seo.png' }
    const base = [...list, seoTile]
    const weight = (n: string) => (n === '+30 SEO Tools' ? 9999 : 1)
    const ordered = base.sort((a, b) => weight(a.name) - weight(b.name))
    return ordered.map((t, i) => ({ ...t, id: i + 1 }))
  }, [])

  const byTier = React.useMemo(() => {
    if (tier === 'starter') return withSeoTile.filter(t => t.name === '+30 SEO Tools' || STARTER_NAMES.includes(t.name))
    // Pro shows everything
    return withSeoTile
  }, [tier, withSeoTile])

  const SEO_INCLUDED = [
    'semrush','ubersuggest','academun','writehuman','seobserver','seranking','flaticon','answerthepublic','123rf','motionarray','artlist','yourtextguru','similarweb','surferlink','ahrefs','alura','spyfu','alsoasked','keywordtool','wincher','serpstat','zonbase','quillbot','haloscan','bypassgpt','seoptimer','amzscout','zikanalytics','niche scraper','dinorank','seozoom','smartscout','freepik','searchatlas','mangools','sistrix','publicwww','hunter','pexda','xovi','smodin.io','ranxplorer','buzzsumo','storyblocks','woorank','iconscout','babbar','moz','one hourindexing','word ai','jungle scout','colinkri','keysearch','textoptimzer','1.fr','domcop','envato elements','quetext','majestic','screaming frog'
  ]

  const filteredTools = byTier.filter(tool => {
    const q = searchTerm.toLowerCase().trim();
    const matchNameDesc = tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
    if (matchNameDesc) return true;
    if (q && tool.name === '+30 SEO Tools') {
      return SEO_INCLUDED.some(n => n.includes(q));
    }
    return false;
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
    'Semrush': 399,
    'Similarweb': 199,
    '+30 SEO Tools': 1000,
    
    'Higgsfield': 250,
    'SendShort': 59,
    'Capcut': 23,
    'Brain.fm': 9.99,
  }

  const renderPrice = (name: string) => {
    const price = PRICE_MAP[name]
    if (!price) return null
    return (
      <span className="absolute bottom-3 right-3 text-xs md:text-sm px-2.5 py-1 rounded-full border text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] bg-gradient-to-tr from-purple-500/30 to-purple-400/20 border-purple-400/30">
        ${price.toFixed(price % 1 ? 2 : 0)}/mo
      </span>
    )
  }

  const isProOnly = (name: string) => {
    if (name === '+30 SEO Tools') return false
    // Normalize variations for matching
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredTools.map((tool) => (
              <div key={tool.id}>
                {tool.name === '+30 SEO Tools' ? (
                  <div onClick={()=>{ 
                    try { 
                      router.push('/tools/seo');
                    } catch (error) { 
                      console.warn('[Tools] Router push error:', error);
                      setSeoOpen(true);
                    }
                  }}>
              <Card
                      className={`relative p-3 md:p-4 bg-gray-900 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 group cursor-pointer rounded-2xl`}
                    >
                      {isProOnly(tool.name) && (
                        <span className="absolute -top-2 -left-2 text-[10px] px-2 py-0.5 rounded-full bg-[linear-gradient(135deg,#ffd70055,#ffcc00)] text-white border border-[#ffcc00]/30 shadow-[0_0_12px_rgba(255,215,0,0.45)]">
                          Pro only
                        </span>
                      )}
                      {renderPrice(tool.name)}
                      <div className="w-full h-28 md:h-40 rounded-xl overflow-hidden mb-3 md:mb-4">
                        <ToolImage toolName={tool.name} icon={tool.icon} />
                      </div>
                      <h3 className="text-white font-semibold text-sm md:text-base mb-1">{tool.name}</h3>
                      <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{tool.description}</p>
                      {/* Removed explicit CTA chip per request */}
                    </Card>
                </div>
                ) : (
                  (() => {
                    const rawName = String(tool.name || "")
                    const cleanName = rawName.trim()
                    const normalizedKey = cleanName.toLowerCase().replace(/\s+/g, "").replace(/\./g, "")
                    // Ensure common "no-space" variants always resolve to the correct internal tool page.
                    const forcedSlug =
                      normalizedKey === "winninghunter"
                        ? "winninghunter"
                        : normalizedKey === "shophunter"
                          ? "shophunter"
                          : normalizedKey === "brainfm"
                            ? "brain-fm"
                            : null

                    const slug = forcedSlug || resolveToolSlug(cleanName) || SLUG_OVERRIDES[cleanName] || SLUG_OVERRIDES[rawName] || null
                    const href = slug ? `/tools/${slug}` : null
                    const card = (
                      <Card
                        className={`relative p-3 md:p-4 bg-gray-900 border border-white/10 rounded-2xl ${
                          href ? "cursor-pointer hover:border-white/20 transition-all duration-300 hover:scale-105 group" : "cursor-default"
                        }`}
                      >
                        {isProOnly(tool.name) && (
                          <span className="absolute -top-2 -left-2 text-[10px] px-2 py-0.5 rounded-full bg-[linear-gradient(135deg,#ffd70055,#ffcc00)] text-white border border-[#ffcc00]/30 shadow-[0_0_12px_rgba(255,215,0,0.45)]">
                            Pro only
                          </span>
                        )}
                        {renderPrice(tool.name)}
                        <div className="w-full h-28 md:h-40 rounded-xl overflow-hidden mb-3 md:mb-4">
                          <ToolImage toolName={tool.name} icon={tool.icon} />
                        </div>
                        <h3 className="text-white font-semibold text-sm md:text-base mb-1">{tool.name}</h3>
                        <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{tool.description}</p>
                      </Card>
                    )
                    return href ? (
                      <Link href={href} title={`${tool.name} tool page`} className="block">
                        {card}
                      </Link>
                    ) : (
                      card
                    )
                  })()
                )}
              </div>
            ))}
          </div>
          {seoOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-3xl max-h-[80vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">+30 SEO Tools</h3>
                  <button onClick={()=>{ 
                    try { 
                      router.push('/tools');
                    } catch (error) {
                      console.warn('[Tools] Router push error:', error);
                      setSeoOpen(false);
                    }
                  }} className="text-white/70 hover:text-white">✕</button>
                </div>
                <p className="text-gray-400 text-sm mb-3">Included tools with short descriptions.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { n: 'Semrush', d: 'All‑in‑one SEO & competitive research platform.' },
                    { n: 'Ubersuggest', d: 'Keyword ideas and site SEO audits.' },
                    { n: 'Academun', d: 'Academic writing and research helper.' },
                    { n: 'WriteHuman', d: 'AI writing that preserves human tone.' },
                    { n: 'SEObserver', d: 'Backlink and SERP monitoring insights.' },
                    { n: 'SE Ranking', d: 'Rank tracking and site audit suite.' },
                    { n: 'Flaticon', d: 'Millions of icons for web assets.' },
                    { n: 'AnswerThePublic', d: 'Topic questions mined from searches.' },
                    { n: '123RF', d: 'Stock photos and vectors for creatives.' },
                    { n: 'Motion Array', d: 'Video templates, presets, and assets.' },
                    { n: 'Artlist', d: 'Royalty‑free music and SFX library.' },
                    { n: 'YourTextGuru', d: 'SEO briefs and content optimization.' },
                    { n: 'Similarweb', d: 'Competitive traffic and audience data.' },
                    { n: 'SurferLink', d: 'Internal linking recommendations.' },
                    { n: 'Ahrefs', d: 'Backlinks, keywords, and site explorer.' },
                    { n: 'Alura', d: 'Etsy SEO and product optimization.' },
                    { n: 'SpyFu', d: 'Competitor PPC & SEO keyword intel.' },
                    { n: 'AlsoAsked', d: 'SERP questions and topic clusters.' },
                    { n: 'KeywordTool', d: 'Keyword ideas from multiple engines.' },
                    { n: 'Wincher', d: 'Rank tracking with daily updates.' },
                    { n: 'Serpstat', d: 'All‑in‑one SEO platform and audits.' },
                    { n: 'Zonbase', d: 'Amazon product and keyword research.' },
                    { n: 'QuillBot', d: 'Paraphrasing and grammar tools.' },
                    { n: 'HaloScan', d: 'Site scanning for technical issues.' },
                    { n: 'BypassGPT', d: 'Detection evasion for AI content.' },
                    { n: 'SEOptimer', d: 'On‑page audits and recommendations.' },
                    { n: 'AMZScout', d: 'Amazon product validation and trends.' },
                    { n: 'ZIKAnalytics', d: 'eBay product and market analysis.' },
                    { n: 'Niche Scraper', d: 'Discover trending e‑commerce niches.' },
                    { n: 'Dinorank', d: 'Keyword cannibalization and ranks.' },
                    { n: 'SEOZoom', d: 'Italian SEO suite for rankings.' },
                    { n: 'SmartScout', d: 'Amazon brand and category insights.' },
                    { n: 'Freepik', d: 'Stock graphics for content creation.' },
                    { n: 'SearchAtlas', d: 'SEO content and backlink tools.' },
                    { n: 'Mangools', d: 'KWFinder, SERP, and backlink suite.' },
                    { n: 'Sistrix', d: 'Visibility index and SEO modules.' },
                    { n: 'PublicWWW', d: 'Source code search at scale.' },
                    { n: 'Hunter', d: 'Email discovery and verification.' },
                    { n: 'Pexda', d: 'Winning product research database.' },
                    { n: 'XOVI', d: 'SEO and online marketing suite.' },
                    { n: 'Smodin.io', d: 'AI writing and rewriting tools.' },
                    { n: 'Ranxplorer', d: 'FR market keyword and SEO data.' },
                    { n: 'BuzzSumo', d: 'Content research and influencer data.' },
                    { n: 'Storyblocks', d: 'Stock videos and motion graphics.' },
                    { n: 'WooRank', d: 'Website reviews and SEO checks.' },
                    { n: 'Iconscout', d: 'Icons and illustrations library.' },
                    { n: 'Babbar', d: 'Semantic SEO and internal meshing.' },
                    { n: 'Moz', d: 'Authority metrics and SEO toolkit.' },
                    { n: 'One Hour Indexing', d: 'Fast URL indexing service.' },
                    { n: 'WordAI', d: 'AI rewriter for unique wording.' },
                    { n: 'Jungle Scout', d: 'Amazon research and sales tracker.' },
                    { n: 'Colinkri', d: 'Link prospecting and outreach.' },
                    { n: 'Keysearch', d: 'Affordable keyword research suite.' },
                    { n: 'TextOptimizer', d: 'Content optimization suggestions.' },
                    { n: '1.fr', d: 'Semantic coverage and topic ideas.' },
                    { n: 'DomCop', d: 'Expired domains with SEO metrics.' },
                    { n: 'Envato Elements', d: 'Creative assets: stock, templates.' },
                    { n: 'Quetext', d: 'Plagiarism checker and citations.' },
                    { n: 'Majestic', d: 'Backlink index with TF/CF metrics.' },
                    { n: 'Screaming Frog', d: 'Site crawler for technical SEO.' },
                  ].map(t => (
                    (() => {
                      const seoSlug = seoSlugByName.get(normalizeSeoName(t.n)) || null
                      const slug = resolveToolSlug(t.n)
                      const href = seoSlug ? `/tools/seo/${seoSlug}` : (slug ? `/tools/${slug}` : null)
                      const inner = (
                        <div className="rounded-lg border border-white/10 p-3 bg-black/30">
                          <div className="text-white font-medium text-sm">{t.n}</div>
                          <div className="text-gray-400 text-xs">{t.d}</div>
                        </div>
                      )
                      return href ? (
                        <Link key={t.n} href={href} title={`${t.n} tool page`} className="block hover:brightness-110 transition">
                          {inner}
                        </Link>
                      ) : (
                        <div key={t.n}>{inner}</div>
                      )
                    })()
                  ))}
                </div>
                {/* Removed external link per request */}
              </div>
            </div>
          )}

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
