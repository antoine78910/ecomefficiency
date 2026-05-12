import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fpEnsurePromoter, fpExtractBestRefLink } from "@/lib/firstpromoter";

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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "missing_authorization" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const user = data.user;
    const email = String(user.email || "").trim();
    if (!email) {
      return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    }

    const fpKey = String(process.env.FIRSTPROMOTER_API_KEY || "").trim();
    const fpAccount = String(process.env.FIRSTPROMOTER_ACCOUNT_ID || "").trim();
    if (!fpKey || !fpAccount) {
      console.error("[firstpromoter/promoter] Missing env at runtime", {
        has_api_key: Boolean(fpKey),
        has_account_id: Boolean(fpAccount),
        vercel_env: process.env.VERCEL_ENV,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "firstpromoter_not_configured",
          has_api_key: Boolean(fpKey),
          has_account_id: Boolean(fpAccount),
        },
        { status: 503 }
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

    const ref = fpExtractBestRefLink(promoter);

    return NextResponse.json(
      {
        ok: true,
        promoter: {
          id: promoter?.id,
          email: promoter?.email,
          cust_id: promoter?.cust_id,
          state: promoter?.state,
          password_setup_url: promoter?.password_setup_url,
        },
        affiliate: ref,
      },
      { status: 200 }
    );
  } catch (e: any) {
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
      { status: 500 }
    );
  }
}
