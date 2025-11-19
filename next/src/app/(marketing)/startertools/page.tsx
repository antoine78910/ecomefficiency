"use client";
import React from "react";
import { carouselTools, logoDomainMap } from "@/data/carouselTools";

// Prefer fully static generation for marketing to reduce runtime costs
export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

const STARTER_TOOL_NAMES = [
  'Ubersuggest',
  'Semrush',
  'Canva',
  'ChatGPT',
  'Midjourney',
  'SendShort',
  'Brain.fm',
  'Capcut',
  'Helium10',
  'Dropship.io',
  'ShopHunter',
  'WinningHunter',
];
const PRO_ONLY_TOOL_NAMES = [
  'Flair.ai', 'Gemini', 'Exploding Topics', 'Pipiads', 'Kalodata',
  'Atria', 'Heygen', 'Fotor', 'ForePlay', 'ElevenLabs', 'Runway', 'Trendtrack', 'Higgsfield'
];

export default function StarterToolsPage() {
  const seoTile = { name: '+30 SEO Tools', description: 'Includes: Semrush, Ubersuggest, …', icon: '/tools-logos/seo.png' } as const;
  const starterTools = [seoTile, ...carouselTools.filter(t => STARTER_TOOL_NAMES.includes(t.name) && t.name !== 'Ubersuggest' && t.name !== 'Semrush')
    .filter(t => t.name !== 'Canva' && t.name !== 'Brain.fm')
  ];
  const proOnlyTools = carouselTools.filter(t => PRO_ONLY_TOOL_NAMES.includes(t.name));
  const LINK_MAP: Record<string, string> = {
    '+30 SEO Tools': 'https://rankerfox.com/login/',
    // starter
    'ChatGPT': 'https://chatgpt.com/',
    'Midjourney': 'https://www.midjourney.com/explore?tab=top',
    'SendShort': 'https://app.sendshort.ai/en/home',
    'Capcut': 'https://www.capcut.com/fr-fr/login',
    'Helium10': 'https://noxtools.com/secure/page/Helium10',
    'Dropship.io': 'https://app.dropship.io/dashboard',
    'ShopHunter': 'https://app.shophunter.io/login',
    'WinningHunter': 'https://app.winninghunter.com/login',
    // pro-only
    'Flair.ai': 'https://app.flair.ai/explore',
    'Gemini': 'https://gemini.google.com/app',
    'Exploding Topics': 'https://www.semrush.com/app/exploding-topics/',
    'Pipiads': 'https://www.pipiads.com/login',
    'Kalodata': 'https://www.kalodata.com/login',
    'Atria': 'https://app.tryatria.com/login',
    'Heygen': 'https://app.heygen.com/login',
    'Fotor': 'https://www.fotor.com/fr/',
    'ForePlay': 'https://app.foreplay.co/login',
    'ElevenLabs': 'https://elevenlabs.io/app/sign-in',
    'Runway': 'https://noxtools.com/secure/page/Runwayml',
    'Trendtrack': 'https://app.trendtrack.io/en/login',
  };
  return (
    <div className="min-h-screen bg-black">
      <div className="py-10 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-20 w-auto rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {starterTools.map((tool) => (
              <a
                key={tool.name}
                href={LINK_MAP[tool.name] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="tool-card bg-black rounded-2xl p-4 transition-all duration-300 relative overflow-visible min-h-[200px] flex flex-col items-center text-center border border-white/10 hover:border-white/20 hover:bg-white/5 hover:scale-[1.03] active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
              >
                {/* Pro-only badge like /tools */}
                {PRO_ONLY_TOOL_NAMES.includes(tool.name) && (
                  <span className="absolute -top-2 -left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-[linear-gradient(135deg,#ffd70055,#ffcc00)] text-white border border-[#ffcc00]/30 shadow-[0_0_12px_rgba(255,215,0,0.45)]">Pro only</span>
                )}
                <div className="w-full h-36 md:h-40 mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                  <img
                    src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                    alt={tool.name}
                    className="w-full h-full object-contain bg-black"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const domain = logoDomainMap[tool.name.toLowerCase()];
                      const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                      if ((target as any).dataset.retry !== '1' && target.src !== fallback) {
                        (target as any).dataset.retry = '1';
                        target.src = fallback;
                      } else if (target.src.indexOf('/placeholder.svg') === -1) {
                        target.src = '/placeholder.svg';
                      }
                    }}
                  />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                {tool.name === '+30 SEO Tools' ? (
                  <div className="flex items-center gap-3 mt-2 opacity-90">
                    <img src="/tools-logos/ubersuggest.png" alt="Ubersuggest" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                    <img src="/tools-logos/semrush.png" alt="Semrush" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                    <span className="text-gray-400 text-base">…</span>
                  </div>
                ) : null}
              </a>
            ))}
            {proOnlyTools.map((tool) => (
              <div key={tool.name} className="relative">
                <span className="absolute -top-2 -left-2 z-20 pointer-events-none text-[10px] px-2 py-0.5 rounded-full bg-[linear-gradient(135deg,#ffd70055,#ffcc00)] text-white border border-[#ffcc00]/30 shadow-[0_0_12px_rgba(255,215,0,0.45)]">Pro only</span>
                {tool.name === 'Higgsfield' ? (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-2 pointer-events-none">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">NEW !</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">$250 Creator plan</span>
                  </div>
                ) : null}
                <div
                  className="tool-card rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[220px] flex flex-col items-center text-center border border-white/10 bg-black/80 hover:bg-black/85 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <div className="w-full h-36 md:h-40 mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                    <img
                      src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                      alt={tool.name}
                      className="w-full h-full object-contain bg-black opacity-60"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const domain = logoDomainMap[tool.name.toLowerCase()];
                        const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                        if ((target as any).dataset.retry !== '1' && target.src !== fallback) {
                          (target as any).dataset.retry = '1';
                          target.src = fallback;
                        } else if (target.src.indexOf('/placeholder.svg') === -1) {
                          target.src = '/placeholder.svg';
                        }
                      }}
                    />
                  </div>
                  <h3 className="text-white/80 font-semibold text-base mb-2">{tool.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity grid place-items-center">
                    <div className="px-3 py-1.5 rounded-md text-xs font-medium border border-white/20 text-white bg-white/10">Upgrade to access</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


