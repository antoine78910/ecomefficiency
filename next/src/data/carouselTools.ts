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
  'higgsfield': 'higgsfield.ai',
  'vmake': 'vmake.ai',
};

export const carouselTools: CarouselTool[] = [
  { name: 'Ubersuggest', description: 'SEO keyword research', icon: '/tools-images/ubersuggest.png' },
  { name: 'Flair.ai', description: 'AI product photos', icon: '/tools-images/flair.png' },
  { name: 'Atria', description: 'Product/ad insights suite', icon: '/tools-images/atria.png' },
  { name: 'Helium10', description: 'Amazon seller toolkit', icon: '/tools-images/helium10.png' },
  { name: 'Midjourney', description: 'AI image generation', icon: '/tools-images/midjourney.png' },
  { name: 'ElevenLabs', description: 'AI voice synthesis', icon: '/tools-images/elevenlabs.png' },
  { name: 'ChatGPT', description: 'AI writing assistant', icon: '/tools-images/chatgpt.png' },
  { name: 'Semrush', description: 'SEO/marketing analytics', icon: '/tools-images/semrush.png' },
  { name: 'Canva', description: 'Graphic design platform', icon: '/tools-images/canva.png' },
  { name: 'ShopHunter', description: 'Shopify sales tracker', icon: '/tools-images/shophunter.png' },
  { name: 'WinningHunter', description: 'Winning ad finder', icon: '/tools-images/winninghunter.png' },
  { name: 'Pipiads', description: 'TikTok/Facebook ad spy', icon: '/tools-images/pipiads.png' },
  { name: 'SendShort', description: 'Auto subtitles & translation', icon: '/tools-images/sendshort.png' },
  { name: 'Kalodata', description: 'TikTok shop analytics', icon: '/tools-images/kalodata.png' },
  { name: 'Fotor', description: 'AI photo editor', icon: '/tools-images/fotor.png' },
  { name: 'ForePlay', description: 'Save ads, build briefs', icon: '/tools-images/foreplay.png' },
  { name: 'Higgsfield', description: 'AI video generation', icon: '/tools-images/higgsfield.png' },
  { name: 'Vmake', description: 'AI video editor', icon: '/tools-images/vmake.png' },
  { name: 'Dropship.io', description: 'Shopify product tracker', icon: '/tools-images/dropship.png' },
  { name: 'Heygen', description: 'AI avatar videos', icon: '/tools-images/heygen.png' },
  { name: 'Veo 3', description: 'AI video by Google.', icon: '/tools-images/veo3.png' },
  { name: 'Brain.fm', description: 'Focus music', icon: '/tools-images/brain.png' },
  { name: 'Capcut', description: 'Social video editor', icon: '/tools-images/capcut.png' },
  { name: 'Exploding Topics', description: 'Emerging trends finder', icon: '/tools-images/exploding.png' },
  { name: 'Gemini & NanoBanana', description: 'AI LLM & Image Generation', icon: '/tools-images/gemini.png' },
];


