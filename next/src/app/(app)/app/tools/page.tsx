"use client";
import React from "react";
import { carouselTools, logoDomainMap } from "@/data/carouselTools";

export default function ToolsAppPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">All Tools</h1>
        <p className="text-gray-400">Browse every tool from the carousel with logos and short descriptions.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {carouselTools.map((tool) => (
          <div key={tool.name} className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
            <div className="w-full h-36 rounded-xl overflow-hidden mb-3">
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
            <div className="text-white font-semibold mb-1">{tool.name}</div>
            <div className="text-gray-400 text-sm">{tool.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


