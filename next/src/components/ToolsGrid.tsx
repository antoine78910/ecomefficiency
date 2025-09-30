import React from 'react'

type Tool = { name: string; description: string; icon: string }

const TOOLS: Tool[] = [
  { name: 'Ubersuggest', description: 'SEO & Keyword Research', icon: '/tools-logos/ubersuggest.png' },
  { name: 'Flair.ai', description: 'AI Design Generator', icon: '/tools-logos/flair.png' },
  { name: 'Atria', description: 'AI Workflow Assistant', icon: '/tools-logos/atria.png' },
  { name: 'Helium10', description: 'Amazon Seller Tools', icon: '/tools-logos/helium10.png' },
  { name: 'Midjourney', description: 'AI Image Generation', icon: '/tools-logos/midjourney.png' },
  { name: 'ElevenLabs', description: 'AI Text-to-Speech', icon: '/tools-logos/elevenlabs.png' },
  { name: 'ChatGPT', description: 'AI Chat Assistant', icon: '/tools-logos/chatgpt.png' },
  { name: 'Semrush', description: 'SEO & Marketing Analytics', icon: '/tools-logos/semrush.png' },
  { name: 'Canva', description: 'Graphic Design Tool', icon: '/tools-logos/canva.png' },
  { name: 'ShopHunter', description: 'Ecom Product Research', icon: '/tools-logos/shophunter.png' },
  { name: 'WinningHunter', description: 'Winning Product Finder', icon: '/tools-logos/winninghunter.png' },
  { name: 'Runway', description: 'AI Video & Media Tools', icon: '/tools-logos/runway.png' },
  { name: 'Pipiads', description: 'Ad Spy Platform', icon: '/tools-logos/pipiads.png' },
  { name: 'SendShort', description: 'AI Short-Video Maker', icon: '/tools-logos/sendshort.png' },
  { name: 'Trendtrack', description: 'Trend Discovery Tool', icon: '/tools-logos/trendtrack.png' },
  { name: 'Kalodata', description: 'TikTok Shop Analytics', icon: '/tools-logos/kalodata.png' },
  { name: 'Fotor', description: 'AI Photo Editor', icon: '/tools-logos/fotor.png' },
  { name: 'Dropship.io', description: 'Dropshipping Analytics', icon: '/tools-logos/dropship.png' },
  { name: 'Heygen', description: 'AI Video Generator', icon: '/tools-logos/heygen.png' },
  { name: 'Veo 3', description: 'Team Collaboration', icon: '/tools-logos/veo3.png' },
  { name: 'Brain.fm', description: 'Focus & Sleep Music', icon: '/tools-logos/brain.png' },
  { name: 'Capcut', description: 'Video Editing App', icon: '/tools-logos/capcut.png' },
  { name: 'Exploding Topics', description: 'Trend Analysis Tool', icon: '/tools-logos/exploding.png' },
  { name: 'Gemini', description: 'AI Language Model', icon: '/tools-logos/gemini.png' },
]



export default function ToolsGrid() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Tools included</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {TOOLS.map((tool) => (
            <div key={tool.name} className="bg-gray-900/60 border border-white/10 rounded-2xl p-4 hover:border-purple-500/40 transition-colors flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/30 border border-white/10 flex items-center justify-center">
                {tool.icon.startsWith('/') ? (
                  <img src={tool.icon} alt={tool.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">{tool.icon}</span>
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold leading-tight">{tool.name}</h3>
                <p className="text-sm text-gray-400 leading-snug">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


