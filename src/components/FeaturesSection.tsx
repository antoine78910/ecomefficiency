
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight } from "lucide-react";

// Define the tools list with categories
type Tool = {
  id: number;
  name: string;
  description: string;
  category: string;
};

const tools: Tool[] = [
  { id: 1, name: "Academun", description: "Online learning platform", category: "Education" },
  { id: 2, name: "Adsparo", description: "Ad performance tracking and optimization", category: "Marketing" },
  { id: 3, name: "AlsoAsked", description: "Question suggestions & related queries", category: "SEO" },
  { id: 4, name: "Brain.fm", description: "Music for productivity", category: "Productivity" },
  { id: 5, name: "Canva Pro", description: "Design creation", category: "Design" },
  { id: 6, name: "CapCut Pro", description: "Video editing", category: "Video" },
  { id: 7, name: "Chat GPT Plus", description: "Advanced AI language model", category: "AI" },
  { id: 8, name: "Cutout.pro", description: "Photo/Video Enhancer", category: "Design" },
  { id: 9, name: "Dinorank", description: "SEO ranking & performance tool", category: "SEO" },
  { id: 10, name: "Dropship.io", description: "Store sales follow-up", category: "E-commerce" },
  { id: 11, name: "Eleven Labs", description: "Best AI voices", category: "AI" },
  { id: 12, name: "Envato Element", description: "Marketplace of creative resources for designers and developers", category: "Design" },
  { id: 13, name: "Exploding Topics", description: "Discovering new trends", category: "Research" },
  { id: 14, name: "Flair.ai", description: "AI-assisted design and branding tool", category: "Design" },
  { id: 15, name: "Fliki", description: "Video making", category: "Video" },
  { id: 16, name: "Foreplay", description: "Ad creation tool", category: "Marketing" },
  { id: 17, name: "Freepik", description: "Graphic resources platform, icons, photos", category: "Design" },
  { id: 18, name: "Fotor", description: "AI image editing", category: "Design" },
  { id: 19, name: "Helium 10", description: "Market analysis and product research", category: "E-commerce" },
  { id: 20, name: "Hunter", description: "Email finder & verification", category: "Marketing" },
  { id: 21, name: "Iconscout", description: "Marketplace of icons and illustrations", category: "Design" },
  { id: 22, name: "JungleScout", description: "Product research and market analysis for Amazon", category: "E-commerce" },
  { id: 23, name: "Kalodata", description: "TikTok Shop analysis tool", category: "E-commerce" },
  { id: 24, name: "Keysearch", description: "SEO keyword research tool", category: "SEO" },
  { id: 25, name: "Keyword Tool", description: "Generate keyword ideas for SEO and PPC campaigns", category: "SEO" },
  { id: 26, name: "Majestic", description: "Backlink analysis and SEO metrics", category: "SEO" },
  { id: 27, name: "Mangools", description: "Suite for SEO research and site analysis", category: "SEO" },
  { id: 28, name: "Midjourney", description: "Image generation", category: "AI" },
  { id: 29, name: "Niche Scrapper", description: "Extract and analyze profitable niche markets", category: "Research" },
  { id: 30, name: "OnlyAds", description: "Ad campaign monitoring", category: "Marketing" },
  { id: 31, name: "Peeksta", description: "Product search", category: "E-commerce" },
  { id: 32, name: "PinSpy", description: "Pinterest ad analysis", category: "Marketing" },
  { id: 33, name: "Pipiads", description: "Product search on TikTok", category: "E-commerce" },
  { id: 34, name: "Quetext", description: "Plagiarism detection", category: "Content" },
  { id: 35, name: "Quillbot", description: "AI-powered paraphrasing tool", category: "Content" },
  { id: 36, name: "SearchAtlas", description: "SEO research and analysis", category: "SEO" },
  { id: 37, name: "Sell The Trend", description: "Product trend analysis", category: "E-commerce" },
  { id: 38, name: "Semrush", description: "Comprehensive SEO and competitive research", category: "SEO" },
  { id: 39, name: "SendShort", description: "Short subtitles", category: "Video" },
  { id: 40, name: "Shophunter", description: "Online store monitoring and analysis", category: "E-commerce" },
  { id: 41, name: "Storyblocks", description: "Stock media platform", category: "Design" },
  { id: 42, name: "Text Optimizer", description: "Textual content optimization tool to improve SEO", category: "SEO" },
  { id: 43, name: "TrendTrack", description: "Track winning shopify stores, viral trends & high-performing ads", category: "E-commerce" },
  { id: 44, name: "Ubersuggest", description: "Keyword research and SEO insights", category: "SEO" },
  { id: 45, name: "Youzign", description: "Graphic design tool", category: "Design" },
  { id: 46, name: "YourTextGuru", description: "SEO content optimization", category: "SEO" },
  { id: 47, name: "WooRank", description: "SEO analysis and website audit tool", category: "SEO" }
];

// Group tools by category
const getToolsByCategory = () => {
  const categories: Record<string, Tool[]> = {};
  
  tools.forEach(tool => {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push(tool);
  });
  
  return categories;
};

