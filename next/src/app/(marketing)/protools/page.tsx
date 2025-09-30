"use client";
import React from "react";
import { carouselTools, logoDomainMap } from "@/data/carouselTools";

export default function ProToolsPage() {
  const seoTile = { name: '+30 SEO Tools', description: 'Includes: Semrush, Ubersuggest, and more…', icon: '/tools-logos/seo.png' } as const;
  const LINK_MAP: Record<string, string> = {
    '+30 SEO Tools': 'https://rankerfox.com/login/',
    'Flair.ai': 'https://app.flair.ai/explore',
    'ChatGPT': 'https://chatgpt.com/',
    'Gemini': 'https://gemini.google.com/',
    'Midjourney': 'https://www.midjourney.com/explore?tab=top',
    'Exploding Topics': 'https://www.semrush.com/app/exploding-topics/',
    'Pipiads': 'https://www.pipiads.com/login',
    'Kalodata': 'https://www.kalodata.com/login',
    'WinningHunter': 'https://app.winninghunter.com/login',
    'Capcut': 'https://www.capcut.com/login',
    'SendShort': 'https://app.sendshort.ai/en/home',
    'Helium10': 'https://www.helium10.com/',
    'Dropship.io': 'https://app.dropship.io/dashboard',
    'ShopHunter': 'https://app.shophunter.io/login',
    'Atria': 'https://app.tryatria.com/login',
    'Heygen': 'https://app.heygen.com/login',
    'Fotor': 'https://www.fotor.com/',
    'ForePlay': 'https://app.foreplay.co/login',
    'ElevenLabs': 'https://elevenlabs.io/app/sign-in',
    'Runway': 'https://app.runwayml.com/',
    'Trendtrack': 'https://app.trendtrack.io/en/login',
  };
  return (
    <div className="min-h-screen bg-black">
      <div className="py-10 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[seoTile, ...carouselTools
              .filter(t => [
                'Flair.ai','ChatGPT','Gemini','Midjourney','Exploding Topics','Pipiads','Kalodata','WinningHunter','Capcut','SendShort','Helium10','Dropship.io','ShopHunter','Atria','Heygen','Fotor','ForePlay','ElevenLabs','Runway','Trendtrack'
              ].includes(t.name))
              .filter(t => t.name !== 'Canva' && t.name !== 'Brain.fm')
            ].map((tool) => (
              <a
                key={tool.name}
                href={LINK_MAP[tool.name] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center border border-white/10 hover:border-white/20 hover:bg-white/5 hover:scale-[1.03] active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
              >
                <div className="w-full h-36 md:h-40 mb-4 rounded-xl overflow-hidden">
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
                {tool.name === 'Heygen' ? (
                  <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Newly Added!</span>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


