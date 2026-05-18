import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import NewHeroAnimatedWord from "@/components/NewHeroAnimatedWord";

const NewHeroSection = () => {
  return (
    <div className="bg-black min-h-0 sm:min-h-screen flex items-start sm:items-center relative overflow-visible pt-8 sm:pt-0">
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
      
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-6 pb-6 sm:py-12 md:py-16 relative z-10">
        <div className="text-center">
          {/* Announcement badge ? mobile scale aligned with /affiliate pill */}
          <div className="relative inline-flex flex-col items-center gap-0.5 sm:gap-0.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-xl bg-[linear-gradient(to_bottom,rgba(149,65,224,0.18),rgba(124,48,199,0.12))] border border-[#9541e0]/40 shadow-[0_0_16px_rgba(149,65,224,0.18)] sm:shadow-[0_0_32px_rgba(149,65,224,0.25)] backdrop-blur-sm mb-2.5 sm:mb-5 overflow-visible max-w-[13rem] sm:max-w-none">
            <span className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 z-10 text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white border border-[#a78bfa]/40">NEW !</span>
            <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
              <span className="group relative inline-flex">
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/10 text-white/80 text-[8px] sm:text-[9px] border border-white/30 cursor-help">!</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+4px)] sm:left-[calc(100%+6px)] sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2 hidden group-hover:flex bg-black/90 text-gray-200 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-white/20 shadow-lg max-w-[10rem] sm:max-w-none sm:whitespace-nowrap text-center leading-snug z-20">
                  $250 Higgsfield Creator Plan added by monthly vote in the discord community
                </div>
              </span>
            </span>
            <span className="text-white text-xs sm:text-sm font-semibold tracking-wide leading-tight">
              Higgsfield added
            </span>
            <span className="text-[10px] sm:text-[11px] text-purple-200/90 leading-snug text-center max-w-[12rem] sm:max-w-none">
              Unlimited Nanobanana Pro, & Seedream 5.0 generation
            </span>
          </div>

          {/* Removed redundant ECOM EFFICIENCY TOOLS badge per request */}

          {/* Main Heading (visual only ??? SEO headings are sr-only in the page) */}
          <div className="text-[2.125rem] sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-4 leading-tight sm:leading-[1.08] tracking-normal px-1">
            <span className="block whitespace-nowrap sm:whitespace-normal">
              <span className="sm:hidden">Access the Most</span>
              <span className="hidden sm:inline">Access the</span>
            </span>
            <span className="block">
              <span className="inline-flex items-baseline justify-center flex-nowrap gap-x-1 sm:gap-x-2 max-w-[100vw] sm:max-w-none mx-auto px-1 sm:px-0">
                <span className="hidden sm:inline">Most </span>
                <span>Powerful</span>
                <NewHeroAnimatedWord />
                <span>Tools</span>
              </span>
            </span>
            <span className="block">
              for <span className="text-purple-400">99% OFF</span> in one click
            </span>
          </div>

          {/* Subheading */}
          <p className="text-sm sm:text-xl text-gray-400 mb-5 sm:mb-6 md:mb-8 max-w-3xl mx-auto">
            Boost your productivity while minimizing your costs
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row flex-wrap gap-3 sm:gap-4 justify-center mb-5 sm:mb-6">
            <Link href="/sign-up">
              <button className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_0_rgba(149,65,224,0.55)] sm:shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-[1px] border-[#9541e0] text-white text-sm sm:text-base font-medium group h-10 sm:h-[48px] min-w-[140px] sm:min-w-[160px] flex items-center justify-center">
                <div className="relative h-5 sm:h-7 w-full overflow-hidden text-center">
                  <span className="flex h-5 sm:h-7 items-center justify-center transition-transform group-hover:-translate-y-full duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </span>
                  <span className="absolute inset-x-0 top-full flex h-5 sm:h-7 items-center justify-center group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Get Started
                  </span>
                </div>
              </button>
            </Link>
            <Link href="/tools">
              <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-[1px] border-white/20 text-white text-sm sm:text-base font-medium group w-[140px] sm:w-[160px] h-10 sm:h-[48px]">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 h-full">
                  <span>See tools</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </button>
            </Link>
          </div>

          {/* Features */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-3 sm:space-y-4 md:space-y-0 md:space-x-12">
            <div className="flex items-center text-gray-300 text-sm sm:text-base">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mr-1.5 sm:mr-2 shrink-0" />
              <span>Access +50 SEO / SPY / AI tools</span>
            </div>
            <div className="flex items-center text-gray-300 text-sm sm:text-base">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mr-1.5 sm:mr-2 shrink-0" />
              <span>Save $4000+ every month</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NewHeroSection;
