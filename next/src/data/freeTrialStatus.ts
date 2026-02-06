export type TrialStatus = "real" | "limited" | "none" | "unknown";

export type FreeTrialInfo = {
  /** Tool slug used across /tools, /discount, /groupbuy, etc. */
  slug: string;
  /** 🟢=real free trial, 🟡=limited/freemium, 🔴=none */
  status: TrialStatus;
  /** Short, factual summary of the official free trial situation. */
  summary: string;
  /** Best-effort fields: only filled when we have explicit info. */
  duration?: string;
  creditCardRequired?: "yes" | "no" | "unknown";
  accessLevel?: "full" | "partial" | "freemium" | "unknown";
};

// Source: user-provided “TABLE MASTER — FREE TRIAL STATUS”.
// Important: do not invent details. If unclear, keep fields undefined and status "unknown".
export const FREE_TRIAL_BY_SLUG: Record<string, FreeTrialInfo> = {
  // AI / creative tools
  "flair-ai": { slug: "flair-ai", status: "none", summary: "No free trial. Paid plans only." },
  atria: { slug: "atria", status: "none", summary: "No public free trial. Access starts on paid plans." },
  midjourney: { slug: "midjourney", status: "none", summary: "No free trial. Discord access requires payment." },
  elevenlabs: {
    slug: "elevenlabs",
    status: "real",
    summary: "Free tier with limited characters (good for basic voice testing).",
    accessLevel: "partial",
    creditCardRequired: "no",
  },
  chatgpt: { slug: "chatgpt", status: "real", summary: "Free tier available (advanced features require paid plans).", accessLevel: "partial" },
  canva: { slug: "canva", status: "real", summary: "14-day free trial for Pro (full access during trial).", duration: "14 days", accessLevel: "full" },
  freepik: { slug: "freepik", status: "limited", summary: "Freemium model with daily download limits (premium assets require upgrade).", accessLevel: "freemium" },
  sendshort: { slug: "sendshort", status: "none", summary: "No free trial. Paid access required." },
  fotor: { slug: "fotor", status: "limited", summary: "Freemium with export and feature limits.", accessLevel: "freemium" },
  higgsfield: { slug: "higgsfield", status: "none", summary: "No free trial available." },
  vmake: { slug: "vmake", status: "limited", summary: "Limited free exports (paid plans unlock full features).", accessLevel: "freemium" },
  heygen: { slug: "heygen", status: "real", summary: "Free trial with watermarked videos and usage caps.", accessLevel: "partial" },
  turboscribe: { slug: "turboscribe", status: "real", summary: "Free tier with transcription limits.", accessLevel: "partial" },
  "brain-fm": { slug: "brain-fm", status: "real", summary: "7-day free trial available.", duration: "7 days", accessLevel: "full" },
  capcut: { slug: "capcut", status: "real", summary: "Free version available (Pro features optional).", accessLevel: "partial" },
  academun: { slug: "academun", status: "none", summary: "No free trial. Paid access only." },
  writehuman: { slug: "writehuman", status: "limited", summary: "Limited free credits (full usage requires subscription).", accessLevel: "freemium" },
  bypassgpt: { slug: "bypassgpt", status: "none", summary: "No free trial. Paid usage only." },
  quillbot: { slug: "quillbot", status: "real", summary: "Free version with limits (premium unlocks full modes).", accessLevel: "partial" },
  smodin: { slug: "smodin", status: "limited", summary: "Limited free usage per day.", accessLevel: "freemium" },
  wordai: { slug: "wordai", status: "real", summary: "3-day free trial with full access.", duration: "3 days", accessLevel: "full" },

  // E-com / spy / dropshipping
  shophunter: { slug: "shophunter", status: "none", summary: "No free trial. Paid access required." },
  winninghunter: { slug: "winninghunter", status: "none", summary: "No free trial. Pro plans only." },
  pipiads: { slug: "pipiads", status: "limited", summary: "Limited free search credits (full data is locked).", accessLevel: "freemium" },
  kalodata: { slug: "kalodata", status: "none", summary: "No free trial. Subscription required." },
  foreplay: { slug: "foreplay", status: "none", summary: "No free trial. Paid only." },
  "dropship-io": { slug: "dropship-io", status: "none", summary: "No free trial available." },
  helium10: { slug: "helium10", status: "limited", summary: "Free plan available but strongly limited.", accessLevel: "freemium" },
  zonbase: { slug: "zonbase", status: "real", summary: "Free trial available on signup.", accessLevel: "partial" },
  amzscout: { slug: "amzscout", status: "real", summary: "Free trial available (limited duration and features).", accessLevel: "partial" },
  junglescout: { slug: "junglescout", status: "real", summary: "7-day free trial.", duration: "7 days", accessLevel: "partial" },
  "jungle-scout": { slug: "jungle-scout", status: "real", summary: "7-day free trial.", duration: "7 days", accessLevel: "partial" },
  smartscout: { slug: "smartscout", status: "none", summary: "No free trial." },
  zikanalytics: { slug: "zikanalytics", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  "niche-scraper": { slug: "niche-scraper", status: "limited", summary: "Free preview, but core features require payment.", accessLevel: "freemium" },
  pexda: { slug: "pexda", status: "limited", summary: "Limited free access to product listings.", accessLevel: "freemium" },
  alura: { slug: "alura", status: "real", summary: "Free trial available (for Etsy sellers).", accessLevel: "partial" },

  // SEO / marketing tools
  semrush: { slug: "semrush", status: "none", summary: "No free trial. Access requires payment (occasionally limited promos)." },
  ahrefs: { slug: "ahrefs", status: "none", summary: "No free trial. Paid plans only." },
  ubersuggest: { slug: "ubersuggest", status: "limited", summary: "Freemium with daily query limits.", accessLevel: "freemium" },
  seobserver: { slug: "seobserver", status: "none", summary: "No free trial." },
  "se-ranking": { slug: "se-ranking", status: "real", summary: "14-day free trial.", duration: "14 days", accessLevel: "full" },
  answerthepublic: { slug: "answerthepublic", status: "limited", summary: "Limited free searches per day.", accessLevel: "freemium" },
  similarweb: { slug: "similarweb", status: "limited", summary: "Free version with very limited data.", accessLevel: "freemium" },
  surferlink: { slug: "surferlink", status: "none", summary: "No free trial." },
  "exploding-topics": { slug: "exploding-topics", status: "limited", summary: "Limited free trend access.", accessLevel: "freemium" },
  spyfu: { slug: "spyfu", status: "limited", summary: "Free searches with restricted exports.", accessLevel: "freemium" },
  keywordtool: { slug: "keywordtool", status: "limited", summary: "Free keyword suggestions without volumes.", accessLevel: "freemium" },
  "keyword-tool": { slug: "keyword-tool", status: "limited", summary: "Free keyword suggestions without volumes.", accessLevel: "freemium" },
  wincher: { slug: "wincher", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  serpstat: { slug: "serpstat", status: "limited", summary: "Limited free usage.", accessLevel: "freemium" },
  haloscan: { slug: "haloscan", status: "none", summary: "No free trial." },
  seoptimer: { slug: "seoptimer", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  dinorank: { slug: "dinorank", status: "none", summary: "No free trial." },
  seozoom: { slug: "seozoom", status: "none", summary: "No free trial." },
  searchatlas: { slug: "searchatlas", status: "none", summary: "No free trial." },
  mangools: { slug: "mangools", status: "real", summary: "10-day free trial.", duration: "10 days", accessLevel: "full" },
  sistrix: { slug: "sistrix", status: "none", summary: "No free trial." },
  publicwww: { slug: "publicwww", status: "limited", summary: "Limited free searches.", accessLevel: "freemium" },
  xovi: { slug: "xovi", status: "limited", summary: "Demo access / limited trial.", accessLevel: "partial" },
  ranxplorer: { slug: "ranxplorer", status: "none", summary: "No free trial." },
  babbar: { slug: "babbar", status: "none", summary: "No free trial." },
  moz: { slug: "moz", status: "real", summary: "30-day free trial.", duration: "30 days", accessLevel: "full" },
  woorank: { slug: "woorank", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  "one-hour-indexing": { slug: "one-hour-indexing", status: "none", summary: "No free trial." },
  keysearch: { slug: "keysearch", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  textoptimizer: { slug: "textoptimizer", status: "limited", summary: "Limited free analysis.", accessLevel: "freemium" },
  "text-optimizer": { slug: "text-optimizer", status: "limited", summary: "Limited free analysis.", accessLevel: "freemium" },
  "1fr": { slug: "1fr", status: "limited", summary: "Freemium semantic analysis.", accessLevel: "freemium" },
  "1.fr": { slug: "1.fr", status: "limited", summary: "Freemium semantic analysis.", accessLevel: "freemium" },
  domcop: { slug: "domcop", status: "none", summary: "No free trial." },
  majestic: { slug: "majestic", status: "none", summary: "No free trial." },
  "screaming-frog": {
    slug: "screaming-frog",
    status: "real",
    summary: "Free version available up to 500 URLs (paid license required beyond that).",
    accessLevel: "partial",
  },

  // Design / assets
  flaticon: { slug: "flaticon", status: "limited", summary: "Free icons with attribution (premium required for full access).", accessLevel: "freemium" },
  "123rf": { slug: "123rf", status: "limited", summary: "Free previews (paid downloads).", accessLevel: "freemium" },
  "motion-array": { slug: "motion-array", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  artlist: { slug: "artlist", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  storyblocks: { slug: "storyblocks", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  "envato-elements": { slug: "envato-elements", status: "real", summary: "Free trial available.", accessLevel: "partial" },
  iconscout: { slug: "iconscout", status: "limited", summary: "Limited free downloads.", accessLevel: "freemium" },
};

export function getFreeTrialInfo(slug: string): FreeTrialInfo {
  const s = String(slug || "").trim().toLowerCase();
  return (
    FREE_TRIAL_BY_SLUG[s] || {
      slug: s,
      status: "unknown",
      summary: "Official free trial details are not clearly public. Use a structured test to decide.",
    }
  );
}

