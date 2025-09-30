import React from 'react';
import { Card } from "@/components/ui/card";

const RecentlyAddedTools = () => {
  const newTools = [
    { name: 'Trendtrack', description: 'Track trending products and market insights', icon: '/lovable-uploads/2164db5b-e0fd-4897-9ed0-699efe008e2a.png', category: 'Analytics', link: 'https://www.trendtrack.io/' },
    { name: 'AfterLib',   description: 'Premium after effects templates library', icon: '/lovable-uploads/5614361a-9210-4622-b7da-58318ab96146.png', category: 'Design', link: 'https://afterlib.com/' },
    { name: 'Kalodata',   description: 'Advanced analytics and data insights', icon: '/lovable-uploads/9821db62-2a47-4174-962f-4eb122bf5e34.png', category: 'Analytics', link: 'https://www.kalodata.com/' },
    { name: 'Flair AI',   description: 'AI-powered design and creativity tools', icon: '/lovable-uploads/1c34621c-ee07-4b2b-a69c-c381e187de81.png', category: 'AI', link: 'https://flair.ai/' }
  ];

  const handleToolClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative pb-6 md:pb-12 mt-4 md:mt-6">
      {/* Section heading */}
      <div className="flex items-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white">Latest Tools Added</h2>
        <div className="ml-4 bg-[#5c3dfa] text-white text-xs font-bold px-3 py-1 rounded-md transform -rotate-12">
          NEW
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {newTools.map((tool, idx) => (
          <Card
            key={idx}
            onClick={() => handleToolClick(tool.link)}
            className="relative overflow-visible border border-[#5c3dfa]/20 bg-[#12121e] backdrop-blur-sm hover:border-[#5c3dfa]/40 transition-all cursor-pointer"
          >
            {/* Rectangle image badge */}
            <div className="absolute -top-4 -left-4 w-28 h-16 rounded-lg bg-[#5c3dfa]/10 flex items-center justify-center shadow-lg">
              <img
                src={tool.icon}
                alt={tool.name}
                className="w-24 h-12 object-contain"
              />
            </div>

            {/* Content block shifted right/down to make room for the badge */}
            <div className="pt-8 px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white hover:text-[#5c3dfa] transition-colors">
                  {tool.name}
                </h3>
                <span className="text-xs bg-[#5c3dfa]/20 text-[#5c3dfa] py-0.5 px-2 rounded-full">
                  {tool.category}
                </span>
              </div>
              <p className="text-sm text-[#cfd3d8]/70">
                {tool.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecentlyAddedTools;


