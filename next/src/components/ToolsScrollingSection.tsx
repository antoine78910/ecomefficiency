import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { carouselTools } from "@/data/carouselTools";
import ToolImageStatic from "@/components/ToolImageStatic";

const ToolsScrollingSection = () => {
  const tools = carouselTools;

  const leftColumn = tools.slice(0, 9);
  const middleColumn = tools.slice(9, 17);
  const rightColumn = tools.slice(17, 25);

  return (
    <div className="bg-black py-20 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Mobile layout: title + paragraph above a horizontal scroll row */}
        <div className="md:hidden ee-mobile-rows">
          <h2 className="text-3xl font-bold text-white mb-2">
            The only subscription
            <br />
            <span className="gradient-text">You'll ever need</span>
          </h2>
          <div className="mt-6 relative">
            <div className="flex gap-3 overflow-x-auto pb-2 pr-2 snap-x snap-mandatory scrollbar-none">
              {tools.map((tool) => (
                <div
                  key={`mobile-${tool.name}`}
                  className="snap-start tool-card bg-gray-900 rounded-xl p-3 transition-all duration-300 relative overflow-hidden inline-flex flex-col items-center text-center border border-white/10 align-top shrink-0"
                  style={{ width: 170 }}
                >
                  <div className="w-full h-20 mb-2.5 rounded-lg overflow-hidden flex items-center justify-center bg-black/40">
                    <ToolImageStatic src={tool.icon} alt={tool.name} className="w-full h-full object-contain" />
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

          {/* After rows: paragraph and CTA */}
          <div className="mt-6">
            <p className="text-base text-gray-400">
              Boost your sales and outpace competitors with instant access to 50+ of the best AI, SEO & Spy tools—without paying for them individually.
            </p>
            <div className="mt-4">
              <Link prefetch={false} href="/tools">
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
              <Link prefetch={false} href="/tools">
                <button className="cursor-pointer bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl border-[1px] border-white/20 text-white font-medium group">
                  <div className="flex items-center justify-center gap-2">
                    <span>Explore all tools</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </Link>
            </div>
          </div>

          {/* Right side - Columns (no duplicated DOM) */}
          <div className="flex-1 w-2/3 max-w-5xl">
            <div className="grid grid-cols-3 gap-6 h-[480px] overflow-hidden relative">
              
              {/* Left Column */}
              <div className="relative overflow-y-auto space-y-4 pr-1 scrollbar-none">
                {leftColumn.map((tool) => (
                  <div
                    key={`left-${tool.name}`}
                    className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[160px] flex flex-col items-center text-center"
                  >
                    <div className="w-full h-24 md:h-28 mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-black/40">
                      <ToolImageStatic src={tool.icon} alt={tool.name} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">{tool.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{tool.description}</p>
                  </div>
                ))}
              </div>

              {/* Middle Column */}
              <div className="relative overflow-y-auto space-y-4 pr-1 scrollbar-none">
                {middleColumn.map((tool) => (
                  <div
                    key={`middle-${tool.name}`}
                    className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[160px] flex flex-col items-center text-center"
                  >
                    <div className="w-full h-24 md:h-28 mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-black/40">
                      <ToolImageStatic src={tool.icon} alt={tool.name} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">{tool.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{tool.description}</p>
                  </div>
                ))}
              </div>

              {/* Right Column */}
              <div className="relative overflow-y-auto space-y-4 pr-1 scrollbar-none">
                {rightColumn.map((tool) => (
                  <div
                    key={`right-${tool.name}`}
                    className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[160px] flex flex-col items-center text-center"
                  >
                    <div className="w-full h-24 md:h-28 mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-black/40">
                      <ToolImageStatic src={tool.icon} alt={tool.name} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">{tool.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{tool.description}</p>
                  </div>
                ))}
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
