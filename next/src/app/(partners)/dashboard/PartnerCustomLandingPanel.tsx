"use client";

import React from "react";
import { Copy, Link2, Loader2, Save } from "lucide-react";

type Props = {
  config: Record<string, unknown>;
  setConfig: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  isExternalLanding: boolean;
  appOriginUrl: string;
  saving: boolean;
  slug: string;
  vercelAttach: { status: string; message?: string };
  integrationBundle: Record<string, unknown> | null;
  integrationLoading: boolean;
  saveConfig: (patch: Record<string, unknown>) => Promise<void>;
  addDomainOnVercel: () => Promise<void>;
  loadIntegrationBundle: () => Promise<void>;
  copyText: (text: string) => void;
};

export default function PartnerCustomLandingPanel({
  config,
  setConfig,
  isExternalLanding,
  appOriginUrl,
  saving,
  slug,
  vercelAttach,
  integrationBundle,
  integrationLoading,
  saveConfig,
  addDomainOnVercel,
  loadIntegrationBundle,
  copyText,
}: Props) {
  const pickLandingMode = (mode: "builtin" | "external") => {
    setConfig((s) => ({ ...s, landingMode: mode }));
    void saveConfig({ landingMode: mode });
  };

  return (
    <div className="mb-5 rounded-xl border border-purple-400/20 bg-purple-500/5 p-4 space-y-3">
      <div className="text-sm font-medium text-white">Landing</div>
      <p className="text-xs text-gray-400">
        Use our template, or host your own marketing site and connect app.yourdomain.com for signup, billing, and the product.
      </p>
      {!slug ? (
        <p className="text-xs text-amber-300">Select or create a partner slug first (configuration).</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!slug || saving}
          onClick={() => pickLandingMode("builtin")}
          className={`px-3 py-2 rounded-xl text-sm border ${
            !isExternalLanding
              ? "border-purple-400/40 bg-purple-500/15 text-white"
              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
          } disabled:opacity-50`}
        >
          Built-in template
        </button>
        <button
          type="button"
          disabled={!slug || saving}
          onClick={() => pickLandingMode("external")}
          className={`px-3 py-2 rounded-xl text-sm border ${
            isExternalLanding
              ? "border-purple-400/40 bg-purple-500/15 text-white"
              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
          } disabled:opacity-50`}
        >
          My own site (code)
        </button>
      </div>
      {isExternalLanding ? (
        <div className="space-y-3 pt-1 border-t border-white/10">
          <div>
            <div className="text-xs text-gray-400 mb-1">Your marketing site URL (HTTPS)</div>
            <input
              value={String(config.marketingUrl || "")}
              onChange={(e) => setConfig((s) => ({ ...s, marketingUrl: e.target.value }))}
              placeholder="https://monsaas.com"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">App subdomain (auth + product)</div>
            <input
              value={String(config.appSubdomain || "")}
              onChange={(e) =>
                setConfig((s) => ({
                  ...s,
                  appSubdomain: e.target.value,
                  customDomain: e.target.value,
                }))
              }
              placeholder="app.monsaas.com"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              CNAME <span className="font-mono">app</span> → <span className="font-mono">cname.vercel-dns.com</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const marketingUrl = String(config.marketingUrl || "").trim();
                const appSubdomain = String(config.appSubdomain || "")
                  .trim()
                  .replace(/^https?:\/\//, "")
                  .replace(/\/.*$/, "");
                setConfig((s) => ({
                  ...s,
                  landingMode: "external",
                  marketingUrl,
                  appSubdomain,
                  customDomain: appSubdomain,
                }));
                await saveConfig({
                  landingMode: "external",
                  marketingUrl,
                  appSubdomain,
                  customDomain: appSubdomain,
                });
                await loadIntegrationBundle();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save custom site
            </button>
            <button
              type="button"
              disabled={!slug || saving || vercelAttach.status === "working"}
              onClick={async () => {
                const marketingUrl = String(config.marketingUrl || "").trim();
                const appSubdomain = String(config.appSubdomain || "")
                  .trim()
                  .replace(/^https?:\/\//, "")
                  .replace(/\/.*$/, "");
                if (!appSubdomain) return;
                if (!appSubdomain.startsWith("app.")) return;
                setConfig((s) => ({
                  ...s,
                  landingMode: "external",
                  marketingUrl,
                  appSubdomain,
                  customDomain: appSubdomain,
                }));
                await saveConfig({
                  landingMode: "external",
                  marketingUrl,
                  appSubdomain,
                  customDomain: appSubdomain,
                });
                await addDomainOnVercel();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-400/30 bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] text-sm disabled:opacity-60"
              title="Saves app subdomain, registers on Vercel — then add CNAME app → cname.vercel-dns.com at your DNS host."
            >
              {vercelAttach.status === "working" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Connect app subdomain
            </button>
          </div>
          {vercelAttach.status !== "idle" ? (
            <div
              className={`text-xs ${vercelAttach.status === "ok" ? "text-green-300" : vercelAttach.status === "working" ? "text-gray-400" : "text-red-300"}`}
            >
              {vercelAttach.message || ""}
            </div>
          ) : null}
          {!String(config.appSubdomain || "").trim() ? (
            <p className="text-[11px] text-amber-300/90">Enter app.yourdomain.com above, then connect.</p>
          ) : !String(config.appSubdomain || "")
              .trim()
              .replace(/^https?:\/\//, "")
              .replace(/\/.*$/, "")
              .startsWith("app.") ? (
            <p className="text-[11px] text-amber-300/90">Use app.yourdomain.com only (not your marketing apex).</p>
          ) : null}
          {appOriginUrl ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs space-y-1">
              <div className="text-gray-400 mb-1">CTAs for your site</div>
              {[
                ["Signup", `${appOriginUrl}/signup`],
                ["Sign in", `${appOriginUrl}/signin`],
                ["App", `${appOriginUrl}/app`],
              ].map(([label, url]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span>{label}</span>
                  <button type="button" onClick={() => copyText(url)} className="text-purple-300">
                    Copy
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {integrationLoading ? (
            <div className="text-xs text-gray-500">Loading keys…</div>
          ) : String(integrationBundle?.supabaseUrl || "") ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs space-y-2">
              <div className="text-gray-400">Keys (PARTNER_STARTER.md)</div>
              {(
                [
                  ["PARTNER_SLUG", integrationBundle?.partnerSlug],
                  ["APP_ORIGIN", integrationBundle?.appOrigin],
                  ["NEXT_PUBLIC_SUPABASE_URL", integrationBundle?.supabaseUrl],
                  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", integrationBundle?.supabaseAnonKey],
                ] as Array<[string, unknown]>
              ).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-2">
                  <span className="font-mono text-gray-500">{k}</span>
                  <button type="button" onClick={() => copyText(String(v || ""))} className="text-purple-300">
                    Copy
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-[11px] text-amber-200/80">
            Route signup and checkout through {appOriginUrl || "app.yourdomain.com"} to keep billing on our stack.
          </p>
        </div>
      ) : null}
    </div>
  );
}
