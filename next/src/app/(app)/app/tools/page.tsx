"use client";
import React from "react";
import { carouselTools } from "@/data/carouselTools";
import ToolImage from "@/components/ToolImage";

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
              <ToolImage toolName={tool.name} icon={tool.icon} />
            </div>
            <div className="text-white font-semibold mb-1">{tool.name}</div>
            <div className="text-gray-400 text-sm">{tool.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


