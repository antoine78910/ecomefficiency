
"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Filter, ArrowLeft } from "lucide-react";
import Link from "next/link";
import JoinMembersSection from "@/components/JoinMembersSection";
import Footer from "@/components/Footer";

const toolsData = [
  { id: 1, name: "Academun", description: "Online learning platform", category: "Education" },
  { id: 2, name: "Adsparo", description: "Ad performance tracking and optimization", category: "Marketing" },
  { id: 3, name: "AlsoAsked", description: "Question suggestions & related queries", category: "SEO" },
  { id: 4, name: "Brain.fm", description: "Music for productivity", category: "Productivity" },
  { id: 5, name: "Canva Pro", description: "Design creation", category: "Design" },
  { id: 6, name: "CapCut Pro", description: "Video editing", category: "Video" },
  { id: 7, name: "Chat GPT Plus", description: "Advanced AI language model", category: "AI" },
  { id: 8, name: "Cutout.pro", description: "Photo/Video Enhancer", category: "Design" },
  { id: 9, name: "Dinorank", description: "SEO ranking & performance tool", category: "SEO" },
  { id: 10, name: "Dropship.io", description: "Store sales follow-up", category: "Ecommerce" },
  { id: 11, name: "Eleven Labs", description: "Best AI voices", category: "AI" },
  { id: 12, name: "Envato Element", description: "Marketplace of creative resources for designers and developers", category: "Design" },
  { id: 13, name: "Exploding Topics", description: "Discovering new trends", category: "Research" },
  { id: 14, name: "Flair.ai", description: "AI-assisted design and branding tool", category: "AI" },
  { id: 15, name: "Fliki", description: "Video making", category: "Video" },
  { id: 16, name: "Foreplay", description: "Ad creation tool", category: "Marketing" },
  { id: 17, name: "Freepik", description: "Graphic resources platform, icons, photos", category: "Design" },
  { id: 18, name: "Fotor", description: "AI image editing", category: "AI" },
  { id: 19, name: "TurboScribe", description: "AI transcription and summaries", category: "Productivity" },
  { id: 20, name: "Helium 10", description: "Market analysis and product research", category: "Ecommerce" },
  { id: 21, name: "Hunter", description: "Email finder & verification", category: "Marketing" },
  { id: 22, name: "Iconscout", description: "Marketplace of icons and illustrations", category: "Design" },
  { id: 23, name: "JungleScout", description: "Product research and market analysis for Amazon", category: "Ecommerce" },
  { id: 24, name: "Kalodata", description: "TikTok Shop analysis tool", category: "Analytics" },
  { id: 25, name: "Keysearch", description: "SEO keyword research tool", category: "SEO" },
  { id: 26, name: "Keyword Tool", description: "Generate keyword ideas for SEO and PPC campaigns", category: "SEO" },
  { id: 27, name: "Majestic", description: "Backlink analysis and SEO metrics", category: "SEO" },
  { id: 28, name: "Mangools", description: "Suite for SEO research and site analysis", category: "SEO" },
  { id: 29, name: "Midjourney", description: "Image generation", category: "AI" },
  { id: 30, name: "Niche Scrapper", description: "Extract and analyze profitable niche markets", category: "Research" },
  { id: 31, name: "OnlyAds", description: "Ad campaign monitoring", category: "Marketing" },
  { id: 32, name: "Peeksta", description: "Product search", category: "Ecommerce" },
  { id: 33, name: "PinSpy", description: "Pinterest ad analysis", category: "Analytics" },
  { id: 34, name: "Pipiads", description: "Product search on TikTok", category: "Analytics" },
  { id: 35, name: "Quetext", description: "Plagiarism detection", category: "Writing" },
  { id: 36, name: "Quillbot", description: "AI-powered paraphrasing tool", category: "AI" },
  { id: 37, name: "SearchAtlas", description: "SEO research and analysis", category: "SEO" },
  { id: 38, name: "Sell The Trend", description: "Product trend analysis", category: "Research" },
  { id: 39, name: "Semrush", description: "Comprehensive SEO and competitive research", category: "SEO" },
  { id: 40, name: "SendShort", description: "Short subtitles", category: "Video" },
  { id: 41, name: "Shophunter", description: "Online store monitoring and analysis", category: "Ecommerce" },
  { id: 42, name: "Storyblocks", description: "Stock media platform", category: "Design" },
  { id: 43, name: "Text Optimizer", description: "Textual content optimization tool to improve SEO", category: "SEO" },
  { id: 44, name: "TrendTrack", description: "Track winning shopify stores, viral trends & high-performing ads", category: "Analytics" },
  { id: 45, name: "Ubersuggest", description: "Keyword research and SEO insights", category: "SEO" },
  { id: 47, name: "Youzign", description: "Graphic design tool", category: "Design" },
  { id: 48, name: "YourTextGuru", description: "SEO content optimization", category: "SEO" },
  { id: 49, name: "WooRank", description: "SEO analysis and website audit tool", category: "SEO" }
];

