export type ToolCategory =
  | "SEO"
  | "Ads & Spy"
  | "Product Research"
  | "Creative"
  | "Video"
  | "AI Writing"
  | "AI (LLM)"
  | "AI (Image/Video)"
  | "Email & Outreach"
  | "Stock Assets"
  | "Productivity"
  | "Other";

export type ToolCatalogItem = {
  slug: string;
  name: string;
  category: ToolCategory;
  shortDescription: string;
  practicalUseCases: string[];
  bestFor: string[];
  aliases?: string[];
  notes?: string[];
};

export function slugifyToolName(input: string): string {
  const s = String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " ")
    .replace(/\./g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.replace(/\s/g, "-").replace(/-+/g, "-");
}

function normalizeName(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " ")
    .replace(/\./g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveToolSlug(name: string): string | null {
  const n = normalizeName(name);
  for (const t of toolsCatalog) {
    if (normalizeName(t.name) === n) return t.slug;
    for (const a of t.aliases || []) {
      if (normalizeName(a) === n) return t.slug;
    }
  }
  // Fallback: try slugify if it matches an existing slug
  const guessed = slugifyToolName(name);
  return toolsCatalog.some((t) => t.slug === guessed) ? guessed : null;
}

// Source of truth for /tools/<slug> pages.
// Keep names stable: changing a slug requires redirects + sitemap updates.
export const toolsCatalog: ToolCatalogItem[] = [
  {
    slug: "academun",
    name: "Academun",
    category: "Other",
    shortDescription: "Online learning platform for courses and skill building.",
    bestFor: ["students", "solo founders", "teams learning new skills"],
    practicalUseCases: [
      "Learn SEO basics and build a repeatable content workflow.",
      "Train a junior teammate on marketing fundamentals.",
      "Follow structured modules to upskill faster than ad-hoc learning.",
    ],
  },
  {
    slug: "ahrefs",
    name: "Ahrefs",
    category: "SEO",
    shortDescription: "SEO toolkit for backlinks, keywords, and competitor research.",
    bestFor: ["SEO specialists", "e-commerce brands", "agencies"],
    practicalUseCases: [
      "Find keywords your competitors rank for and build better pages.",
      "Audit backlinks and identify link opportunities for your store.",
      "Detect pages losing traffic and prioritize fixes.",
    ],
  },
  {
    slug: "alsoasked",
    name: "AlsoAsked",
    category: "SEO",
    shortDescription: "People-also-ask question mining for topic clusters.",
    bestFor: ["content SEO", "programmatic SEO", "blog teams"],
    practicalUseCases: [
      "Build an FAQ section that matches real user questions.",
      "Create topic clusters around a product category.",
      "Generate headings that are easy for AI to quote.",
    ],
  },
  {
    slug: "atria",
    name: "Atria",
    category: "Ads & Spy",
    shortDescription: "Creative and advertising insights to improve angles and creatives.",
    bestFor: ["media buyers", "creative strategists", "e-commerce teams"],
    practicalUseCases: [
      "Identify winning ad angles in your niche and adapt them.",
      "Generate creative briefs from patterns you observe.",
      "Benchmark competitor creatives before launching new ads.",
    ],
  },
  {
    slug: "brain-fm",
    name: "Brain.fm",
    category: "Productivity",
    shortDescription: "Focus music designed to improve concentration while working.",
    bestFor: ["solo founders", "remote teams", "deep work sessions"],
    practicalUseCases: [
      "Run focused content sprints (60–90 minutes).",
      "Work through repetitive tasks like product uploads.",
      "Reduce distractions during reporting and analysis.",
    ],
  },
  {
    slug: "canva",
    name: "Canva (Pro)",
    category: "Creative",
    shortDescription: "Design tool for ads, thumbnails, landing visuals, and brand assets.",
    bestFor: ["e-commerce brands", "creators", "agencies"],
    aliases: ["Canva", "Canva Pro"],
    practicalUseCases: [
      "Create ad creatives and story formats quickly.",
      "Design product comparison tables and AI-citable visuals.",
      "Maintain consistent branding across your store and socials.",
    ],
  },
  {
    slug: "capcut",
    name: "CapCut (Pro)",
    category: "Video",
    shortDescription: "Video editor for short-form content, captions, and edits.",
    bestFor: ["UGC creators", "TikTok shops", "creative teams"],
    aliases: ["Capcut", "CapCut", "CapCut Pro"],
    practicalUseCases: [
      "Cut UGC into multiple hooks for A/B tests.",
      "Add captions and highlight key benefits.",
      "Produce consistent shorts/reels for daily posting.",
    ],
  },
  {
    slug: "chatgpt",
    name: "ChatGPT (Plus)",
    category: "AI (LLM)",
    shortDescription: "AI assistant for writing, strategy, and structured workflows.",
    bestFor: ["solo founders", "content teams", "operators"],
    aliases: ["Chat GPT Plus", "ChatGPT", "Chat GPT"],
    practicalUseCases: [
      "Generate product page copy with clear benefits and constraints.",
      "Create SOPs for customer support and fulfillment workflows.",
      "Write comparison pages with neutral pros/cons and use-case fit.",
    ],
  },
  {
    slug: "dinorank",
    name: "Dinorank",
    category: "SEO",
    shortDescription: "SEO suite for keyword tracking and optimization workflows.",
    bestFor: ["SEO operators", "small teams", "site owners"],
    practicalUseCases: [
      "Track ranking changes for programmatic pages.",
      "Identify cannibalization and fix internal targeting.",
      "Audit pages with declining visibility and refresh content.",
    ],
  },
  {
    slug: "dropship-io",
    name: "Dropship.io",
    category: "Product Research",
    shortDescription: "Product tracking and store monitoring for e-commerce research.",
    bestFor: ["dropshippers", "product researchers", "store builders"],
    practicalUseCases: [
      "Track competitor stores and detect new winners.",
      "Validate demand before launching a product.",
      "Monitor pricing changes and restocks.",
    ],
  },
  {
    slug: "elevenlabs",
    name: "ElevenLabs",
    category: "AI (Image/Video)",
    shortDescription: "AI voice generation for voiceovers and ads.",
    bestFor: ["UGC ads", "video editors", "brands producing content"],
    aliases: ["Eleven Labs"],
    practicalUseCases: [
      "Create voiceovers for product demos and TikTok ads.",
      "Produce multi-language voice variants for testing.",
      "Generate consistent narration for a content series.",
    ],
  },
  {
    slug: "envato-elements",
    name: "Envato Elements",
    category: "Stock Assets",
    shortDescription: "Stock templates, graphics, and assets for creatives.",
    bestFor: ["designers", "marketers", "video editors"],
    practicalUseCases: [
      "Use templates for ad creative variations.",
      "Download landing section illustrations/icons.",
      "Speed up production with prebuilt packs.",
    ],
  },
  {
    slug: "exploding-topics",
    name: "Exploding Topics",
    category: "SEO",
    shortDescription: "Trend discovery to spot rising products and topics early.",
    bestFor: ["content teams", "product researchers", "founders"],
    practicalUseCases: [
      "Find rising niches before they become saturated.",
      "Generate content ideas tied to emerging trends.",
      "Validate whether a topic is growing or declining.",
    ],
  },
  {
    slug: "flair-ai",
    name: "Flair.ai",
    category: "Creative",
    shortDescription: "AI-assisted product visuals and branded imagery.",
    bestFor: ["e-commerce brands", "creative teams", "DTC founders"],
    practicalUseCases: [
      "Create product hero images for landing pages.",
      "Generate background variations for ad tests.",
      "Produce consistent branding across a catalog.",
    ],
  },
  {
    slug: "flaticon",
    name: "Flaticon",
    category: "Stock Assets",
    shortDescription: "Icon library for UI, landing pages, and content visuals.",
    bestFor: ["designers", "web builders", "content teams"],
    practicalUseCases: [
      "Build feature lists with clean icons.",
      "Create comparison visuals and tables.",
      "Improve scannability of programmatic pages.",
    ],
  },
  {
    slug: "fliki",
    name: "Fliki",
    category: "Video",
    shortDescription: "Turn text into videos for content repurposing.",
    bestFor: ["content marketers", "short-form creators", "social teams"],
    practicalUseCases: [
      "Convert blog posts into short explainer videos.",
      "Create quote videos for social distribution.",
      "Repurpose product descriptions into quick demos.",
    ],
  },
  {
    slug: "foreplay",
    name: "Foreplay",
    category: "Ads & Spy",
    shortDescription: "Creative library and ad organization platform to save, tag, and systematize winning ads (TikTok/Meta).",
    bestFor: ["performance marketers", "agencies", "creative strategists", "brands running paid ads"],
    aliases: ["ForePlay"],
    practicalUseCases: [
      "Save high-signal ads and organize them by hook, angle, offer, and format.",
      "Turn inspiration into repeatable briefs and faster iterations (UGC/editors).",
      "Build a structured swipe system for teams and multi-client agencies.",
    ],
  },
  {
    slug: "freepik",
    name: "Freepik",
    category: "Stock Assets",
    shortDescription: "Stock graphics, photos, and design resources.",
    bestFor: ["designers", "content teams", "marketers"],
    practicalUseCases: [
      "Speed up ad creative production with stock assets.",
      "Create programmatic page visuals (tables, badges).",
      "Design blog thumbnails and social visuals.",
    ],
  },
  {
    slug: "fotor",
    name: "Fotor",
    category: "Creative",
    shortDescription: "AI image editing for quick product photo improvements.",
    bestFor: ["store owners", "designers", "UGC teams"],
    practicalUseCases: [
      "Remove backgrounds and clean product photos.",
      "Enhance images for higher conversion rate.",
      "Create multiple image variants for A/B tests.",
    ],
  },
  {
    slug: "helium10",
    name: "Helium 10",
    category: "Product Research",
    shortDescription: "Amazon market analysis and product research suite.",
    bestFor: ["Amazon sellers", "product researchers", "brands"],
    aliases: ["Helium10"],
    practicalUseCases: [
      "Find product opportunities and estimate demand.",
      "Research keywords for listings and content.",
      "Analyze competitor listings and positioning.",
    ],
  },
  {
    slug: "heygen",
    name: "HeyGen",
    category: "AI (Image/Video)",
    shortDescription: "AI avatar (talking-head) videos for UGC-style ads, demos, and multilingual localization—without filming.",
    bestFor: ["paid ads teams", "ecommerce brands", "SaaS marketers", "content operators"],
    practicalUseCases: [
      "Create talking-head UGC ads without creators.",
      "Generate product demos, explainers, and onboarding videos fast.",
      "Localize the same presenter into multiple languages for scaling.",
    ],
  },
  {
    slug: "turboscribe",
    name: "TurboScribe",
    category: "Productivity",
    shortDescription: "AI transcription to turn audio/video into accurate text, summaries, and notes.",
    bestFor: ["content teams", "operators", "creators", "agencies"],
    aliases: ["Turbo Scribe", "Turboscribe"],
    practicalUseCases: [
      "Transcribe calls, podcasts, and interviews into clean text.",
      "Generate summaries and action items from recordings.",
      "Turn videos into blog drafts, captions, or repurposed content faster.",
    ],
  },
  {
    slug: "higgsfield",
    name: "Higgsfield",
    category: "AI (Image/Video)",
    shortDescription: "AI video generation for cinematic, premium ad creatives (motion-heavy, scroll-stopping).",
    bestFor: ["ecommerce brands", "paid ads teams", "creative operators"],
    practicalUseCases: [
      "Generate premium video ads without filming or actors.",
      "Create variations quickly to test hooks/angles at scale.",
      "Produce short-form, platform-native videos for TikTok/Meta ads.",
    ],
  },
  {
    slug: "hunter",
    name: "Hunter",
    category: "Email & Outreach",
    shortDescription: "Email finder and verification for outreach.",
    bestFor: ["agencies", "BD", "partnership outreach"],
    practicalUseCases: [
      "Find and verify emails for partner outreach.",
      "Build prospect lists for B2B campaigns.",
      "Reduce bounce rates by verifying addresses.",
    ],
  },
  {
    slug: "iconscout",
    name: "Iconscout",
    category: "Stock Assets",
    shortDescription: "Icons and illustrations marketplace for design systems.",
    bestFor: ["designers", "web builders", "content teams"],
    practicalUseCases: [
      "Improve feature sections with consistent illustrations.",
      "Build clean comparison visuals.",
      "Create branded assets for programmatic pages.",
    ],
  },
  {
    slug: "junglescout",
    name: "JungleScout",
    category: "Product Research",
    shortDescription: "Product research and market analysis for Amazon.",
    bestFor: ["Amazon sellers", "product researchers", "brands"],
    aliases: ["Jungle Scout"],
    practicalUseCases: [
      "Validate product demand and competition.",
      "Estimate sales and trends for a niche.",
      "Research listing keywords and positioning.",
    ],
  },
  {
    slug: "kalodata",
    name: "Kalodata",
    category: "Product Research",
    shortDescription: "TikTok Shop analysis and product intelligence.",
    bestFor: ["TikTok Shop sellers", "product researchers", "creative teams"],
    practicalUseCases: [
      "Identify top-selling TikTok Shop products.",
      "Track product performance and trends.",
      "Analyze creators/ads driving sales.",
    ],
  },
  {
    slug: "keysearch",
    name: "Keysearch",
    category: "SEO",
    shortDescription: "Keyword research and SEO tracking suite.",
    bestFor: ["small teams", "site owners", "content SEO"],
    practicalUseCases: [
      "Find low-competition keywords for product categories.",
      "Build content briefs and outlines for writers.",
      "Track ranking improvements after updates.",
    ],
  },
  {
    slug: "keyword-tool",
    name: "Keyword Tool",
    category: "SEO",
    shortDescription: "Keyword ideas for SEO and PPC across multiple engines.",
    bestFor: ["SEO", "PPC", "content planning"],
    practicalUseCases: [
      "Collect long-tail keyword ideas for programmatic pages.",
      "Generate question keywords for FAQs.",
      "Find modifiers (under $X, best for X) for landing pages.",
    ],
  },
  {
    slug: "majestic",
    name: "Majestic",
    category: "SEO",
    shortDescription: "Backlink index and link metrics analysis.",
    bestFor: ["SEOs", "link builders", "agencies"],
    practicalUseCases: [
      "Evaluate link profiles of competitors.",
      "Find sites linking to competitors but not to you.",
      "Assess topical relevance of backlink sources.",
    ],
  },
  {
    slug: "mangools",
    name: "Mangools",
    category: "SEO",
    shortDescription: "SEO toolkit (KW research, SERPs, link metrics).",
    bestFor: ["SEO beginners", "small teams", "content teams"],
    practicalUseCases: [
      "Find keywords and check SERP difficulty.",
      "Audit basic backlink opportunities.",
      "Track ranking progress after publishing.",
    ],
  },
  {
    slug: "midjourney",
    name: "Midjourney",
    category: "AI (Image/Video)",
    shortDescription: "AI image generation for creatives and concepts.",
    bestFor: ["designers", "creative strategists", "brands"],
    practicalUseCases: [
      "Create concept visuals for ad angles.",
      "Generate backgrounds and assets for creatives.",
      "Build unique blog illustrations/thumbnails.",
    ],
  },
  {
    slug: "niche-scraper",
    name: "Niche Scraper",
    category: "Product Research",
    shortDescription: "Discover and analyze profitable e-commerce niches and products.",
    bestFor: ["dropshippers", "product researchers", "store builders"],
    practicalUseCases: [
      "Find trending products and validate demand.",
      "Collect inspiration for product pages and ads.",
      "Analyze competitors in a niche.",
    ],
  },
  {
    slug: "onlyads",
    name: "OnlyAds",
    category: "Ads & Spy",
    shortDescription: "Ad monitoring and campaign insights.",
    bestFor: ["media buyers", "ad analysts", "creative teams"],
    practicalUseCases: [
      "Track competitor ad activity over time.",
      "Spot new offers and creative angles early.",
      "Benchmark frequency and testing cadence.",
    ],
  },
  {
    slug: "peeksta",
    name: "Peeksta",
    category: "Product Research",
    shortDescription: "Product discovery and trend research for e-commerce.",
    bestFor: ["dropshippers", "product researchers", "marketers"],
    practicalUseCases: [
      "Identify products gaining traction in ads.",
      "Validate product-market fit before building a store.",
      "Collect data for product selection decisions.",
    ],
  },
  {
    slug: "pinspy",
    name: "PinSpy",
    category: "Ads & Spy",
    shortDescription: "Pinterest ad analysis and creative research.",
    bestFor: ["Pinterest marketers", "creative strategists", "DTC brands"],
    practicalUseCases: [
      "Find winning Pinterest creatives for your niche.",
      "Build Pinterest ad tests with proven formats.",
      "Analyze competitor messaging and angles.",
    ],
  },
  {
    slug: "pipiads",
    name: "Pipiads",
    category: "Ads & Spy",
    shortDescription: "Ad spy tool for TikTok (and more) to find winning products and creatives.",
    bestFor: ["dropshippers", "media buyers", "product researchers"],
    practicalUseCases: [
      "Find winning TikTok ads in your niche and extract hooks.",
      "Identify product demand signals via ad volume.",
      "Build a swipe file and brief for UGC creators.",
    ],
  },
  {
    slug: "quetext",
    name: "Quetext",
    category: "AI Writing",
    shortDescription: "Plagiarism detection for content quality control.",
    bestFor: ["content teams", "SEOs", "agencies"],
    practicalUseCases: [
      "Check originality before publishing programmatic pages.",
      "Reduce duplicate risks across similar templates.",
      "Validate outsourced content quickly.",
    ],
  },
  {
    slug: "quillbot",
    name: "Quillbot",
    category: "AI Writing",
    shortDescription: "Paraphrasing and rewriting to improve clarity and uniqueness.",
    bestFor: ["writers", "SEOs", "operators"],
    practicalUseCases: [
      "Rewrite repetitive template sections safely.",
      "Improve clarity of product descriptions.",
      "Create multiple meta description variants.",
    ],
  },
  {
    slug: "runway",
    name: "Runway AI",
    category: "AI (Image/Video)",
    shortDescription: "AI video generation and editing suite for content and ad creatives.",
    bestFor: ["creators", "e-commerce brands", "paid ads teams", "video editors"],
    aliases: ["Runway", "RunwayML", "Runway ML"],
    practicalUseCases: [
      "Generate short video variations for ad testing (hooks, angles, formats).",
      "Remove backgrounds / objects and clean product footage faster.",
      "Create scroll-stopping AI video creatives without a full production setup.",
    ],
  },
  {
    slug: "searchatlas",
    name: "SearchAtlas",
    category: "SEO",
    shortDescription: "SEO research and analysis for content and links.",
    bestFor: ["SEO teams", "agencies", "content operators"],
    practicalUseCases: [
      "Build content briefs from keyword opportunities.",
      "Analyze competitors and link gaps.",
      "Audit pages and prioritize SEO fixes.",
    ],
  },
  {
    slug: "sell-the-trend",
    name: "Sell The Trend",
    category: "Product Research",
    shortDescription: "Product trend analysis for dropshipping and e-commerce.",
    bestFor: ["dropshippers", "product researchers", "store builders"],
    practicalUseCases: [
      "Discover products with rising demand.",
      "Validate niches using trend signals.",
      "Track competitor stores and product launches.",
    ],
  },
  {
    slug: "semrush",
    name: "Semrush",
    category: "SEO",
    shortDescription: "Comprehensive SEO and competitive research platform.",
    bestFor: ["SEOs", "marketers", "agencies"],
    practicalUseCases: [
      "Find competitor keywords and content gaps.",
      "Audit site technical SEO issues.",
      "Track rankings and improve on-page SEO.",
    ],
  },
  {
    slug: "sendshort",
    name: "SendShort",
    category: "Video",
    shortDescription: "AI short-form video automation to repurpose long videos into TikTok/Reels/Shorts clips with subtitles.",
    bestFor: ["creators", "UGC ads", "social teams", "SaaS marketing"],
    practicalUseCases: [
      "Turn podcasts, interviews, demos, and webinars into short clips.",
      "Generate batches of subtitled vertical videos ready to post daily.",
      "Feed paid ads with fresh UGC-style creatives without hiring editors.",
    ],
  },
  {
    slug: "shophunter",
    name: "ShopHunter",
    category: "Product Research",
    shortDescription: "Shopify store research and competitor analysis to find products, niches, and real stores that are scaling.",
    bestFor: ["dropshippers", "product researchers", "competitive analysis"],
    aliases: ["ShopHunter"],
    practicalUseCases: [
      "Find products already selling by analyzing real Shopify stores (not ads).",
      "Track competitor store launches and newly added products (early signals).",
      "Assess saturation by comparing adoption across independent stores.",
    ],
  },
  {
    slug: "winninghunter",
    name: "Winning Hunter",
    category: "Product Research",
    shortDescription:
      "Dropshipping product research and ad intelligence to spot early winning products, repeated creatives, and saturation signals.",
    bestFor: ["dropshippers", "media buyers", "product researchers"],
    aliases: ["WinningHunter"],
    practicalUseCases: [
      "Find products with momentum before they become over-saturated.",
      "Validate demand using multiple signals (ads + store adoption + trends).",
      "Reduce wasted testing budgets by prioritizing higher-probability products.",
    ],
  },
  {
    slug: "similarweb",
    name: "Similarweb",
    category: "SEO",
    shortDescription: "Website traffic and competitive intelligence insights.",
    bestFor: ["marketers", "growth teams", "agencies"],
    practicalUseCases: [
      "Estimate competitor traffic sources and channels.",
      "Validate niches based on real traffic patterns.",
      "Find referral sources and partnerships.",
    ],
  },
  {
    slug: "storyblocks",
    name: "Storyblocks",
    category: "Stock Assets",
    shortDescription: "Stock video and motion assets for content creation.",
    bestFor: ["video editors", "creative teams", "marketers"],
    practicalUseCases: [
      "Add B-roll to product ads and explainers.",
      "Build motion graphics for landing pages.",
      "Speed up content production with templates.",
    ],
  },
  {
    slug: "text-optimizer",
    name: "Text Optimizer",
    category: "SEO",
    shortDescription: "Textual content optimization to improve topical coverage.",
    bestFor: ["content SEO", "writers", "site owners"],
    practicalUseCases: [
      "Improve semantic coverage of category pages.",
      "Rewrite headings for clarity and intent.",
      "Optimize FAQs for direct answers.",
    ],
  },
  {
    slug: "ubersuggest",
    name: "Ubersuggest",
    category: "SEO",
    shortDescription: "Keyword research and SEO insights for site owners.",
    bestFor: ["beginners", "small teams", "content operators"],
    practicalUseCases: [
      "Find keyword ideas and content modifiers.",
      "Run lightweight SEO audits.",
      "Track a small set of target keywords.",
    ],
  },
  {
    slug: "vmake",
    name: "Vmake",
    category: "Video",
    shortDescription: "AI video creation and editing for ecommerce ads (UGC, demos, captions, background removal).",
    bestFor: ["ecommerce brands", "dropshippers", "paid ads teams", "UGC operators"],
    aliases: ["Vmake"],
    practicalUseCases: [
      "Turn product images/footage into ad-ready short-form creatives.",
      "Create UGC-style/talking-head formats without filming.",
      "Remove backgrounds, add captions, and generate variations fast for testing.",
    ],
  },
  {
    slug: "youzign",
    name: "Youzign",
    category: "Creative",
    shortDescription: "Graphic design tool for banners, mockups, and marketing visuals.",
    bestFor: ["marketers", "store owners", "designers"],
    practicalUseCases: [
      "Create quick ad mockups and banners.",
      "Design thumbnails for content.",
      "Build visual assets for landing sections.",
    ],
  },
  {
    slug: "yourtextguru",
    name: "YourTextGuru",
    category: "SEO",
    shortDescription: "SEO content optimization and semantic coverage guidance.",
    bestFor: ["SEO writers", "content teams", "agencies"],
    practicalUseCases: [
      "Create SEO briefs for writers with keyword coverage targets.",
      "Optimize existing pages to increase topical authority.",
      "Improve internal linking strategy from semantic clusters.",
    ],
  },
  {
    slug: "woorank",
    name: "WooRank",
    category: "SEO",
    shortDescription: "SEO analysis and website audit tool.",
    bestFor: ["site owners", "agencies", "marketers"],
    practicalUseCases: [
      "Run quick audits to find on-page issues.",
      "Create client-friendly SEO reports.",
      "Track improvements after fixes.",
    ],
  },
];

