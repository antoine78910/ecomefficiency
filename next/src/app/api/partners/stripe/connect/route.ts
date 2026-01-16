import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

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
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
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
        const current = parseMaybeJson((data as any)?.value) || {};
        existingAccountId = String((current as any)?.connectedAccountId || "");
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
    const refresh_url = `${origin}/dashboard?slug=${encodeURIComponent(slug)}&stripe=refresh&acct=${encodeURIComponent(connected.id)}`;
    const return_url = `${origin}/dashboard?slug=${encodeURIComponent(slug)}&stripe=return&acct=${encodeURIComponent(connected.id)}`;

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
        const current = parseMaybeJson((data as any)?.value) || {};
        const merged = { ...(current || {}), slug, connectedAccountId: connected.id };

        const shouldStringifyValue = (msg: string) =>
          /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
          /invalid input syntax/i.test(msg) ||
          /could not parse/i.test(msg) ||
          (/json/i.test(msg) && /type/i.test(msg));

        const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
          const row: any = withUpdatedAt
            ? { key, value: stringifyValue ? JSON.stringify(merged) : merged, updated_at: new Date().toISOString() }
            : { key, value: stringifyValue ? JSON.stringify(merged) : merged };
          const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
          return error;
        };

        let err: any = await tryUpsert(true, false);
        if (err) {
          const msg = String(err?.message || "");
          const missingUpdatedAt =
            /updated_at/i.test(msg) &&
            /(does not exist|unknown column|column)/i.test(msg);
          if (missingUpdatedAt) err = await tryUpsert(false, false);
          if (err && shouldStringifyValue(String(err?.message || ""))) {
            err = await tryUpsert(!missingUpdatedAt, true);
            if (err && missingUpdatedAt) err = await tryUpsert(false, true);
          }
        }

        if (err) {
          persistError = err?.message || "db_error";
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


