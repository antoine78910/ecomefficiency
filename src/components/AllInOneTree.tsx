
import React, { useEffect, useRef } from 'react';

// Define tool categories and their tools
type ToolCategory = {
  name: string;
  color: string;
  tools: string[];
};

const categories: ToolCategory[] = [
  {
    name: "Spy Tools",
    color: "#8b5cf6", // Purple
    tools: ["TrendTrack", "PipiAds", "Peeksta", "OnlyAds", "PinSpy"]
  },
  {
    name: "AI Tools",
    color: "#22c55e", // Green
    tools: ["Chat GPT Plus", "Eleven Labs", "Fliki", "Midjourney", "Flair.ai"]
  },
  {
    name: "SEO & Analytics",
    color: "#3b82f6", // Blue
    tools: ["Semrush", "Helium 10", "JungleScout", "Keysearch", "Mangools"]
  },
  {
    name: "Design & Creatives",
    color: "#f59e0b", // Orange
    tools: ["Canva Pro", "Envato Elements", "Freepik", "Youzign", "Storyblocks"]
  }
];

const AllInOneTree = () => {
  const treeRef = useRef<HTMLDivElement>(null);
  
  // Simple animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scale-100', 'opacity-100');
            entry.target.classList.remove('scale-95', 'opacity-0');
          }
        });
      },
      { threshold: 0.2 }
    );
    
    if (treeRef.current) {
      observer.observe(treeRef.current);
    }
    
    return () => {
      if (treeRef.current) {
        observer.unobserve(treeRef.current);
      }
    };
  }, []);

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">
          Everything your <span className="text-gradient">ecom business</span> needs — connected, in one place.
        </h2>
        
        <div 
          ref={treeRef}
          className="mt-16 transition-all duration-700 transform scale-95 opacity-0"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative">
            {/* Tools on the left side */}
            <div className="order-2 md:order-1 grid grid-cols-1 gap-3">
              {categories.flatMap((category, catIdx) => 
                category.tools.map((tool, toolIdx) => (
                  <div
                    key={`${catIdx}-${toolIdx}`}
                    className="group transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
                  >
                    <div 
                      className="rounded-full px-4 py-1.5 text-sm overflow-hidden whitespace-nowrap text-ellipsis transition-all flex items-center justify-between"
                      style={{ 
                        backgroundColor: `${category.color}15`,
                        border: `1px solid ${category.color}40`,
                      }}
                    >
                      <span style={{ color: category.color }}>{tool}</span>
                      
                      {/* Connection line (visible on hover) */}
                      <div className="relative">
                        <div 
                          className="absolute top-1/2 right-0 h-[1px] bg-gradient-to-r transform -translate-y-1/2"
                          style={{
                            width: '50px',
                            backgroundImage: `linear-gradient(to right, ${category.color}00, ${category.color})`,
                            opacity: 0.6
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Center - Ecom Efficiency Logo */}
            <div className="order-1 md:order-2 relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-[#5c3dfa] to-[#7f62fe] rounded-full blur-lg"></div>
              <div className="relative bg-[#202031] rounded-full p-6 flex items-center justify-center z-10">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-[#5c3dfa] to-[#7f62fe] flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/3cd7bcae-f9aa-4d7b-b901-63b5ff059295.png" 
                    alt="Ecom Efficiency Logo" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain"
                  />
                </div>
              </div>
            </div>
            
            {/* Categories on the right side */}
            <div className="order-3 space-y-4">
              {categories.map((category, idx) => (
                <div 
                  key={idx}
                  className="relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r rounded-lg blur-md opacity-50"
                    style={{ backgroundImage: `linear-gradient(145deg, ${category.color}40, ${category.color}10)` }}
                  ></div>
                  <div 
                    className="relative rounded-lg px-5 py-2.5 font-semibold z-10 flex items-center gap-2"
                    style={{ 
                      background: `linear-gradient(145deg, rgba(28,28,40,0.8), rgba(20,20,30,0.95))`,
                      borderLeft: `3px solid ${category.color}` 
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                    {category.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AllInOneTree;
