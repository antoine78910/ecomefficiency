import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-07-30.basil" as any });
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    }

    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const key = `partner_config:${slug}`;
    const { data, error } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });

    const cfg = (data as any)?.value || {};
    const connectedAccountId = String(cfg?.connectedAccountId || "");
    if (!connectedAccountId) {
      return NextResponse.json({ ok: true, connected: false }, { status: 200 });
    }

    const stripe = getStripe();
    const acct = await stripe.accounts.retrieve(connectedAccountId);

    let bankLast4: string | null = null;
    try {
      const banks = await stripe.accounts.listExternalAccounts(connectedAccountId, { object: "bank_account", limit: 1 } as any);
      const first = (banks as any)?.data?.[0];
      if (first?.last4) bankLast4 = String(first.last4);
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        connected: true,
        connectedAccountId,
        chargesEnabled: Boolean((acct as any)?.charges_enabled),
        payoutsEnabled: Boolean((acct as any)?.payouts_enabled),
        detailsSubmitted: Boolean((acct as any)?.details_submitted),
        bankLast4,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "stripe_status_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

