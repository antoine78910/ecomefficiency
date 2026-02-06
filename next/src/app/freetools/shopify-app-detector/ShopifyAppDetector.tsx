"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type AppResolved = {
  slug: string;
  name: string;
  logo: string;
  appStoreUrl: string;
};

type ApiResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      input: string;
      hostname: string;
      fetchedUrl: string;
      status: number;
      detectedAt: string;
      warnings: string[];
      evidence: string | null;
      urls: string[];
      apps: Array<{ url: string; label: string }>;
    };

function normalizeDisplay(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]!;
}

function toSlugCandidate(input: string) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  const cleaned = s
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(cleaned)) return "";
  return cleaned;
}

// Domain → Shopify App Store slug mapping.
// This is intentionally a curated allow-list: we only add entries we know.
const DOMAIN_TO_SHOPIFY_APP_SLUG: Record<string, string> = {
  // Common ecommerce apps
  "gorgias.chat": "gorgias",
  "tapcart.com": "tapcart",
  "judge.me": "judge-me",
  "loox.io": "loox",
  "rechargepayments.com": "recharge-subscriptions",
  "klaviyo.com": "klaviyo-email-marketing-sms",
  "yotpo.com": "yotpo",
  "aftership.com": "aftership",
  "omnisend.com": "omnisend-email-marketing-sms",
  "privy.com": "privy",
  "stamped.io": "stamped-io-product-reviews-ugc",
  "rise.ai": "rise-ai",
  "smile.io": "smile-io",
  "tidio.com": "tidio-chat",
  "pushowl.com": "pushowl",
};

function domainToKnownSlugCandidates(hostname: string) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  if (!host) return [];

  const out: string[] = [];
  const exact = DOMAIN_TO_SHOPIFY_APP_SLUG[host];
  if (exact) out.push(exact);

  // Try mapping root domain if we have it.
  const parts = host.split(".").filter(Boolean);
  if (parts.length >= 2) {
    const root = `${parts.slice(-2).join(".")}`;
    const mapped = DOMAIN_TO_SHOPIFY_APP_SLUG[root];
    if (mapped) out.push(mapped);
  }

  return Array.from(new Set(out));
}

function extractSlugCandidatesFromUrls(urls: string[]) {
  const out: string[] = [];
  for (const u of urls) {
    // If the URL already references the App Store, use it.
    const m = String(u).match(/apps\.shopify\.com\/([a-z0-9][a-z0-9-]{0,80})/i);
    if (m?.[1]) out.push(m[1].toLowerCase());

    try {
      const parsed = new URL(u);
      const host = parsed.hostname.toLowerCase();
      // Prefer known mappings for exact domains (e.g. gorgias.chat → gorgias).
      for (const s of domainToKnownSlugCandidates(host)) out.push(s);
    } catch {
      // If it's not a valid URL, it might be a bare domain.
      for (const s of domainToKnownSlugCandidates(String(u))) out.push(s);
    }
  }
  return Array.from(new Set(out));
}

