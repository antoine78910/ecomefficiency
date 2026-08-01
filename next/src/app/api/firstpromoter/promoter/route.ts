import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fpEnsurePromoter,
  fpExtractBestRefLink,
  fpExtractAllRefLinks,
  fpGetPromoterDetails,
  fpAffiliateSummaryFromPromoter,
  fpUpdatePromoterCampaignRefToken,
  normalizeAffiliateRefToken,
} from "@/lib/firstpromoter";
import { fpTrackSignup } from "@/lib/firstpromoterTracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getInitialCampaignId(): number | undefined {
  const raw = process.env.FIRSTPROMOTER_INITIAL_CAMPAIGN_ID;
  if (!raw) return undefined;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return undefined;
  return n;
}

function getDripEmails(): boolean | undefined {
  const raw = String(process.env.FIRSTPROMOTER_DRIP_EMAILS || "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return undefined;
}

async function authenticateUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: NextResponse.json({ ok: false, error: "missing_authorization" }, { status: 401 }) };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return { error: NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const email = String(data.user.email || "").trim();
  if (!email) {
    return { error: NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 }) };
  }

  const fpKey = String(process.env.FIRSTPROMOTER_API_KEY || "").trim();
  const fpAccount = String(process.env.FIRSTPROMOTER_ACCOUNT_ID || "").trim();
  if (!fpKey || !fpAccount) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "firstpromoter_not_configured",
          has_api_key: Boolean(fpKey),
          has_account_id: Boolean(fpAccount),
        },
        { status: 503 }
      ),
    };
  }

  return { user: data.user, email };
}

