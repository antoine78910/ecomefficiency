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

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-07-30.basil" as any });
}

type PromoDuration = "once" | "forever";
type StoredPromo = {
  id: string;
  createdAt: string;
  code: string;
  type: "percent_once" | "percent_forever";
  percentOff: number;
  maxUses?: number;
  active: boolean;
  couponId: string;
  promotionCodeId: string;
};

async function loadConnectedAccountId(slug: string): Promise<string> {
  if (!supabaseAdmin) return "";
  const key = `partner_config:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  const cfg = parseMaybeJson((data as any)?.value) as any;
  return String(cfg?.connectedAccountId || "");
}

async function readList(slug: string): Promise<StoredPromo[]> {
  if (!supabaseAdmin) return [];
  const key = `partner_promo_codes:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  const raw = parseMaybeJson((data as any)?.value);
  return Array.isArray(raw) ? (raw as StoredPromo[]) : [];
}

async function writeList(slug: string, list: StoredPromo[]) {
  if (!supabaseAdmin) return { ok: false as const, error: "supabase_admin_missing" };
  const key = `partner_promo_codes:${slug}`;
  const next = (list || []).slice(0, 200);

  const shouldStringifyValue = (msg: string) =>
    /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
    /invalid input syntax/i.test(msg) ||
    /could not parse/i.test(msg) ||
    (/json/i.test(msg) && /type/i.test(msg));

  const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
    const row: any = withUpdatedAt
      ? { key, value: stringifyValue ? JSON.stringify(next) : next, updated_at: new Date().toISOString() }
      : { key, value: stringifyValue ? JSON.stringify(next) : next };
    const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
    return error;
  };

  let err: any = await tryUpsert(true, false);
  if (err) {
    const msg = String(err?.message || "");
    const missingUpdatedAt = /updated_at/i.test(msg) && /(does not exist|unknown column|column)/i.test(msg);
    if (missingUpdatedAt) err = await tryUpsert(false, false);
    if (err && shouldStringifyValue(String(err?.message || ""))) {
      err = await tryUpsert(!missingUpdatedAt, true);
      if (err && missingUpdatedAt) err = await tryUpsert(false, true);
    }
  }

  if (err) return { ok: false as const, error: "db_error", detail: err?.message || "db error" };
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const list = await readList(slug);
    return NextResponse.json({ ok: true, promos: list }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const code = String(body?.code || "").trim().toUpperCase();
    const type = String(body?.type || "percent_once") as StoredPromo["type"];
    const percentOff = Number(body?.percentOff || 0);
    const maxUsesRaw = body?.maxUses === "" || body?.maxUses === null || body?.maxUses === undefined ? undefined : Number(body.maxUses);
    const maxUses = Number.isFinite(maxUsesRaw as any) && (maxUsesRaw as number) > 0 ? Math.floor(maxUsesRaw as number) : undefined;

    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!code || code.length < 3) return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
    if (!/^[A-Z0-9_-]+$/.test(code)) return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return NextResponse.json({ ok: false, error: "invalid_percent_off" }, { status: 400 });
    }
    if (type !== "percent_once" && type !== "percent_forever") {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }

    const connectedAccountId = await loadConnectedAccountId(slug);
    if (!connectedAccountId) return NextResponse.json({ ok: false, error: "not_connected", detail: "Stripe Connect not connected." }, { status: 400 });

    const stripe = getStripe();
    const duration: PromoDuration = type === "percent_forever" ? "forever" : "once";

    // Create coupon + promotion code under connected account
    const coupon = await stripe.coupons.create(
      {
        percent_off: percentOff,
        duration,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        metadata: { partner_slug: slug },
      } as any,
      { stripeAccount: connectedAccountId }
    );

    const promo = await stripe.promotionCodes.create(
      {
        coupon: coupon.id,
        code,
        active: true,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        metadata: { partner_slug: slug },
      } as any,
      { stripeAccount: connectedAccountId }
    );

    const item: StoredPromo = {
      id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      code,
      type,
      percentOff,
      maxUses,
      active: true,
      couponId: coupon.id,
      promotionCodeId: promo.id,
    };

    const current = await readList(slug);
    const next = [item, ...current].slice(0, 200);
    const w = await writeList(slug, next);
    if (!w.ok) return NextResponse.json(w, { status: 500 });

    return NextResponse.json({ ok: true, item, promos: next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "create_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const promotionCodeId = String(body?.promotionCodeId || "").trim();
    const active = Boolean(body?.active);
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!promotionCodeId) return NextResponse.json({ ok: false, error: "missing_promotion_code_id" }, { status: 400 });

    const connectedAccountId = await loadConnectedAccountId(slug);
    if (!connectedAccountId) return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });

    const stripe = getStripe();
    await stripe.promotionCodes.update(
      promotionCodeId,
      { active } as any,
      { stripeAccount: connectedAccountId }
    );

    const current = await readList(slug);
    const next = current.map((p) => (p.promotionCodeId === promotionCodeId ? { ...p, active } : p));
    const w = await writeList(slug, next);
    if (!w.ok) return NextResponse.json(w, { status: 500 });

    return NextResponse.json({ ok: true, promos: next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "update_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

