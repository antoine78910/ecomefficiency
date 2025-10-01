
"use client";
import React from 'react';
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { carouselTools, logoDomainMap } from "@/data/carouselTools";

const ToolsScrollingSection = () => {
  const tools = carouselTools;

  const leftColumn = tools.slice(0, 9);
  const middleColumn = tools.slice(9, 17);
  const rightColumn = tools.slice(17, 25);

  return (
    <div className="bg-black py-20 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Mobile layout: title + paragraph above a horizontal carousel */}
        <div className="md:hidden">
          <h2 className="text-3xl font-bold text-white mb-2">
            The only subscription
            <br />
            <span className="gradient-text">You'll ever need</span>
          </h2>
          <div className="mt-6 space-y-3">
            {/* Three horizontal auto-scrolling rows */}
            {[0,1,2].map((row) => {
              const data = row === 0 ? leftColumn : row === 1 ? middleColumn : rightColumn;
              return (
              <div key={`row-${row}`} className="relative overflow-x-hidden touch-pan-x">
                <div
                  className={`${row % 2 === 0 ? 'animate-scroll-left-contained' : 'animate-scroll-right-contained'} inline-flex gap-3 pr-2 whitespace-nowrap w-max [animation-play-state:running]`}
                  onTouchStart={(e)=>{ try { (e.currentTarget as any).style.animationPlayState = 'paused'; } catch {} }}
                  onTouchEnd={(e)=>{ try { (e.currentTarget as any).style.animationPlayState = 'running'; } catch {} }}
                  onTouchCancel={(e)=>{ try { (e.currentTarget as any).style.animationPlayState = 'running'; } catch {} }}
                >
                  {[...data, ...data, ...data].map((tool, index) => (
                    <div 
                      key={`mobile-${row}-${index}`}
                      className="tool-card bg-gray-900 rounded-xl p-3 transition-all duration-300 relative overflow-hidden inline-flex flex-col items-center text-center border border-white/10 align-top"
                      style={{ width: 170 }}
                    >
                      <div className="w-full h-24 mb-2.5 rounded-lg overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-xs mb-0.5">{tool.name}</h3>
                      <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{tool.description}</p>
                    </div>
                  ))}
                </div>
                {/* Edge gradient masks */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black to-transparent" />
              </div>
            )})}
          </div>

          {/* After rows: paragraph and CTA */}
          <div className="mt-6">
            <p className="text-base text-gray-400">
              Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO & Spy tools—without paying for them individually.
            </p>
            <div className="mt-4">
              <Link href="/tools">
                <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl border-[1px] border-white/20 text-white font-medium group">
                  <div className="flex items-center justify-center gap-2">
                    <span>Explore all tools</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-between gap-16">
          {/* Left side - Title */}
          <div className="flex-shrink-0 w-1/3 pr-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              The only subscription
              <br />
              <span className="gradient-text">You'll ever need</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl">
            Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO & Spy tools—without paying for them individually.
            </p>
            <div className="mt-6">
              <Link href="/tools">
                <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl border-[1px] border-white/20 text-white font-medium group">
                  <div className="flex items-center justify-center gap-2">
                    <span>Explore all tools</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </Link>
            </div>
          </div>

          {/* Right side - Scrolling columns - Optimized for 1440x960 */}
          <div className="flex-1 w-2/3 max-w-5xl">
            <div className="grid grid-cols-3 gap-6 h-[480px] overflow-hidden relative">
              
              {/* Left Column - Scrolling Down (start slightly above) */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-down-contained space-y-4" style={{ marginTop: '-15%' }}>
                  {[...leftColumn, ...leftColumn, ...leftColumn].map((tool, index) => (
                    <div 
                      key={`left-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Column - Scrolling Up (start offset so it begins mid-list) */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-up-contained space-y-4" style={{ marginTop: '-25%' }}>
                  {[...middleColumn.slice(Math.floor(middleColumn.length/2)), ...middleColumn, ...middleColumn.slice(0, Math.floor(middleColumn.length/2))].map((tool, index) => (
                    <div 
                      key={`middle-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Scrolling Down (same as left, with slight offset) */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-down-contained space-y-4" style={{ marginTop: '-10%' }}>
                  {[...rightColumn, ...rightColumn, ...rightColumn].map((tool, index) => (
                    <div 
                      key={`right-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black via-black/70 to-transparent" aria-hidden />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsScrollingSection;
