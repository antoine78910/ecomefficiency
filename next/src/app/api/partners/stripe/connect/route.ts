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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const stripe = getStripe();

    // Reuse existing connected account if already created for this slug
    let existingAccountId = "";
    try {
      if (supabaseAdmin) {
        const key = `partner_config:${slug}`;
        const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
        const current = (data as any)?.value;
        existingAccountId = String(current?.connectedAccountId || "");
      }
    } catch {}

    const connected =
      existingAccountId
        ? { id: existingAccountId }
        : await stripe.accounts.create({
            type: "express",
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            business_type: "individual",
            metadata: { partner_slug: slug },
          });

    const origin = req.headers.get("origin") || "https://partners.ecomefficiency.com";
    const refresh_url = `${origin}/dashboard?slug=${encodeURIComponent(slug)}&stripe=refresh`;
    const return_url = `${origin}/dashboard?slug=${encodeURIComponent(slug)}&stripe=return`;

    const link = await stripe.accountLinks.create({
      account: connected.id,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    // Best effort: persist connected account id into partner config
    let persisted = false;
    let persistError: string | undefined = undefined;
    if (!supabaseAdmin) {
      persistError = "supabase_admin_missing";
    } else {
      try {
        const key = `partner_config:${slug}`;
        const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
        const current = (data as any)?.value;
        const merged = { ...(current || {}), slug, connectedAccountId: connected.id };
        const { error } = await supabaseAdmin.from("app_state").upsert({ key, value: merged }, { onConflict: "key" as any });
        if (error) {
          persistError = error.message || "db_error";
        } else {
          persisted = true;
        }
      } catch (e: any) {
        persistError = e?.message || String(e);
      }
    }

    return NextResponse.json(
      { ok: true, url: link.url, connectedAccountId: connected.id, persisted, warning: persisted ? undefined : "persist_failed", persistError },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "stripe_connect_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}


