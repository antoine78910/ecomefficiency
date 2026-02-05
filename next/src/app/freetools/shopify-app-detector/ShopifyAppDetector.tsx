"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type ApiResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      input: string;
      hostname: string;
      fetchedUrl: string;
      status: number;
      isShopify: boolean;
      theme: { name: string | null; internalName?: string | null; confidence: "high" | "medium" | "low"; evidence?: string };
      apps: Array<{ name: string; confidence: "high" | "medium"; evidence: string }>;
      signals: { cartJsOk: boolean; productsJsonOk: boolean };
      detectedAt: string;
      warnings: string[];
    };

function normalizeDisplay(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]!;
}

function ThemeBadge({ theme }: { theme: { name: string | null; confidence: "high" | "medium" | "low" } }) {
  const label = theme.name || "Not found";
  const tone =
    theme.confidence === "high"
      ? "border-purple-500/35 bg-purple-500/15 text-purple-100"
      : theme.confidence === "medium"
        ? "border-white/15 bg-white/5 text-gray-200"
        : "border-white/10 bg-black/20 text-gray-300";
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm ${tone}`}>
      <span className="font-semibold">{label}</span>
    </div>
  );
}

export default function ShopifyAppDetector() {
  const [domain, setDomain] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ApiResponse | null>(null);

  const run = React.useCallback(async () => {
    const d = normalizeDisplay(domain);
    if (!d) {
      setResult({ ok: false, error: "Please enter a domain (example: brand.com)." });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`/api/freetools/shopify-detect?domain=${encodeURIComponent(d)}`, { cache: "no-store" });
      const j = (await r.json()) as ApiResponse;
      setResult(j);
    } catch {
      setResult({ ok: false, error: "Request failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [domain]);

  return (
    <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
      <div className="text-white font-semibold">Analyze a Shopify store</div>
      <div className="text-xs text-gray-400 mt-1">Paste a store URL or domain. We will return the theme name (best effort).</div>

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
            <div className="text-sm font-semibold tracking-wide text-purple-100">THEME</div>
            <span className="text-[11px] text-gray-300 border border-white/10 rounded-full px-2.5 py-1 bg-white/5">
              Shopify: {result.isShopify ? "Yes" : "No"}
            </span>
          </div>

          <div className="mt-4">
            {result.isShopify ? <ThemeBadge theme={result.theme} /> : <ThemeBadge theme={{ name: "Not a Shopify store", confidence: "low" }} />}
          </div>

          {result.isShopify && result.theme?.internalName ? (
            <div className="mt-3 text-xs text-gray-300">
              <span className="text-gray-400">Theme name:</span>{" "}
              <span className="text-white/90 font-medium">{result.theme.internalName}</span>
            </div>
          ) : null}

          <div className="mt-3 text-xs text-gray-300">
            Theme detection is best effort. Some stores hide theme info or load it dynamically.
          </div>
        </div>
      ) : null}
    </div>
  );
}

