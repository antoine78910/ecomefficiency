import React from "react";
import { carouselTools, logoDomainMap } from "@/data/carouselTools";

// Prefer fully static generation for marketing to reduce runtime costs
export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export default function ProToolsPage() {
  const seoTile = { name: '+30 SEO Tools', description: 'Includes: Semrush, Ubersuggest, ...', icon: '/tools-logos/seo.png' } as const;
  const LINK_MAP: Record<string, string> = {
    '+30 SEO Tools': 'https://rankerfox.com/login/',
    // starter set
    'ChatGPT': 'https://chatgpt.com/',
    'Midjourney': 'https://www.midjourney.com/explore?tab=top',
    'SendShort': 'https://app.sendshort.ai/en/home',
    'Capcut': 'https://www.capcut.com/fr-fr/login',
    'Helium10': 'https://noxtools.com/secure/page/Helium10',
    'Dropship.io': 'https://app.dropship.io/dashboard',
    'ShopHunter': 'https://app.shophunter.io/login',
    'WinningHunter': 'https://app.winninghunter.com/login',
    // new pro set
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
    'Vmake': 'https://vmake.ai/',
  };
  return (
    <div className="min-h-screen bg-black">
      <div className="py-10 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-20 w-auto rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[seoTile, ...carouselTools
              .filter(t => [
                'Flair.ai','ChatGPT','Gemini','Midjourney','Exploding Topics','Pipiads','Kalodata','WinningHunter','Capcut','SendShort','Helium10','Dropship.io','ShopHunter','Atria','Heygen','Fotor','ForePlay','ElevenLabs','Runway','Trendtrack','Higgsfield','Vmake'
              ].includes(t.name))
              .filter(t => t.name !== 'Canva' && t.name !== 'Brain.fm')
            ].map((tool) => (
              <a
                key={tool.name}
                href={LINK_MAP[tool.name] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`tool-card rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center border bg-black hover:scale-[1.03] active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 ${tool.name==='Higgsfield' ? 'group backdrop-blur-md bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30' : 'border-white/10 hover:border-white/20'}`}
              >
                {tool.name === 'Higgsfield' ? (
                  <>
                    <style>{`@keyframes subtlePulse{0%,100%{opacity:.4}50%{opacity:.6}}`}</style>
                    <div
                      className="pointer-events-none absolute w-[200%] h-[200%] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-3xl opacity-40"
                      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', transition: 'transform 150ms ease-out', animation: 'subtlePulse 6s ease-in-out infinite' }}
                    />
                  </>
                ) : null}
                {tool.name === 'Higgsfield' ? (
                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">NEW !</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">$250 Creator plan</span>
                  </div>
                ) : null}
                <div className="w-full h-36 md:h-40 mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                  <img
                    src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                    alt={tool.name}
                    className="w-full h-full object-contain bg-black"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{tool.description}</p>
                {tool.name === 'Higgsfield' ? (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">NEW !</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">$250 Creator plan</span>
                  </div>
                ) : null}
                {/* In Pro page, everything is accessible: remove disabled overlay and badges */}
                {tool.name === '+30 SEO Tools' ? (
                  <div className="flex items-center gap-3 mt-2 opacity-90">
                    <img src="/tools-logos/ubersuggest.png" alt="Ubersuggest" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                    <img src="/tools-logos/semrush.png" alt="Semrush" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                    <span className="text-gray-400 text-base">…</span>
                  </div>
                ) : null}
                {/* extra badges removed for clarity */}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


