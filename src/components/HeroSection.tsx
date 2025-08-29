
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Afficher la notification après un délai
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLatestToolClick = () => {
    window.open('https://www.trendtrack.io/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative py-16 md:py-24 px-6 md:px-12 flex flex-col items-center text-center">
      {/* Text Content */}
      <div className="space-y-6 z-10 max-w-3xl mx-auto relative">
        <div className="inline-block px-4 py-2 rounded-full bg-secondary/20 text-secondary font-medium">
          <span className="mr-2">✨</span> Nº1 in AI Tools
        </div>
        
        {/* Main title with Latest Tools Added badge */}
        <div className="relative">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            The Only <span className="text-gradient">Subscription</span>
            <br /><span className="text-gradient">Ecom Founders</span> Need
          </h1>
          
          {/* Latest Tools Added floating badge */}
          {isVisible && (
            <div className="absolute -top-5 right-0 md:right-10 transform rotate-12 animate-pulse cursor-pointer" onClick={handleLatestToolClick}>
              <div className="flex items-center gap-2 bg-[#5c3dfa] text-white text-xs md:text-sm font-medium px-3 py-1.5 rounded-md shadow-lg hover:bg-[#5c3dfa]/90 transition-colors">
                <div className="w-8 h-6 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/2164db5b-e0fd-4897-9ed0-699efe008e2a.png" 
                    alt="Trendtrack" 
                    className="w-7 h-5 object-contain"
                  />
                </div>
                <span>Latest tool added</span>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Boost your productivity while minimizing your costs
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-3">
          <div className="bullet-point flex items-center gap-2 text-[#cfd3d8]">
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
            <span>Access 45+ SEO / Spy / AI tools</span>
          </div>
          
          <div className="bullet-point flex items-center gap-2 text-[#cfd3d8]">
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
            <span>Save $1000+ every month</span>
          </div>
          
          <div className="bullet-point flex items-center gap-2 text-[#cfd3d8]">
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#5c3dfa]/20 text-[#7f62fe]">✓</span>
            <span>100% browser-based — no install</span>
          </div>
        </div>
        
        <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button className="bg-[#5c3dfa] hover:bg-[#5c3dfa]/90 text-primary-foreground text-lg px-8 py-6 rounded-full">
            Try for Free
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2 text-lg px-8 py-6">
            <Play size={20} className="fill-white" />
            <span>Watch Demo</span>
            <span className="text-sm text-gray-400">71 sec</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
