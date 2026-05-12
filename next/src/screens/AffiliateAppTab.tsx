"use client";

import React from "react";
import Link from "next/link";
import { Check, Clipboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  clearAffiliateSessionCacheAll,
  readAffiliateSessionCache,
  writeAffiliateSessionCache,
} from "@/lib/affiliateLinkSessionCache";
import { ZERO_AFFILIATE_SUMMARY, type AffiliateSummary } from "@/lib/affiliateSummary";
import { supabase } from "@/integrations/supabase/client";

const FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF = "https://ecomefficiency.firstpromoter.com";

function parseAffiliateSummary(raw: unknown): AffiliateSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    visitors: Math.max(0, Math.trunc(Number(o.visitors ?? 0))),
    conversions: Math.max(0, Math.trunc(Number(o.conversions ?? 0))),
    active_referrals: Math.max(0, Math.trunc(Number(o.active_referrals ?? 0))),
    total_earnings_display: String(o.total_earnings_display || "$0.00"),
  };
}

function AffiliateStatsRecap({
  summary,
  className,
}: {
  summary: AffiliateSummary;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-white/5 bg-black/15 px-2.5 py-2 sm:px-3 sm:py-2.5 max-w-full min-w-0 w-full ${className ?? ""}`}
    >
      <div className="grid w-full grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-2 sm:gap-y-0 [&>*]:min-w-0">
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wide text-gray-500 truncate">Visitors</div>
          <div className="text-xs sm:text-sm font-semibold tabular-nums text-white truncate">
            {summary.visitors.toLocaleString("en-US")}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wide text-gray-500 truncate">Conversions</div>
          <div className="text-xs sm:text-sm font-semibold tabular-nums text-white truncate">
            {summary.conversions.toLocaleString("en-US")}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wide text-gray-500 truncate">Active referrals</div>
          <div className="text-xs sm:text-sm font-semibold tabular-nums text-white truncate">
            {summary.active_referrals.toLocaleString("en-US")}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-wide text-gray-500 truncate">Total earnings</div>
          <div className="text-xs sm:text-sm font-semibold tabular-nums text-white truncate">
            {summary.total_earnings_display}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAffiliateFailureHint(j: Record<string, unknown>, httpStatus: number): string {
  const err = String(j?.error || "");
  if (err === "firstpromoter_not_configured") {
    const hasK = j?.has_api_key === true;
    const hasA = j?.has_account_id === true;
    if (!hasK && !hasA) {
      return "The production server still has empty FirstPromoter variables (they are not injected into this deployment). In Vercel: set FIRSTPROMOTER_API_KEY and FIRSTPROMOTER_ACCOUNT_ID for Production, fix any “Needs Attention” warning on the API key, then redeploy the latest production build.";
    }
    if (!hasA) {
      return "The server has FIRSTPROMOTER_API_KEY but not FIRSTPROMOTER_ACCOUNT_ID. Add FIRSTPROMOTER_ACCOUNT_ID for Production and redeploy.";
    }
    if (!hasK) {
      return "The server has FIRSTPROMOTER_ACCOUNT_ID but not FIRSTPROMOTER_API_KEY. Fix or recreate the API key in Vercel (Production) and redeploy.";
    }
    return "FirstPromoter env check failed unexpectedly. Redeploy, or open FirstPromoter below to copy your link.";
  }
  if (err === "firstpromoter_error") {
    const st = j?.fp_http_status;
    const detail = String(j?.message || "").trim().slice(0, 200);
    const base = `FirstPromoter returned an error${typeof st === "number" ? ` (HTTP ${st})` : ""}.`;
    const keys =
      " Confirm the private API key and Account ID in FirstPromoter → Settings → Integrations match Vercel exactly, then redeploy.";
    const campaign400 =
      st === 400
        ? " If FIRSTPROMOTER_INITIAL_CAMPAIGN_ID is set, use the numeric ID of an active campaign or remove the variable (invalid IDs often return HTTP 400)."
        : "";
    const tail = detail ? ` ${detail}` : "";
    return `${base}${keys}${campaign400}${tail}`;
  }
  if (httpStatus === 401 || err === "unauthorized" || err === "missing_authorization" || err === "missing_token") {
    return "Your session could not be verified for the affiliate service. Refresh the page or sign out and sign in again.";
  }
  if (err === "supabase_not_configured") {
    return "Supabase environment variables are missing on the server.";
  }
  return `Could not load your affiliate link${err ? ` (${err})` : httpStatus ? ` (HTTP ${httpStatus})` : ""}. Open FirstPromoter below to copy your referral link.`;
}

export default function AffiliateAppTab({ preview = false }: { preview?: boolean }) {
  const [affiliateRefLink, setAffiliateRefLink] = React.useState("");
  const [affiliateRefLinks, setAffiliateRefLinks] = React.useState<string[]>([]);
  const [affiliateCoupon, setAffiliateCoupon] = React.useState("");
  const [affiliateFpPasswordUrl, setAffiliateFpPasswordUrl] = React.useState("");
  const [affiliateLinkStatus, setAffiliateLinkStatus] = React.useState<"idle" | "loading" | "ready" | "unavailable">(
    "idle"
  );
  const [affiliateCopiedIndex, setAffiliateCopiedIndex] = React.useState<number | null>(null);
  const [affiliateErrorHint, setAffiliateErrorHint] = React.useState("");
  const [affiliateSummary, setAffiliateSummary] = React.useState<AffiliateSummary | null>(null);

  React.useEffect(() => {
    if (preview) return;
    let cancelled = false;

    const fetchAffiliate = async () => {
      let userIdForCatch = "";
      let hadCacheAtStart = false;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const userId = data.session?.user?.id;
        if (!token || !userId) {
          if (!cancelled) setAffiliateLinkStatus("idle");
          return;
        }
        userIdForCatch = userId;

        const cached = readAffiliateSessionCache(userId);
        hadCacheAtStart = Boolean(cached);
        if (cached && !cancelled) {
          const links =
            cached.ref_links && cached.ref_links.length
              ? cached.ref_links
              : cached.ref_link
                ? [cached.ref_link]
                : [];
          setAffiliateRefLinks(links);
          setAffiliateRefLink(links[0] || "");
          setAffiliateCoupon(cached.coupon);
          setAffiliateFpPasswordUrl(cached.password_setup_url);
          setAffiliateErrorHint("");
          setAffiliateLinkStatus("ready");
          setAffiliateSummary(cached.affiliate_summary ?? null);
        }

        const showLoading = !cached;
        if (showLoading && !cancelled) setAffiliateLinkStatus("loading");

        let r = await fetch("/api/firstpromoter/promoter", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!r.ok && r.status >= 500) {
          await new Promise((res) => setTimeout(res, 600));
          if (cancelled) return;
          r = await fetch("/api/firstpromoter/promoter", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
        }
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && j?.ok) {
          const refLinksRaw = Array.isArray(j?.affiliate?.ref_links) ? (j.affiliate.ref_links as unknown[]) : [];
          const links = refLinksRaw.map((x) => String(x ?? "").trim()).filter(Boolean);
          const link = links[0] || String(j?.affiliate?.ref_link || "").trim();
          const finalLinks = links.length ? links : link ? [link] : [];
          setAffiliateRefLinks(finalLinks);
          setAffiliateRefLink(link);
          setAffiliateCoupon(String(j?.affiliate?.coupon || "").trim());
          setAffiliateFpPasswordUrl(String(j?.promoter?.password_setup_url || "").trim());
          setAffiliateErrorHint("");
          setAffiliateLinkStatus("ready");
          const sum = parseAffiliateSummary(j?.affiliate_summary) ?? ZERO_AFFILIATE_SUMMARY;
          setAffiliateSummary(sum);
          writeAffiliateSessionCache(userId, {
            ref_link: link,
            ref_links: finalLinks,
            coupon: String(j?.affiliate?.coupon || "").trim(),
            password_setup_url: String(j?.promoter?.password_setup_url || "").trim(),
            affiliate_summary: sum,
          });
        } else {
          if (hadCacheAtStart) {
            return;
          }
          setAffiliateRefLink("");
          setAffiliateRefLinks([]);
          setAffiliateCoupon("");
          setAffiliateFpPasswordUrl("");
          setAffiliateSummary(null);
          setAffiliateErrorHint(buildAffiliateFailureHint(j as Record<string, unknown>, r.status));
          setAffiliateLinkStatus("unavailable");
        }
      } catch {
        if (cancelled) return;
        if (hadCacheAtStart || (userIdForCatch && readAffiliateSessionCache(userIdForCatch))) {
          return;
        }
        setAffiliateRefLink("");
        setAffiliateRefLinks([]);
        setAffiliateCoupon("");
        setAffiliateFpPasswordUrl("");
        setAffiliateSummary(null);
        setAffiliateErrorHint(
          "Network error while loading your affiliate link. Check your connection, disable strict blockers for this site, then refresh."
        );
        setAffiliateLinkStatus("unavailable");
      }
    };

    void fetchAffiliate();
    const late = window.setTimeout(() => {
      if (!cancelled) void fetchAffiliate();
    }, 800);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        clearAffiliateSessionCacheAll();
        setAffiliateRefLink("");
        setAffiliateRefLinks([]);
        setAffiliateCoupon("");
        setAffiliateFpPasswordUrl("");
        setAffiliateErrorHint("");
        setAffiliateSummary(null);
        setAffiliateLinkStatus("idle");
        return;
      }
      if (session?.access_token) void fetchAffiliate();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(late);
      try {
        subscription.unsubscribe();
      } catch {}
    };
  }, [preview]);

  const copyAffiliateLinkAt = React.useCallback(async (url: string, index: number) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setAffiliateCopiedIndex(index);
      window.setTimeout(() => setAffiliateCopiedIndex(null), 2000);
    } catch {}
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Affiliate</h1>
        <p className="text-sm text-gray-400 mt-1">Your referral links, promo code, and performance recap.</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-[linear-gradient(180deg,rgba(149,65,224,0.08)_0%,rgba(124,48,199,0.08)_100%)] p-4 md:p-5 flex flex-col gap-4">
        <div className="text-white/90 text-sm md:text-base min-w-0">
          {affiliateLinkStatus === "loading" ? (
            <span className="block text-xs text-gray-400">Preparing your personal affiliate link…</span>
          ) : null}
          {affiliateLinkStatus === "ready" && affiliateRefLinks.length > 0 ? (
            <div className="mt-3 w-fit max-w-full min-w-0 space-y-2">
              <div>
                <div className="font-semibold text-white text-sm">
                  {affiliateRefLinks.length > 1 ? "Your affiliate links" : "Your Affiliate Link"}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {affiliateRefLinks.length > 1 ? (
                    <>
                      Share any of these links to track referrals and earn{" "}
                      <span className="font-semibold text-white">30% recurring commission for life</span>.
                    </>
                  ) : (
                    <>
                      Share this unique link to track referrals and earn{" "}
                      <span className="font-semibold text-white">30% recurring commission for life</span>.
                    </>
                  )}
                </p>
              </div>
              <div className="space-y-2.5">
                {affiliateRefLinks.map((url, i) => (
                  <div key={`${i}:${url}`} className="space-y-1">
                    {i > 0 ? (
                      <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        Additional link {i + 1}
                      </div>
                    ) : null}
                    <div className="flex flex-row flex-nowrap items-stretch gap-2 min-w-0 overflow-x-auto">
                      <div className="flex min-h-[36px] min-w-0 flex-1 max-w-[12rem] sm:max-w-[16rem] md:max-w-[20rem] items-stretch overflow-hidden rounded-lg border border-white/10 bg-black/30">
                        <div
                          className="min-w-0 flex-1 px-2 py-2 text-xs leading-snug text-purple-200/90 font-mono truncate"
                          title={url}
                        >
                          {url}
                        </div>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => void copyAffiliateLinkAt(url, i)}
                                className="flex shrink-0 items-center justify-center border-l border-white/10 px-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                                aria-label={
                                  affiliateCopiedIndex === i
                                    ? "Copied"
                                    : i === 0
                                      ? "Copy affiliate link"
                                      : `Copy link ${i + 1}`
                                }
                              >
                                {affiliateCopiedIndex === i ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                                ) : (
                                  <Clipboard className="h-3.5 w-3.5" aria-hidden />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {affiliateCopiedIndex === i ? "Copied" : "Copy link"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {i === 0 ? (
                        <a
                          href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex shrink-0 self-center"
                        >
                          <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#9541e0] bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] px-3 py-2 text-xs font-medium text-white shadow-[0_2px_16px_0_rgba(149,65,224,0.45)] transition-[box-shadow] hover:shadow-[0_2px_20px_0_rgba(149,65,224,0.55)] group min-h-[36px]">
                            <span className="relative block h-4 min-w-[7.75rem] overflow-hidden text-center leading-4">
                              <span className="block whitespace-nowrap transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-4">
                                Affiliate dashboard
                              </span>
                              <span className="absolute left-1/2 top-4 w-max -translate-x-1/2 whitespace-nowrap transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:top-0">
                                Affiliate dashboard
                              </span>
                            </span>
                          </span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {affiliateCoupon ? (
                <div className="text-xs text-gray-400">
                  Promo code: <span className="text-white font-medium">{affiliateCoupon}</span>
                </div>
              ) : null}
              {affiliateFpPasswordUrl ? (
                <a
                  href={affiliateFpPasswordUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block text-xs text-purple-300 hover:text-purple-200 underline"
                >
                  Set your FirstPromoter password
                </a>
              ) : null}
              <AffiliateStatsRecap summary={affiliateSummary ?? ZERO_AFFILIATE_SUMMARY} />
            </div>
          ) : null}
          {affiliateLinkStatus === "ready" && !affiliateRefLink ? (
            <div className="mt-3 w-fit max-w-full min-w-0 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-xs text-gray-300 max-w-xl min-w-0 flex-1">
                  Your affiliate account is ready on FirstPromoter (including on the Free plan). Open your dashboard to
                  copy your referral link if it does not appear here yet.
                </p>
                <a
                  href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex shrink-0 self-start sm:self-center"
                >
                  <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#9541e0] bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] px-3.5 py-2 text-xs font-medium text-white shadow-[0_2px_16px_0_rgba(149,65,224,0.45)] transition-[box-shadow] hover:shadow-[0_2px_20px_0_rgba(149,65,224,0.55)] group min-h-[36px]">
                    <span className="relative block h-4 min-w-[9rem] overflow-hidden text-center leading-4">
                      <span className="block whitespace-nowrap transition-transform duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-4">
                        Open affiliate dashboard
                      </span>
                      <span className="absolute left-1/2 top-4 w-max -translate-x-1/2 whitespace-nowrap transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:top-0">
                        Open affiliate dashboard
                      </span>
                    </span>
                  </span>
                </a>
              </div>
              <AffiliateStatsRecap summary={affiliateSummary ?? ZERO_AFFILIATE_SUMMARY} />
            </div>
          ) : null}
          {affiliateLinkStatus === "unavailable" && affiliateErrorHint ? (
            <p className="mt-2 text-xs text-amber-200/90 max-w-xl whitespace-pre-wrap">{affiliateErrorHint}</p>
          ) : affiliateLinkStatus === "unavailable" ? (
            <p className="mt-2 text-xs text-amber-200/90 max-w-xl">
              We could not load your link automatically. Open FirstPromoter below to copy your referral link.
            </p>
          ) : null}
        </div>
        {affiliateLinkStatus === "unavailable" ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <a
              href={FIRSTPROMOTER_AFFILIATE_DASHBOARD_HREF}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_32px_0_rgba(149,65,224,0.70)] px-6 py-3 rounded-xl border border-[#9541e0] text-white font-medium h-[48px] whitespace-nowrap"
            >
              Open affiliate dashboard
            </a>
            <Link
              href="/affiliate"
              prefetch={false}
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-white/15 text-sm text-gray-200 hover:bg-white/5 h-[48px] whitespace-nowrap"
            >
              Program details
            </Link>
          </div>
        ) : affiliateLinkStatus === "idle" ? (
          <div className="min-h-[36px]" aria-hidden />
        ) : null}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 bg-purple-600/20 blur-3xl" aria-hidden />
      </div>
    </div>
  );
}
