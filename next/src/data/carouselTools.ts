export type CarouselTool = { name: string; description: string; icon: string };

// Map tool names to fallback logo domains (Clearbit). Used if local image is missing.
export const logoDomainMap: Record<string, string> = {
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
  'higgsfield': 'higgsfield.ai',
};

export const carouselTools: CarouselTool[] = [
  { name: 'Ubersuggest', description: 'SEO keyword research', icon: '/tools-logos/ubersuggest.png' },
  { name: 'Flair.ai', description: 'AI product photos', icon: '/tools-logos/flair.png' },
  { name: 'Atria', description: 'Product/ad insights suite', icon: '/tools-logos/atria.png' },
  { name: 'Helium10', description: 'Amazon seller toolkit', icon: '/tools-logos/helium10.png' },
  { name: 'Midjourney', description: 'AI image generation', icon: '/tools-logos/midjourney.png' },
  { name: 'ElevenLabs', description: 'AI voice synthesis', icon: '/tools-logos/elevenlabs.png' },
  { name: 'ChatGPT', description: 'AI writing assistant', icon: '/tools-logos/chatgpt.png' },
  { name: 'Semrush', description: 'SEO/marketing analytics', icon: '/tools-logos/semrush.png' },
  { name: 'Canva', description: 'Graphic design platform', icon: '/tools-logos/canva.png' },
  { name: 'ShopHunter', description: 'Shopify sales tracker', icon: '/tools-logos/shophunter.png' },
  { name: 'WinningHunter', description: 'Winning ad finder', icon: '/tools-logos/winninghunter.png' },
  { name: 'Runway', description: 'AI video editing', icon: '/tools-logos/runway.png' },
  { name: 'Pipiads', description: 'TikTok/Facebook ad spy', icon: '/tools-logos/pipiads.png' },
  { name: 'SendShort', description: 'Auto subtitles & translation', icon: '/tools-logos/sendshort.png' },
  { name: 'Kalodata', description: 'TikTok shop analytics', icon: '/tools-logos/kalodata.png' },
  { name: 'Fotor', description: 'AI photo editor', icon: '/tools-logos/fotor.png' },
  { name: 'ForePlay', description: 'Save ads, build briefs', icon: '/tools-logos/foreplay.png' },
  { name: 'Higgsfield', description: 'AI video generation', icon: '/tools-logos/higgsfield.png' },
  { name: 'Dropship.io', description: 'Shopify product tracker', icon: '/tools-logos/dropship.png' },
  { name: 'Heygen', description: 'AI avatar videos', icon: '/tools-logos/heygen.png' },
  { name: 'Veo 3', description: 'AI video by Google.', icon: '/tools-logos/veo3.png' },
  { name: 'Brain.fm', description: 'Focus music', icon: '/tools-logos/brain.png' },
  { name: 'Capcut', description: 'Social video editor', icon: '/tools-logos/capcut.png' },
  { name: 'Exploding Topics', description: 'Emerging trends finder', icon: '/tools-logos/exploding.png' },
  { name: 'Gemini & NanoBanana', description: 'AI LLM & Image Generation', icon: '/tools-logos/gemini.png' },
];


