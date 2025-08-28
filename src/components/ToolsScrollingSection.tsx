
"use client";
import React from 'react';

const ToolsScrollingSection = () => {
  // Map tool names to fallback logo domains (Clearbit). Used if local image is missing.
  const logoDomainMap: Record<string, string> = {
    'ubersuggest': 'ubersuggest.com',
    'semrush': 'semrush.com',
    'canva': 'canva.com',
    'pipiads': 'pipiads.com',
    'sendshort': 'sendshort.com',
    'smartlead': 'smartlead.ai',
    'godaddy': 'godaddy.com',
    'cloudflare': 'cloudflare.com',
    'stripe': 'stripe.com',
    'mailchimp': 'mailchimp.com',
    'slack': 'slack.com',
    'notion': 'notion.so',
    'figma': 'figma.com',
    'elevenlabs': 'elevenlabs.io',
    'gpt': 'openai.com',
    'gemini': 'google.com',
    'midjourney': 'midjourney.com',
    'runway': 'runwayml.com',
  };

  const tools = [
    { name: 'Gemini', description: 'Google AI Assistant', icon: '/tools-logos/gemini.png' },
    { name: 'Ubersuggest', description: 'SEO and Content Marketing Tool', icon: '/tools-logos/ubersuggest.png' },
    { name: 'Flair.ai', description: 'AI-Powered Design Tool', icon: '/tools-logos/flair.png' },
    { name: 'Atria', description: 'AI Assistant Platform', icon: '/tools-logos/atria.png' },
    { name: 'Helium10', description: 'Amazon research suite', icon: '/tools-logos/helium10.png' },
    { name: 'Midjourney', description: 'AI Image Generation', icon: '/tools-logos/midjourney.png' },
    { name: 'ElevenLabs', description: 'AI Text-to-Speech', icon: '/tools-logos/elevenlabs.png' },
    { name: 'ChatGPT', description: 'AI Conversational Assistant', icon: '/tools-logos/chatgpt.png' },
    { name: 'Semrush', description: 'SEO and Digital Marketing', icon: '/tools-logos/semrush.png' },
    { name: 'Canva', description: 'Graphic Design Platform', icon: '/tools-logos/canva.png' },
    { name: 'ShopHunter', description: 'E-commerce Intelligence', icon: '/tools-logos/shophunter.png' },
    { name: 'WinningHunter', description: 'Product Research Tool', icon: '/tools-logos/winninghunter.png' },
    { name: 'Runway', description: 'AI Creative Suite', icon: '/tools-logos/runway.png' },
    { name: 'Pipiads', description: 'Advertising Intelligence', icon: '/tools-logos/pipiads.png' },
    { name: 'SendShort', description: 'AI short-video content', icon: '/tools-logos/sendshort.png' },
    { name: 'Trendtrack', description: 'Trend Analysis Platform', icon: '/tools-logos/trendtrack.png' },
    { name: 'Kalodata', description: 'Convert Cold Emails To', icon: '/tools-logos/kalodata.png' },
    { name: 'Fotor', description: 'Domain Names, Websites and Hosting', icon: '/tools-logos/fotor.png' },
    { name: 'Dropship.io', description: 'Connect, protect, and build everywhere', icon: '/tools-logos/dropship.png' },
    { name: 'Heygen', description: 'Marketing automation platform', icon: '/tools-logos/heygen.png' },
    { name: 'Veo 3', description: 'Team collaboration hub', icon: '/tools-logos/veo3.png' },
    { name: 'Brain.fm', description: 'All-in-one workspace', icon: '/tools-logos/brain.png' },
    { name: 'Capcut', description: 'Design and prototyping tool', icon: '/tools-logos/capcut.png' },
    { name: 'Exploding Topics', description: 'Design and prototyping tool', icon: '/tools-logos/exploding.png' },


  ];

  const leftColumn = tools.slice(0, 9);
  const middleColumn = tools.slice(9, 17);
  const rightColumn = tools.slice(17, 25);

  return (
    <div className="bg-black py-20 overflow-hidden relative">
      {/* Section-level purple gradients to blend uniformly with adjacent sections */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-purple-900/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-purple-900/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between gap-16">
          {/* Left side - Title */}
          <div className="flex-shrink-0 w-1/3 pr-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Tools at Your <span className="gradient-text">Fingertips</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl">
              Access industry-leading tools that typically cost thousands of dollars per month
            </p>
          </div>

          {/* Right side - Scrolling columns - Optimized for 1440x960 */}
          <div className="flex-1 w-2/3 max-w-5xl">
            <div className="grid grid-cols-3 gap-6 h-[480px] overflow-hidden relative">
              
              {/* Left Column - Scrolling Down */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-down-contained space-y-4">
                  {[...leftColumn, ...leftColumn].map((tool, index) => (
                    <div 
                      key={`left-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Column - Scrolling Up */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-up-contained space-y-4">
                  {[...middleColumn, ...middleColumn].map((tool, index) => (
                    <div 
                      key={`middle-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Scrolling Down (same as left) */}
              <div className="relative overflow-hidden">
                <div className="animate-scroll-down-contained space-y-4">
                  {[...rightColumn, ...rightColumn].map((tool, index) => (
                    <div 
                      key={`right-${index}`}
                      className="tool-card bg-gray-900 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden min-h-[200px] flex flex-col items-center text-center"
                    >
                      <div className="w-full h-32 md:h-36 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={tool.icon.startsWith('/') ? tool.icon : (logoDomainMap[tool.name.toLowerCase()] ? `https://logo.clearbit.com/${logoDomainMap[tool.name.toLowerCase()]}` : '/placeholder.svg')}
                          alt={tool.name}
                          className="w-full h-full object-contain bg-black"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const domain = logoDomainMap[tool.name.toLowerCase()];
                            const fallback = domain ? `https://logo.clearbit.com/${domain}` : '/placeholder.svg';
                            if (target.dataset.retry !== '1' && target.src !== fallback) {
                              target.dataset.retry = '1';
                              target.src = fallback;
                            } else if (target.src.indexOf('/placeholder.svg') === -1) {
                              target.src = '/placeholder.svg';
                            }
                          }}
                        />
                      </div>
                      <h3 className="text-white font-semibold text-base mb-2">{tool.name}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsScrollingSection;
