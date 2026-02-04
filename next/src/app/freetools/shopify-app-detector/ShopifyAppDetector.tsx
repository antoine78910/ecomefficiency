"use client";

import * as React from "react";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";

type ApiResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      input: string;
      hostname: string;
      fetchedUrl: string;
      status: number;
      isShopify: boolean;
      theme: { name: string | null; confidence: "high" | "medium" | "low"; evidence?: string };
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

function ConfidencePill({ level }: { level: "high" | "medium" | "low" }) {
  const styles =
    level === "high"
      ? "bg-green-500/15 border-green-500/30 text-green-200"
      : level === "medium"
        ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-200"
        : "bg-gray-500/15 border-gray-500/30 text-gray-200";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${styles}`}>Confidence: {level}</span>;
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-white font-semibold">Detect apps and theme</div>
            <div className="text-xs text-gray-400 mt-1">Paste a Shopify store domain and run detection.</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <label className="block">
            <div className="text-sm font-medium text-gray-200 mb-2">Store domain</div>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example: brand.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 text-white px-3 py-2.5 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
            />
          </label>

          <button
            type="button"
            onClick={run}
            disabled={loading}
            className={[
              "h-11 rounded-xl px-4 text-sm font-semibold transition-colors",
              "bg-white text-black hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed",
              "inline-flex items-center justify-center gap-2",
            ].join(" ")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Detect
          </button>
        </div>

        {result && !result.ok ? (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {result.error}
          </div>
        ) : null}

        {result && result.ok ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <div className="text-white font-semibold mb-2">Scan details</div>
            <ul className="space-y-2">
              <li>
                <strong>Domain:</strong> {result.hostname}
              </li>
              <li>
                <strong>Fetched URL:</strong> {result.fetchedUrl} ({result.status})
              </li>
              <li className="text-xs text-gray-400">
                Detected at {new Date(result.detectedAt).toLocaleString("en-US")}
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#b6ff5a] text-black p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm font-semibold tracking-wide">SHOPIFY STORE</div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-4xl font-extrabold">{result && result.ok ? (result.isShopify ? "Yes" : "No") : "—"}</div>
            <div className="shrink-0">
              {result && result.ok ? (
                result.isShopify ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <ShieldX className="h-6 w-6" />
                )
              ) : null}
            </div>
          </div>
          <div className="mt-3 text-xs text-black/70">
            We check public storefront signals (HTML + Shopify endpoints). Some stores block automated scans.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#b6ff5a] text-black p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="text-sm font-semibold tracking-wide">THEME</div>
          <div className="mt-4 text-3xl font-extrabold">{result && result.ok ? result.theme.name || "Not found" : "—"}</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            {result && result.ok ? <ConfidencePill level={result.theme.confidence} /> : <ConfidencePill level="low" />}
            <div className="text-xs text-black/70">{result && result.ok ? (result.theme.evidence ? `Source: ${result.theme.evidence}` : "") : ""}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gray-900/20 text-white p-6">
          <div className="text-sm font-semibold tracking-wide text-gray-200">APPS (BEST EFFORT)</div>
          <div className="mt-4 space-y-3">
            {result && result.ok ? (
              result.apps.length ? (
                result.apps.map((a) => (
                  <div key={a.name} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{a.name}</div>
                      <span className="text-[11px] text-gray-300 border border-white/10 rounded-full px-2 py-0.5 bg-white/5">
                        {a.confidence}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Matched: {a.evidence}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-300">No app signatures found on the homepage HTML.</div>
              )
            ) : (
              <div className="text-sm text-gray-300">Run detection to list apps.</div>
            )}
          </div>

          {result && result.ok && result.warnings?.length ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-white font-semibold mb-2">Notes</div>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