const categories = [
  "All",
  "AI",
  "SEO",
  "Design",
  "Marketing",
  "Ecommerce",
  "Analytics",
  "Video",
  "Research",
  "Writing",
  "Education",
  "Productivity",
] as const;
type Category = (typeof categories)[number];

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  AI: { bg: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", text: "text-blue-400" },
  SEO: { bg: "from-green-500/20 to-emerald-500/20", border: "border-green-500/30", text: "text-green-400" },
  Design: { bg: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", text: "text-pink-400" },
  Marketing: { bg: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/30", text: "text-orange-400" },
  Ecommerce: { bg: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", text: "text-purple-400" },
  Analytics: { bg: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/30", text: "text-indigo-400" },
  Video: { bg: "from-red-500/20 to-pink-500/20", border: "border-red-500/30", text: "text-red-400" },
  Research: { bg: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/30", text: "text-teal-400" },
  Writing: { bg: "from-yellow-500/20 to-orange-500/20", border: "border-yellow-500/30", text: "text-yellow-400" },
  Education: { bg: "from-emerald-500/20 to-green-500/20", border: "border-emerald-500/30", text: "text-emerald-400" },
  Productivity: { bg: "from-slate-500/20 to-gray-500/20", border: "border-slate-500/30", text: "text-slate-400" }
};

const Tools = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  const filteredTools = toolsData.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-white hover:bg-white/10 flex items-center gap-2 rounded-md px-2 py-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-2xl font-bold text-white">All Tools</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="py-16 px-6 lg:px-8 bg-gradient-to-b from-black to-purple-900/10">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            49 <span className="gradient-text">Premium Tools</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Access all these powerful tools for just one low price. Save thousands every month.
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
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

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category)}
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-black">
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTools.map((tool) => {
               const colors = categoryColors[tool.category as Category] || categoryColors.AI;
              return (
                <Card
                  key={tool.id}
                  className={`relative p-6 bg-gradient-to-br ${colors.bg} backdrop-blur-sm border ${colors.border} hover:border-white/30 transition-all duration-300 hover:scale-105 group cursor-pointer`}
                >
                  {/* Category Badge */}
                  <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${colors.text} bg-black/20`}>
                    {tool.category}
                  </div>

                  {/* Tool Icon Placeholder */}
                  <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border ${colors.border}`}>
                    <div className={`w-10 h-10 rounded-lg ${colors.text.replace('text-', 'bg-')} opacity-80`}></div>
                  </div>

                  {/* Tool Info */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {tool.description}
                  </p>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                </Card>
              );
            })}
          </div>

          {/* No Results */}
          {filteredTools.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No tools found matching your criteria.</p>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center py-16">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to access all these tools?
            </h3>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Get instant access to all 49 premium tools for 99% off their original price.
            </p>
            <Link href="/pricing">
              <Button className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold purple-glow">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <JoinMembersSection />
      <Footer />
    </div>
  );
};

export default Tools;