const FeaturesSection = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const toolsByCategory = getToolsByCategory();
  const categories = Object.keys(toolsByCategory).sort();
  
  return (
    <div id="features" className="py-16 px-6 md:px-12 bg-secondary/10 backdrop-blur-sm rounded-lg my-12 relative">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#7f62fe]/10 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#7f62fe]/10 to-transparent pointer-events-none"></div>
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-3xl font-bold">Why choose us?</h2>
        
        {/* What's in there? floating button */}
        <div className="absolute top-0 right-0 md:right-4 -translate-y-1/2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-gradient-to-r from-[#5c3dfa]/80 to-[#7f62fe]/80 border-[#9b87f5]/50 hover:border-[#9b87f5] hover:from-[#5c3dfa] hover:to-[#7f62fe] text-white font-semibold rounded-full px-5 group relative">
                <span className="relative z-10">
                  What's in there? <ChevronRight className="inline-block ml-1 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="absolute inset-0 rounded-full bg-black/20 backdrop-blur-sm -z-0"></span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 max-h-[70vh] overflow-y-auto bg-[#202031]/95 backdrop-blur-sm border-[#5c3dfa]/50 text-white p-0">
              <div className="sticky top-0 bg-[#202031] border-b border-[#5c3dfa]/30 p-2 z-10">
                <h4 className="font-bold text-lg text-gradient px-2 pt-1">All 47 Included Tools</h4>
                <div className="flex flex-wrap gap-1 my-2">
                  {categories.map(category => (
                    <Button 
                      key={category}
                      variant="outline" 
                      size="sm"
                      className={`text-xs py-0 h-6 ${activeCategory === category ? 'bg-[#5c3dfa]/30 border-[#5c3dfa]' : 'bg-transparent'}`}
                      onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="p-3 space-y-1">
                {(activeCategory ? [activeCategory] : categories).map(category => (
                  <div key={category}>
                    {!activeCategory && <h5 className="font-semibold text-sm text-[#7f62fe] mt-3 mb-1">{category}</h5>}
                    {toolsByCategory[category].map(tool => (
                      <div 
                        key={tool.id} 
                        className="py-1.5 px-2 rounded-md hover:bg-[#5c3dfa]/10 transition-colors"
                      >
                        <div className="font-medium">{tool.id}. {tool.name}</div>
                        <div className="text-xs text-gray-400">{tool.description}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Feature cards */}
        <Card className="bg-gradient-to-br from-[#202031]/90 to-[#12121e]/90 backdrop-blur-sm border-[#5c3dfa]/20 hover:border-[#5c3dfa]/40 transition-all hover:shadow-lg hover:shadow-[#5c3dfa]/10">
          <CardContent className="p-6">
            <div className="text-3xl text-[#5c3dfa] mb-4">💡</div>
            <h3 className="text-xl font-bold mb-2">One Dashboard. All the Tools.</h3>
            <p className="text-gray-300 mb-2">Stop juggling 10 logins.</p>
            <p className="text-gray-300">One subscription gives you access to 45+ tools for product research, ads, SEO & AI — instantly.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#202031]/90 to-[#12121e]/90 backdrop-blur-sm border-[#5c3dfa]/20 hover:border-[#5c3dfa]/40 transition-all hover:shadow-lg hover:shadow-[#5c3dfa]/10">
          <CardContent className="p-6">
            <div className="text-3xl text-[#5c3dfa] mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">$2,000+ in Real Value — for $19.99</h3>
            <p className="text-gray-300 mb-2">Pipiads, Dropship.io, GPT-4, Canva Pro, Afterlib and more.</p>
            <p className="text-gray-300">Top-tier tools you'd normally pay hundreds for — all included.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#202031]/90 to-[#12121e]/90 backdrop-blur-sm border-[#5c3dfa]/20 hover:border-[#5c3dfa]/40 transition-all hover:shadow-lg hover:shadow-[#5c3dfa]/10">
          <CardContent className="p-6">
            <div className="text-3xl text-[#5c3dfa] mb-4">🆕</div>
            <h3 className="text-xl font-bold mb-2">New Tools Every Month (by vote)</h3>
            <p className="text-gray-300 mb-2">You decide what we add next.</p>
            <p className="text-gray-300">Our community votes monthly, and new tools are included at no extra cost.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#202031]/90 to-[#12121e]/90 backdrop-blur-sm border-[#5c3dfa]/20 hover:border-[#5c3dfa]/40 transition-all hover:shadow-lg hover:shadow-[#5c3dfa]/10">
          <CardContent className="p-6">
            <div className="text-3xl text-[#5c3dfa] mb-4">🔐</div>
            <h3 className="text-xl font-bold mb-2">Full Premium Access. No Limits.</h3>
            <p className="text-gray-300 mb-2">No trial versions, no feature caps.</p>
            <p className="text-gray-300">Get full access to the best versions of every tool — the way pros use them.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeaturesSection;
