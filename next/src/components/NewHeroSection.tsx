import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import NewHeroAnimatedWord from "@/components/NewHeroAnimatedWord";

const NewHeroSection = () => {
  return (
    <div className="bg-black min-h-screen flex items-center relative overflow-visible">
      {/* Grid Background - White lines with fade to bottom */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, white 0%, white 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 60%, transparent 100%)'
        }}
      />
      
      {/* Gradient fades to black to seamlessly meet the next section */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
      
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="text-center">
          {/* Announcement badge - smooth and on-brand */}
          <div className="relative inline-flex flex-col items-center px-4 py-2 rounded-xl bg-[linear-gradient(to_bottom,rgba(149,65,224,0.18),rgba(124,48,199,0.12))] border border-[#9541e0]/40 shadow-[0_0_32px_rgba(149,65,224,0.25)] backdrop-blur-sm mb-5 overflow-visible">
            <span className="absolute -top-2 -left-2 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white border border-[#a78bfa]/40 shadow-[0_0_10px_rgba(167,139,250,0.5)]">NEW !</span>
            <span className="absolute -top-2 -right-2 z-10">
              <span className="group relative inline-flex">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-white/10 text-white/80 text-[9px] border border-white/30 cursor-help">!</span>
                <div className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 hidden group-hover:flex bg-black/80 text-gray-200 text-[10px] px-2 py-1 rounded-md border border-white/20 shadow-lg whitespace-nowrap">
                  $250 Higgsfield Creator Plan added by monthly vote in the discord community
                </div>
              </span>
            </span>
            <span className="text-white text-sm font-semibold tracking-wide inline-flex items-center gap-2">
              Higgsfield added
            </span>
            <span className="text-[11px] text-purple-200/90 leading-tight">Unlimited Nanobanana & Seedream 4.0 generation</span>
          </div>

          {/* Removed redundant ECOM EFFICIENCY TOOLS badge per request */}

          {/* Main Heading (visual only — SEO headings are sr-only in the page) */}
          <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.06] tracking-normal">
            <span className="block">Access the</span>
            <span className="block">
              Most Powerful <NewHeroAnimatedWord /> Tools
            </span>
            <span className="block">
              for <span className="text-purple-400">99% OFF</span> in one click
            </span>
          </div>

          {/* Subheading */}
          <p className="text-xl text-gray-400 mb-6 md:mb-8 max-w-3xl mx-auto">
            Boost your productivity while minimizing your costs
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row flex-wrap gap-4 justify-center mb-6">
            <Link href="/sign-up">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border-[1px] border-[#9541e0] text-white font-medium group h-[48px] min-w-[160px]">
                <div className="relative overflow-hidden w-full text-center">
                  <p className="transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                  <p className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </p>
                </div>
              </button>
            </Link>
            <Link href="/tools">
              <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border-[1px] border-white/20 text-white font-medium group w-[160px] h-[48px]">
                <div className="flex items-center justify-center gap-2">
                  <span>See tools</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </Link>
          </div>

          {/* Features */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-12">
            <div className="flex items-center text-gray-300">
              <Check className="w-5 h-5 text-purple-400 mr-2" />
              <span>Access +50 SEO / SPY / AI tools</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Check className="w-5 h-5 text-purple-400 mr-2" />
              <span>Save $4000+ every month</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewHeroSection;
