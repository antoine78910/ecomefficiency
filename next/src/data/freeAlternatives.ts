export type FreeAlternativeType = "Free" | "Freemium" | "Open-source" | "Free tier" | "Demo";

export type FreeAlternativeItem = {
  /** Display name (e.g. "Meta Ads Library"). */
  name: string;
  /** Whether we have an internal /tools/<slug> page for it. */
  internalSlug?: string;
  type: FreeAlternativeType;
  bestFor: string;
  limitations: string;
};

export type FreeAlternativeInfo = {
  slug: string;
  /** Optional note to render (used for special cases). */
  note?: string;
  alternatives: FreeAlternativeItem[];
  /** Optional internal links to EcomEfficiency free tools (Shopify app/theme detector). */
  includeShopifyFreeToolsLinks?: boolean;
};

// Source: user-provided “AI / CREATIVE TOOLS — ANALYSE DÉTAILLÉE” and “E-COM / SPY / DROPSHIPPING — ANALYSE DÉTAILLÉE”.
// Rule: do not invent external links. We only link internally when the alternative exists in /tools.
export const FREE_ALTERNATIVES_BY_SLUG: Record<string, FreeAlternativeInfo> = {
  // AI / Creative
  "flair-ai": {
    slug: "flair-ai",
    alternatives: [
      {
        name: "Canva",
        internalSlug: "canva",
        type: "Freemium",
        bestFor: "quick product visuals, ad tests, and social assets",
        limitations: "less AI-native and less realistic on complex product scenes",
      },
      {
        name: "Pebblely",
        type: "Freemium",
        bestFor: "AI product photos with simple scene generation",
        limitations: "free quota runs out quickly and creative control is limited",
      },
      {
        name: "Photopea",
        type: "Free",
        bestFor: "manual edits and mockups when you need full control",
        limitations: "not AI-driven and can be slower than an AI workflow",
      },
    ],
  },
  atria: {
    slug: "atria",
    alternatives: [
      {
        name: "Meta Ads Library",
        type: "Free",
        bestFor: "manual angle research using real competitor ads",
        limitations: "no automation, no scoring, and limited workflow organization",
      },
      {
        name: "TikTok Creative Center",
        type: "Free",
        bestFor: "TikTok-specific creative research and trend discovery",
        limitations: "less historical depth and no structured insights",
      },
      {
        name: "Foreplay",
        internalSlug: "foreplay",
        type: "Demo",
        bestFor: "organizing a swipe file if you later upgrade",
        limitations: "not a truly free replacement; full workflow requires paid access",
      },
    ],
  },
  midjourney: {
    slug: "midjourney",
    alternatives: [
      {
        name: "Stable Diffusion",
        type: "Open-source",
        bestFor: "power users who want full control and local workflows",
        limitations: "setup is technical and output quality depends on models/settings",
      },
      {
        name: "Leonardo AI",
        type: "Freemium",
        bestFor: "a no-code interface with free credits to test styles",
        limitations: "limited volume and sometimes lower consistency than Midjourney",
      },
      {
        name: "Freepik",
        internalSlug: "freepik",
        type: "Freemium",
        bestFor: "stock assets for blogs/socials when you don’t need custom generations",
        limitations: "less unique than AI generation and premium assets require upgrade",
      },
    ],
  },
  elevenlabs: {
    slug: "elevenlabs",
    alternatives: [
      {
        name: "Google / Microsoft TTS",
        type: "Free tier",
        bestFor: "stable basic TTS testing and internal prototypes",
        limitations: "voices can feel less emotional/marketing-native",
      },
      {
        name: "Coqui TTS",
        type: "Open-source",
        bestFor: "developers who want customization and local usage",
        limitations: "technical setup and quality varies by model",
      },
      {
        name: "CapCut",
        internalSlug: "capcut",
        type: "Free",
        bestFor: "simple voiceover + video editing workflows",
        limitations: "not a dedicated voice generation platform",
      },
    ],
  },
  chatgpt: {
    slug: "chatgpt",
    alternatives: [
      {
        name: "Google Gemini",
        type: "Free",
        bestFor: "general Q&A and ideation",
        limitations: "less consistent for some long-form writing workflows",
      },
      {
        name: "Perplexity",
        type: "Free",
        bestFor: "research workflows with sources and web context",
        limitations: "less flexible for copywriting-style outputs",
      },
      {
        name: "QuillBot",
        internalSlug: "quillbot",
        type: "Free tier",
        bestFor: "basic rewriting and clarity improvements",
        limitations: "not a full assistant for multi-step reasoning",
      },
    ],
  },
  canva: {
    slug: "canva",
    alternatives: [
      {
        name: "Adobe Express",
        type: "Freemium",
        bestFor: "simple marketing designs with an Adobe-style workflow",
        limitations: "fewer templates and less intuitive UX for some users",
      },
      {
        name: "Figma",
        type: "Freemium",
        bestFor: "professional design systems and collaboration",
        limitations: "less oriented to quick marketing templates and asset churn",
      },
      {
        name: "Freepik",
        internalSlug: "freepik",
        type: "Freemium",
        bestFor: "stock assets to speed up creative production",
        limitations: "not a full design editor replacement",
      },
    ],
  },
  freepik: {
    slug: "freepik",
    alternatives: [
      { name: "Pexels", type: "Free", bestFor: "free photos for blogs and socials", limitations: "less branded/marketing-native content" },
      { name: "Pixabay", type: "Free", bestFor: "general free assets and photos", limitations: "less premium selection vs paid libraries" },
      { name: "Unsplash", type: "Free", bestFor: "high-quality free photos", limitations: "not always ad-ready or ecommerce-focused" },
    ],
  },
  sendshort: {
    slug: "sendshort",
    alternatives: [
      {
        name: "CapCut",
        internalSlug: "capcut",
        type: "Free",
        bestFor: "manual short-form editing with templates",
        limitations: "less automated (more manual work vs SendShort)",
      },
      {
        name: "Opus Clip",
        type: "Freemium",
        bestFor: "auto-clipping long videos into shorts",
        limitations: "watermark and limits in free tier",
      },
      {
        name: "TurboScribe",
        internalSlug: "turboscribe",
        type: "Free tier",
        bestFor: "transcription-first repurposing workflows",
        limitations: "doesn’t replace full auto-editing",
      },
    ],
  },
  fotor: {
    slug: "fotor",
    alternatives: [
      { name: "Photopea", type: "Free", bestFor: "advanced manual editing in the browser", limitations: "less beginner-friendly" },
      { name: "Pixlr", type: "Freemium", bestFor: "quick edits and basic AI helpers", limitations: "export/feature limits" },
      { name: "Canva", internalSlug: "canva", type: "Freemium", bestFor: "simple edits + fast marketing assets", limitations: "not a full photo editor" },
    ],
  },
  higgsfield: {
    slug: "higgsfield",
    note: "There is no true free Higgsfield alternative with the same realism. Free options are typically watermarked or heavily capped.",
    alternatives: [
      { name: "InVideo", type: "Freemium", bestFor: "template-based video creation", limitations: "not equivalent realism/style control" },
      { name: "Runway", internalSlug: "runway", type: "Freemium", bestFor: "limited credits for AI video testing", limitations: "caps/credits limit true scaling" },
      { name: "CapCut", internalSlug: "capcut", type: "Free", bestFor: "manual edits when AI generation isn’t required", limitations: "not AI video generation" },
    ],
  },
  vmake: {
    slug: "vmake",
    alternatives: [
      { name: "CapCut", internalSlug: "capcut", type: "Free", bestFor: "short-form editing, captions, and templates", limitations: "more manual, less AI" },
      { name: "DaVinci Resolve", type: "Free", bestFor: "professional editing with zero cost", limitations: "steeper learning curve; not AI-native" },
      { name: "Shotcut", type: "Free", bestFor: "basic editing on low-end setups", limitations: "less modern workflow and fewer AI assists" },
    ],
  },
  heygen: {
    slug: "heygen",
    alternatives: [
      { name: "D-ID", type: "Freemium", bestFor: "simple avatar/talking-head experiments", limitations: "limits/watermarks on free access" },
      { name: "Synthesia", type: "Demo", bestFor: "testing avatar presenter concepts", limitations: "trial/demo is restricted" },
      { name: "Higgsfield", internalSlug: "higgsfield", type: "Demo", bestFor: "premium creative generation when you upgrade", limitations: "not a free replacement" },
    ],
  },
  turboscribe: {
    slug: "turboscribe",
    alternatives: [
      { name: "Whisper", type: "Open-source", bestFor: "local transcription with strong accuracy", limitations: "setup required; manual workflow" },
      { name: "Google Docs voice typing", type: "Free", bestFor: "quick transcripts for short sessions", limitations: "not optimized for long files/automation" },
      { name: "ChatGPT", internalSlug: "chatgpt", type: "Free tier", bestFor: "summaries once you have a transcript", limitations: "needs input transcript first" },
    ],
  },
  "brain-fm": {
    slug: "brain-fm",
    alternatives: [
      { name: "myNoise", type: "Free", bestFor: "focus soundscapes", limitations: "less personalization to your work mode" },
      { name: "Noisli", type: "Freemium", bestFor: "simple background sounds", limitations: "less science-driven personalization" },
      { name: "YouTube focus music", type: "Free", bestFor: "quick, zero-friction focus sessions", limitations: "no personalization; variable quality" },
    ],
  },
  capcut: {
    slug: "capcut",
    alternatives: [
      { name: "DaVinci Resolve", type: "Free", bestFor: "pro editing on a free plan", limitations: "slower workflow for fast UGC churn" },
      { name: "Shotcut", type: "Free", bestFor: "basic editing", limitations: "fewer templates and modern short-form helpers" },
      { name: "Kdenlive", type: "Free", bestFor: "open-source editing", limitations: "more manual and less template-driven" },
    ],
  },
  academun: {
    slug: "academun",
    alternatives: [
      { name: "Zotero", type: "Free", bestFor: "reference management and research organization", limitations: "not an AI writing assistant" },
      { name: "Google Scholar", type: "Free", bestFor: "finding sources and papers", limitations: "manual synthesis required" },
      { name: "Perplexity", type: "Free", bestFor: "research summaries with sources", limitations: "less structured academic workflow tooling" },
    ],
  },
  writehuman: {
    slug: "writehuman",
    note: "We recommend clarity and editing tools — not “evasion” workflows. Focus on writing quality and readability.",
    alternatives: [
      { name: "Grammarly", type: "Freemium", bestFor: "clarity, grammar, and tone improvements", limitations: "not a full rewriting engine in free tier" },
      { name: "Hemingway Editor", type: "Free", bestFor: "simplifying readability and structure", limitations: "no advanced rewriting automation" },
      { name: "LanguageTool", type: "Freemium", bestFor: "grammar and style checks", limitations: "feature limits in free tier" },
    ],
  },
  bypassgpt: {
    slug: "bypassgpt",
    note: "We don’t promote detection evasion tools. Legit alternatives focus on clarity, originality, and readable writing.",
    alternatives: [
      { name: "Grammarly", type: "Freemium", bestFor: "clarity and grammar improvements", limitations: "advanced features require paid plans" },
      { name: "LanguageTool", type: "Freemium", bestFor: "writing correctness and style", limitations: "free tier limits" },
      { name: "QuillBot (free)", internalSlug: "quillbot", type: "Free tier", bestFor: "basic paraphrasing for readability", limitations: "limited modes/controls" },
    ],
  },
  quillbot: {
    slug: "quillbot",
    alternatives: [
      { name: "LanguageTool", type: "Freemium", bestFor: "writing quality fixes", limitations: "not a full paraphrasing suite" },
      { name: "Grammarly (free)", type: "Freemium", bestFor: "clarity and correctness", limitations: "not a paraphrasing engine" },
      { name: "DeepL Write", type: "Free", bestFor: "clean rewriting for clarity", limitations: "less control over paraphrase styles" },
    ],
  },
  smodin: {
    slug: "smodin",
    alternatives: [
      { name: "LanguageTool", type: "Freemium", bestFor: "writing corrections", limitations: "not a full rewrite engine" },
      { name: "Grammarly (free)", type: "Freemium", bestFor: "clarity improvements", limitations: "advanced tone controls are paid" },
      { name: "DeepL Write", type: "Free", bestFor: "rewrite for readability", limitations: "not optimized for bulk workflows" },
    ],
  },
  wordai: {
    slug: "wordai",
    alternatives: [
      { name: "DeepL Write", type: "Free", bestFor: "rewrite for clarity", limitations: "not built for bulk rewriting at scale" },
      { name: "LanguageTool", type: "Freemium", bestFor: "style + grammar improvements", limitations: "not an automatic spinner" },
      { name: "QuillBot (free)", internalSlug: "quillbot", type: "Free tier", bestFor: "basic paraphrasing", limitations: "limited modes in free tier" },
    ],
  },

  // E-com / Spy / Dropshipping
  shophunter: {
    slug: "shophunter",
    includeShopifyFreeToolsLinks: true,
    alternatives: [
      { name: "BuiltWith", type: "Freemium", bestFor: "tech stack detection on stores", limitations: "no business context or store-level insights" },
      { name: "Wappalyzer", type: "Freemium", bestFor: "quick app/theme detection", limitations: "no market/competitor insights" },
      { name: "Manual inspection", type: "Free", bestFor: "checking /collections, /products.json, and source code", limitations: "slow and not scalable" },
    ],
  },
  winninghunter: {
    slug: "winninghunter",
    alternatives: [
      { name: "Meta Ads Library", type: "Free", bestFor: "finding real ads manually", limitations: "no winner scoring or product filtering" },
      { name: "TikTok Creative Center", type: "Free", bestFor: "TikTok ad discovery", limitations: "less filtering and no product validation" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand signal checks", limitations: "doesn’t show ad-level performance" },
    ],
  },
  pipiads: {
    slug: "pipiads",
    alternatives: [
      { name: "TikTok Creative Center", type: "Free", bestFor: "trend discovery and basic ad browsing", limitations: "less history and fewer advanced metrics" },
      { name: "BigSpy", type: "Freemium", bestFor: "multi-platform ad browsing with a free quota", limitations: "limited data and sometimes delayed results" },
      { name: "Meta Ads Library", type: "Free", bestFor: "manual competitor creative research", limitations: "no product-first filtering" },
    ],
  },
  kalodata: {
    slug: "kalodata",
    alternatives: [
      { name: "TikTok Shop analytics (native)", type: "Free", bestFor: "basic official seller/product signals", limitations: "very limited depth and history" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand direction", limitations: "not TikTok Shop micro-data" },
      { name: "Pipiads", internalSlug: "pipiads", type: "Freemium", bestFor: "ad-side signals after validation", limitations: "not a sales/GMV tool" },
    ],
  },
  foreplay: {
    slug: "foreplay",
    alternatives: [
      { name: "Meta Ads Library", type: "Free", bestFor: "ad inspiration (manual)", limitations: "no organization/tagging system" },
      { name: "TikTok Creative Center", type: "Free", bestFor: "TikTok ad inspiration", limitations: "no swipe-file workflow" },
      { name: "Notion / folders", type: "Free", bestFor: "basic swipe file organization", limitations: "manual tagging and no creative analytics" },
    ],
  },
  "dropship-io": {
    slug: "dropship-io",
    alternatives: [
      { name: "Google Trends", type: "Free", bestFor: "macro demand discovery", limitations: "no store/product-level signals" },
      { name: "AliExpress", type: "Free", bestFor: "reviews and basic demand signals", limitations: "no marketing/profitability context" },
      { name: "TikTok Creative Center", type: "Free", bestFor: "creative trend signals", limitations: "not a store-research tool" },
    ],
  },
  helium10: {
    slug: "helium10",
    alternatives: [
      { name: "Amazon Seller Central", type: "Free", bestFor: "your own account data (if you’re a seller)", limitations: "no competitor visibility" },
      { name: "Keepa / CamelCamelCamel", type: "Freemium", bestFor: "price history and trend signals", limitations: "not SEO/listing optimization" },
      { name: "Amazon Best Sellers", type: "Free", bestFor: "popularity discovery", limitations: "no sales estimation" },
    ],
  },
  zonbase: {
    slug: "zonbase",
    alternatives: [
      { name: "Amazon Best Sellers", type: "Free", bestFor: "discovering popular products", limitations: "no reliable revenue estimates" },
      { name: "Movers & Shakers", type: "Free", bestFor: "spotting momentum products", limitations: "not a full research suite" },
      { name: "Keepa", type: "Freemium", bestFor: "price history signals", limitations: "not a full keyword/listing workflow" },
    ],
  },
  amzscout: {
    slug: "amzscout",
    alternatives: [
      { name: "Amazon Best Sellers", type: "Free", bestFor: "product ideas", limitations: "no sales estimation" },
      { name: "Keepa", type: "Freemium", bestFor: "price history", limitations: "doesn’t replace product validation" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand validation", limitations: "not Amazon-specific data" },
    ],
  },
  junglescout: {
    slug: "junglescout",
    alternatives: [
      { name: "Amazon Best Sellers", type: "Free", bestFor: "product popularity discovery", limitations: "no revenue estimates" },
      { name: "Keepa", type: "Freemium", bestFor: "pricing/history signals", limitations: "not a full research suite" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand direction", limitations: "not marketplace micro-data" },
    ],
  },
  smartscout: {
    slug: "smartscout",
    note: "No true free SmartScout alternative exists for brand/seller analytics at depth. Free methods are manual and slower.",
    alternatives: [
      { name: "Amazon storefronts (manual)", type: "Free", bestFor: "basic brand catalog browsing", limitations: "manual and shallow data" },
      { name: "Seller Central (partial)", type: "Free", bestFor: "your own seller insights", limitations: "no competitor visibility" },
      { name: "Manual research", type: "Free", bestFor: "spot-checking categories and brands", limitations: "not scalable" },
    ],
  },
  zikanalytics: {
    slug: "zikanalytics",
    alternatives: [
      { name: "eBay Terapeak (official)", type: "Freemium", bestFor: "official eBay demand signals", limitations: "less deep workflows vs paid suites" },
      { name: "eBay search filters", type: "Free", bestFor: "manual research", limitations: "time-consuming and shallow" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand", limitations: "not eBay-specific" },
    ],
  },
  "niche-scraper": {
    slug: "niche-scraper",
    alternatives: [
      { name: "TikTok Creative Center", type: "Free", bestFor: "ad trend discovery", limitations: "no profitability validation" },
      { name: "Meta Ads Library", type: "Free", bestFor: "manual ad research", limitations: "no scoring/winner system" },
      { name: "AliExpress", type: "Free", bestFor: "basic product signals", limitations: "no marketing performance data" },
    ],
  },
  pexda: {
    slug: "pexda",
    alternatives: [
      { name: "AliExpress + TikTok (manual)", type: "Free", bestFor: "manual product sourcing + trend spotting", limitations: "no conversion scoring" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand checks", limitations: "not product-level performance" },
      { name: "Reddit niche research", type: "Free", bestFor: "finding niche pain points", limitations: "not a product validation engine" },
    ],
  },
  alura: {
    slug: "alura",
    alternatives: [
      { name: "Etsy autocomplete", type: "Free", bestFor: "keyword idea discovery", limitations: "manual and limited depth" },
      { name: "Etsy filters", type: "Free", bestFor: "basic market scanning", limitations: "slow and not structured" },
      { name: "Google Trends", type: "Free", bestFor: "macro demand direction", limitations: "not Etsy-specific SEO data" },
    ],
  },
};

export function getFreeAlternatives(slug: string) {
  const s = String(slug || "").trim().toLowerCase();
  return FREE_ALTERNATIVES_BY_SLUG[s] || null;
}

