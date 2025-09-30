
import React, { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// Define types for tools
type PricingTool = {
  id: number;
  name: string;
  price: number; // Monthly price
  category: string;
};

// Sample of popular tools with their monthly prices
const popularTools: PricingTool[] = [
  { id: 1, name: "Jasper AI", price: 29, category: "AI" },
  { id: 2, name: "Ahrefs", price: 99, category: "SEO" },
  { id: 3, name: "Semrush", price: 119.95, category: "SEO" },
  { id: 4, name: "Canva Pro", price: 12.99, category: "Design" },
  { id: 5, name: "Shopify", price: 29, category: "Ecommerce" },
  { id: 6, name: "ClickFunnels", price: 97, category: "Marketing" },
  { id: 7, name: "MidJourney", price: 10, category: "AI" },
  { id: 8, name: "TubeBuddy", price: 19, category: "Marketing" },
  { id: 9, name: "Klaviyo", price: 45, category: "Email" },
  { id: 10, name: "Helium 10", price: 99, category: "Amazon" },
  { id: 11, name: "Jungle Scout", price: 49, category: "Amazon" },
  { id: 12, name: "Mailchimp", price: 17, category: "Email" },
  { id: 13, name: "Adobe Creative Cloud", price: 54.99, category: "Design" },
  { id: 14, name: "Unbounce", price: 90, category: "Landing Page" },
  { id: 15, name: "Grammarly", price: 30, category: "Writing" },
  { id: 16, name: "ChatGPT Plus", price: 20, category: "AI" },
  { id: 17, name: "Notion", price: 8, category: "Productivity" },
  { id: 18, name: "Moz Pro", price: 99, category: "SEO" },
  { id: 19, name: "Hootsuite", price: 49, category: "Social Media" },
  { id: 20, name: "Loom Pro", price: 8, category: "Video" },
];

const ecomEfficiencyPrice = 19.99;

const PricingSimulator = () => {
  const [selectedTools, setSelectedTools] = useState<number[]>([]);
  const [totalSaving, setTotalSaving] = useState<number>(0);
  const [savingsPercentage, setSavingsPercentage] = useState<number>(0);
  
  // Calculate total savings whenever selected tools change
  useEffect(() => {
    const totalCost = selectedTools.reduce((sum, toolId) => {
      const tool = popularTools.find(t => t.id === toolId);
      return sum + (tool ? tool.price : 0);
    }, 0);
    
    setTotalSaving(totalCost - ecomEfficiencyPrice);
    setSavingsPercentage(totalCost > 0 ? (ecomEfficiencyPrice / totalCost) * 100 : 0);
  }, [selectedTools]);
  
  const handleToolToggle = (toolId: number) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };
  
  return (
    <section className="py-16 md:py-24 relative overflow-hidden" id="pricing">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">
          How much are you <span className="text-gradient">saving</span>?
        </h2>
        <p className="text-lg text-center text-[#cfd3d8]/80 mb-10 max-w-3xl mx-auto">
          Select the tools you're currently using or considering, and see how much you could save with an Ecom Efficiency subscription.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tool selection checkboxes - 2 columns */}
          <div className="lg:col-span-2 bg-[#1a1a2e]/50 rounded-xl p-6 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {popularTools.map((tool) => (
                <div key={tool.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`tool-${tool.id}`}
                    checked={selectedTools.includes(tool.id)}
                    onCheckedChange={() => handleToolToggle(tool.id)}
                    className="border-[#5c3dfa]/50 data-[state=checked]:bg-[#5c3dfa] data-[state=checked]:border-[#5c3dfa]"
                  />
                  <label
                    htmlFor={`tool-${tool.id}`}
                    className="flex justify-between w-full text-sm font-medium cursor-pointer"
                  >
                    <span>{tool.name}</span>
                    <span className="text-[#5c3dfa]">${tool.price}/mo</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing Plan Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#5c3dfa]/20 to-[#7f62fe]/5 rounded-xl p-6 border border-[#5c3dfa]/30 h-full relative overflow-hidden">
              {/* Background glow effect */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#5c3dfa]/20 rounded-full blur-3xl"></div>
              
              {/* Pricing Content */}
              <div className="relative z-10">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-3xl font-bold text-white">$19.99</span>
                    <span className="text-lg text-[#cfd3d8]/60 line-through">$3296/month value</span>
                  </div>
                  <p className="text-[#cfd3d8]/70">per month</p>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-[#cfd3d8]">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
                    <span className="text-sm">Access 45+ SEO / Spy / AI tools</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[#cfd3d8]">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
                    <span className="text-sm">Save $1000+ every month</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[#cfd3d8]">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
                    <span className="text-sm">100% browser-based — no install</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[#cfd3d8]">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
                    <span className="text-sm">New Tools Every Month (by vote)</span>
                  </div>
                </div>
                
                <div className="button-highlight rounded-full w-full">
                  <Button className="bg-[#5c3dfa] hover:bg-[#5c3dfa]/90 w-full text-primary-foreground relative z-10 rounded-full glow-button">
                    Get Started — Just $19.99/mo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSimulator;
