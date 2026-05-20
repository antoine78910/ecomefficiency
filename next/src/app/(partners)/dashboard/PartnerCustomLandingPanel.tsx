"use client";

import React from "react";
import { CheckCircle2, Copy, Link2, Loader2, Save } from "lucide-react";

type DnsRecord = { type: string; domain: string; value: string };

type Props = {
  config: Record<string, unknown>;
  setConfig: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  isExternalLanding: boolean;
  appOriginUrl: string;
  saving: boolean;
  slug: string;
  vercelAttach: {
    status: string;
    message?: string;
    verified?: boolean;
    record?: DnsRecord[];
  };
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

  const appSubdomainRaw = String(config.appSubdomain || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const appSubdomainValid = appSubdomainRaw.startsWith("app.");

  // Derive the CNAME hint: prefer the value returned by Vercel (unique per domain), fall back to generic.
  const cnameTarget =
    vercelAttach.record?.find((r) => r.type === "CNAME")?.value ||
    "cname.vercel-dns.com";

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
          {/* ── Step 1 : enter URLs ── */}
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Step 1 — Your site info</div>
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
            {appSubdomainRaw && !appSubdomainValid ? (
              <p className="mt-1 text-[11px] text-amber-300/90">Must start with "app." — e.g. app.monsaas.com</p>
            ) : (
              <p className="mt-1 text-[11px] text-gray-500">
                Must be <span className="font-mono">app.yourdomain.com</span> (not the marketing apex)
              </p>
            )}
          </div>

          {/* ── Step 2 : Connect button ── */}
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Step 2 — Register on Vercel</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const marketingUrl = String(config.marketingUrl || "").trim();
                const appSubdomain = appSubdomainRaw;
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
              disabled={!slug || saving || !appSubdomainValid || vercelAttach.status === "working"}
              onClick={async () => {
                const marketingUrl = String(config.marketingUrl || "").trim();
                const appSubdomain = appSubdomainRaw;
                if (!appSubdomain || !appSubdomainValid) return;
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
              title="Saves your app subdomain and registers it on Vercel. Then copy the CNAME shown and set it at your DNS host."
            >
              {vercelAttach.status === "working" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : vercelAttach.verified ? (
                <CheckCircle2 className="w-4 h-4 text-green-300" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Connect app subdomain
            </button>
          </div>

          {/* ── Vercel status + DNS records box ── */}
          {vercelAttach.status === "fail" ? (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-1">
              <div className="font-semibold">Connection failed</div>
              <div>{vercelAttach.message}</div>
            </div>
          ) : vercelAttach.status === "ok" ? (
            vercelAttach.verified ? (
              <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-3 text-xs text-green-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Domain connected and verified ✅
              </div>
            ) : (
              /* Not yet verified → show the exact DNS record to set */
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs space-y-2">
                <div className="text-amber-200 font-semibold">Step 3 — Add this DNS record at your registrar</div>
                <p className="text-amber-100/80">
                  Vercel registered <span className="font-mono">{appSubdomainRaw}</span>. Now go to your DNS provider (Namecheap, OVH, Cloudflare…) and create:
                </p>
                {/* Show all records returned by Vercel — usually one CNAME */}
                {(vercelAttach.record && vercelAttach.record.length > 0
                  ? vercelAttach.record
                  : [{ type: "CNAME", domain: `app.${appSubdomainRaw.replace(/^app\./, "")}`, value: "cname.vercel-dns.com" }]
                ).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-black/30 p-2 grid grid-cols-[56px_1fr_auto] items-center gap-x-3 gap-y-1 font-mono text-[11px]"
                  >
                    <span className="text-purple-300 font-semibold">{r.type}</span>
                    <div className="min-w-0">
                      <div className="text-gray-400 text-[10px] mb-0.5">Name / Host</div>
                      <div className="text-white truncate">{r.domain.replace(new RegExp(`\\.?${appSubdomainRaw.replace(/^app\./, "").replace(/\./g, "\\.")}$`), "") || "app"}</div>
                    </div>
                    <div />
                    <span />
                    <div className="min-w-0 col-span-1">
                      <div className="text-gray-400 text-[10px] mb-0.5">Value / Points to</div>
                      <div className="text-white break-all">{r.value}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(r.value)}
                      className="self-end inline-flex items-center gap-1 text-purple-300 hover:text-purple-200"
                      title="Copy value"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                ))}
                <p className="text-amber-100/60 text-[10px]">
                  DNS propagation takes 10–30 min (up to 48 h). If you use Cloudflare, set the record to <b>DNS only</b> (not proxied).
                </p>
              </div>
            )
          ) : null}

          {/* ── CTAs for the marketing site ── */}
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

          {/* ── Integration keys ── */}
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