function fpErrorResponse(e: any) {
  const code = String(e?.code || e?.message || "");
  if (code.includes("FIRSTPROMOTER_NOT_CONFIGURED")) {
    return NextResponse.json(
      {
        ok: false,
        error: "firstpromoter_not_configured",
        has_api_key: Boolean(String(process.env.FIRSTPROMOTER_API_KEY || "").trim()),
        has_account_id: Boolean(String(process.env.FIRSTPROMOTER_ACCOUNT_ID || "").trim()),
      },
      { status: 503 }
    );
  }
  if (code.includes("FIRSTPROMOTER_INVALID_REF_TOKEN")) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_ref_token",
        message: "Use 2–63 characters: lowercase letters, numbers, hyphens, or underscores.",
      },
      { status: 400 }
    );
  }
  const fpStatus = typeof e?.status === "number" ? e.status : undefined;
  const msg = String(e?.message || "Unknown error").slice(0, 200);
  console.error("[firstpromoter/promoter] FirstPromoter API error", { fpStatus, msg });
  return NextResponse.json(
    {
      ok: false,
      error: "firstpromoter_error",
      fp_http_status: fpStatus,
      message: msg,
    },
    { status: fpStatus && fpStatus >= 400 && fpStatus < 600 ? fpStatus : 500 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateUser(req);
    if ("error" in auth && auth.error) return auth.error;
    const { user, email } = auth as { user: any; email: string };

    const meta = (user.user_metadata as any) || {};
    const firstName = String(meta.first_name || "").trim();
    const lastName = String(meta.last_name || "").trim();

    const promoter = await fpEnsurePromoter({
      email,
      cust_id: user.id,
      profile: firstName || lastName ? { first_name: firstName || undefined, last_name: lastName || undefined } : undefined,
      initial_campaign_id: getInitialCampaignId(),
      drip_emails: getDripEmails(),
    });

    const refId = String(req.headers.get("x-fpr-ref") || "").trim();
    const tid = String(req.headers.get("x-fpr-tid") || "").trim();
    const cookieHeader = req.headers.get("cookie") || "";
    const readCookie = (name: string) => {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
      return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    };
    void fpTrackSignup({
      email,
      uid: user.id,
      refId: refId || readCookie("_fprom_ref") || undefined,
      tid: tid || readCookie("_fprom_tid") || readCookie("_fprom_track") || undefined,
    }).then((r) => {
      if (!r.ok && r.status !== 404) {
        console.warn("[firstpromoter/promoter] signup track", {
          status: r.status,
          body: r.bodyText?.slice(0, 120),
        });
      }
    });

    let enriched = promoter;
    if (typeof promoter?.id === "number" && Number.isFinite(promoter.id) && promoter.id > 0) {
      try {
        const details = await fpGetPromoterDetails(promoter.id);
        enriched = { ...promoter, ...details };
      } catch (err) {
        console.warn("[firstpromoter/promoter] get promoter details skipped", err);
      }
    }

    const ref = fpExtractBestRefLink(enriched);
    const ref_links = fpExtractAllRefLinks(enriched);
    const affiliate_summary = fpAffiliateSummaryFromPromoter(enriched);

    return NextResponse.json(
      {
        ok: true,
        promoter: {
          id: enriched?.id,
          email: enriched?.email,
          cust_id: enriched?.cust_id,
          state: enriched?.state,
          password_setup_url: enriched?.password_setup_url,
        },
        affiliate: { ...ref, ref_links },
        affiliate_summary,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return fpErrorResponse(e);
  }
}

/** Customize the primary affiliate link slug (FirstPromoter ref_token). */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateUser(req);
    if ("error" in auth && auth.error) return auth.error;
    const { user, email } = auth as { user: any; email: string };

    const body = await req.json().catch(() => ({}));
    const refToken = normalizeAffiliateRefToken(body?.ref_token ?? body?.slug ?? "");
    if (!refToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_ref_token",
          message: "Use 2–63 characters: lowercase letters, numbers, hyphens, or underscores.",
        },
        { status: 400 }
      );
    }

    const meta = (user.user_metadata as any) || {};
    const firstName = String(meta.first_name || "").trim();
    const lastName = String(meta.last_name || "").trim();

    const promoter = await fpEnsurePromoter({
      email,
      cust_id: user.id,
      profile: firstName || lastName ? { first_name: firstName || undefined, last_name: lastName || undefined } : undefined,
      initial_campaign_id: getInitialCampaignId(),
      drip_emails: getDripEmails(),
    });

    let enriched = promoter;
    if (typeof promoter?.id === "number" && Number.isFinite(promoter.id) && promoter.id > 0) {
      try {
        const details = await fpGetPromoterDetails(promoter.id);
        enriched = { ...promoter, ...details };
      } catch (err) {
        console.warn("[firstpromoter/promoter] get promoter details skipped", err);
      }
    }

    const current = fpExtractBestRefLink(enriched);
    const requestedPcId = Math.trunc(Number(body?.promoter_campaign_id ?? 0));
    const promoterCampaignId =
      requestedPcId > 0 ? requestedPcId : Math.trunc(Number(current.promoter_campaign_id ?? 0));

    if (!promoterCampaignId) {
      return NextResponse.json(
        { ok: false, error: "missing_promoter_campaign", message: "Could not find a campaign link to customize." },
        { status: 400 }
      );
    }

    const campaigns = Array.isArray((enriched as any)?.promoter_campaigns)
      ? ((enriched as any).promoter_campaigns as any[])
      : [];
    const owned = campaigns.some((c) => Math.trunc(Number(c?.id || 0)) === promoterCampaignId);
    if (campaigns.length && !owned) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden_promoter_campaign",
          message: "That affiliate link does not belong to your account.",
        },
        { status: 403 }
      );
    }

    await fpUpdatePromoterCampaignRefToken(promoterCampaignId, refToken);

    let refreshed = enriched;
    if (typeof enriched?.id === "number" && Number.isFinite(enriched.id) && enriched.id > 0) {
      try {
        refreshed = await fpGetPromoterDetails(enriched.id);
      } catch {
        refreshed = enriched;
      }
    }

    const ref = fpExtractBestRefLink(refreshed);
    const ref_links = fpExtractAllRefLinks(refreshed);
    const affiliate_summary = fpAffiliateSummaryFromPromoter(refreshed);

    return NextResponse.json(
      {
        ok: true,
        promoter: {
          id: refreshed?.id,
          email: refreshed?.email,
          cust_id: refreshed?.cust_id,
          state: refreshed?.state,
          password_setup_url: refreshed?.password_setup_url,
        },
        affiliate: { ...ref, ref_links },
        affiliate_summary,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return fpErrorResponse(e);
  }
}