export default function ShopifyAppDetector() {
  const [domain, setDomain] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ApiResponse | null>(null);
  const [resolvedByLabel, setResolvedByLabel] = React.useState<Record<string, AppResolved | null>>({});
  const [resolving, setResolving] = React.useState(false);

  const run = React.useCallback(async () => {
    const d = normalizeDisplay(domain);
    if (!d) {
      setResult({ ok: false, error: "Please enter a domain (example: brand.com)." });
      return;
    }

    setLoading(true);
    setResult(null);
    setResolvedByLabel({});
    try {
      const r = await fetch(`/api/freetools/shopify-app-detect?domain=${encodeURIComponent(d)}`, { cache: "no-store" });
      const j = (await r.json()) as ApiResponse;
      setResult(j);
    } catch {
      setResult({ ok: false, error: "Request failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const byLabel = React.useMemo(() => {
    if (!result || !result.ok) return [];
    const map = new Map<string, { label: string; urls: string[]; slugCandidates: string[] }>();
    for (const a of result.apps || []) {
      const label = a.label || a.url;
      const entry = map.get(label) || { label, urls: [] as string[], slugCandidates: [] as string[] };
      entry.urls.push(a.url);
      map.set(label, entry);
    }
    const arr = Array.from(map.values()).map((x) => ({
      ...x,
      slugCandidates: extractSlugCandidatesFromUrls(x.urls),
    }));
    return arr.sort((a, b) => a.label.localeCompare(b.label));
  }, [result]);

  React.useEffect(() => {
    let cancelled = false;

    async function resolveOne(label: string, candidates: string[]) {
      for (const slug of candidates) {
        try {
          const r = await fetch(`/api/freetools/shopify-app-resolve?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
          const j = (await r.json()) as AppResolved | null;
          if (j && j.slug && j.name && j.logo && j.appStoreUrl) return j;
        } catch {
          // try next candidate
        }
      }
      return null;
    }

    async function runResolve() {
      if (!result || !result.ok) return;
      if (!byLabel.length) return;

      // Resolve only top N entries to keep latency reasonable.
      const MAX = 12;
      const targets = byLabel.slice(0, MAX).filter((x) => x.slugCandidates.length);
      if (!targets.length) return;

      setResolving(true);
      try {
        // Simple concurrency = 2
        let idx = 0;
        const worker = async () => {
          while (idx < targets.length) {
            const cur = targets[idx++]!;
            if (cancelled) return;
            const resolved = await resolveOne(cur.label, cur.slugCandidates);
            if (cancelled) return;
            setResolvedByLabel((prev) => (prev[cur.label] !== undefined ? prev : { ...prev, [cur.label]: resolved }));
          }
        };
        await Promise.all([worker(), worker()]);
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    runResolve();
    return () => {
      cancelled = true;
    };
  }, [byLabel, result]);

  return (
    <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
      <div className="text-white font-semibold">Detect Shopify apps</div>
      <div className="text-xs text-gray-400 mt-1">
        Paste a Shopify store URL or domain. We’ll search the storefront HTML for <span className="text-gray-200 font-medium">syncload</span> and extract
        the embedded script URLs.
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
            }}
            placeholder="example: brand.com"
            className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className={[
            "h-11 rounded-xl px-5 text-sm font-semibold transition-colors",
            "bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110",
            "border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.25)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "inline-flex items-center justify-center gap-2",
          ].join(" ")}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Analyze
        </button>
      </div>

      {loading ? (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 bg-purple-400/80 animate-[loading_1.2s_ease-in-out_infinite]" />
          </div>
          <style>{`@keyframes loading{0%{transform:translateX(-50%)}50%{transform:translateX(70%)}100%{transform:translateX(220%)}}`}</style>
          <div className="mt-2 text-[11px] text-gray-400">Analyzing…</div>
        </div>
      ) : null}

      {result && !result.ok ? (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{result.error}</div>
      ) : null}

      {result && result.ok ? (
        <div className="mt-6 rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-500/18 to-transparent p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold tracking-wide text-purple-100">APPS</div>
            <span className="text-[11px] text-gray-300 border border-white/10 rounded-full px-2.5 py-1 bg-white/5">
              Found: {byLabel.length}
            </span>
          </div>

          {resolving ? <div className="mt-2 text-[11px] text-gray-400">Resolving official App Store names & logos…</div> : null}

          <div className="mt-3 text-xs text-gray-300">
            <span className="text-gray-400">Fetched:</span>{" "}
            <span className="text-white/90 font-medium">{result.fetchedUrl}</span>
          </div>

          <div className="mt-1 text-xs text-gray-300">
            <span className="text-gray-400">Evidence:</span>{" "}
            <span className="text-white/90 font-medium">{result.evidence ? result.evidence : "none"}</span>
          </div>

          {result.warnings?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
              <div className="font-semibold text-white mb-2">Notes</div>
              <ul className="list-disc list-inside space-y-1">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {byLabel.length ? (
              byLabel.map((app) => (
                <div key={app.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {resolvedByLabel[app.label] ? (
                        <a
                          href={resolvedByLabel[app.label]!.appStoreUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-white hover:underline underline-offset-4"
                          title="Open Shopify App Store page"
                        >
                          <img
                            src={resolvedByLabel[app.label]!.logo}
                            alt=""
                            className="h-7 w-7 rounded-md border border-white/10 bg-black/20 object-cover"
                            loading="lazy"
                          />
                          <span className="font-semibold truncate max-w-[360px]">{resolvedByLabel[app.label]!.name}</span>
                          <span className="text-[11px] text-gray-400">({resolvedByLabel[app.label]!.slug})</span>
                        </a>
                      ) : (
                        <div className="font-semibold text-white">{app.label}</div>
                      )}
                      {resolvedByLabel[app.label] === null && app.slugCandidates.length ? (
                        <div className="mt-1 text-[11px] text-gray-400">
                          App Store: not found (tried {app.slugCandidates.slice(0, 2).join(", ")}
                          {app.slugCandidates.length > 2 ? "…" : ""})
                        </div>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-gray-300 border border-white/10 rounded-full px-2.5 py-1 bg-white/5">
                      URLs: {app.urls.length}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {app.urls.slice(0, 5).map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-gray-300 hover:text-white underline underline-offset-4 break-all"
                      >
                        {u}
                      </a>
                    ))}
                    {app.urls.length > 5 ? <div className="text-xs text-gray-400">…and {app.urls.length - 5} more</div> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-200">
                No app URLs detected. Try another store, or the store may not use <span className="font-semibold">syncload</span>.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

