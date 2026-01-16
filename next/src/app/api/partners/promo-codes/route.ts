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
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
}

type PromoDuration = "once" | "forever";
export type StoredPromo = {
  id: string;
  createdAt: string;
  code: string;
  type: "percent_once" | "percent_forever";
  percentOff: number;
  maxUses?: number;
  timesRedeemed?: number;
  active: boolean;
  // Exclusions (dashboard-only + used when auto-applying via our API)
  excludeMonthly?: boolean;
  excludeAnnual?: boolean;
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

async function loadPartnerConfig(slug: string): Promise<any> {
  if (!supabaseAdmin) return {};
  const key = `partner_config:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  return (parseMaybeJson((data as any)?.value) as any) || {};
}

async function upsertPartnerConfig(slug: string, patch: Record<string, any>) {
  if (!supabaseAdmin) return { ok: false as const, error: "supabase_admin_missing" };
  const key = `partner_config:${slug}`;
  const current = await loadPartnerConfig(slug);
  const next = { ...(current || {}), ...(patch || {}) };

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
  return { ok: true as const, config: next };
}

async function ensurePartnerStripeProducts(stripe: Stripe, slug: string, connectedAccountId: string) {
  const cfg = await loadPartnerConfig(slug);
  let monthProductId = String(cfg?.stripeProductIdMonth || "");
  let yearProductId = String(cfg?.stripeProductIdYear || "");

  const createProduct = async (interval: "month" | "year") => {
    const nameBase = String(cfg?.saasName || slug);
    const p = await stripe.products.create(
      {
        name: `${nameBase} Subscription (${interval})`,
        metadata: { partner_slug: slug, billing_interval: interval },
      } as any,
      { stripeAccount: connectedAccountId }
    );
    return p.id;
  };

  const patch: any = {};
  if (!monthProductId) { monthProductId = await createProduct("month"); patch.stripeProductIdMonth = monthProductId; }
  if (!yearProductId) { yearProductId = await createProduct("year"); patch.stripeProductIdYear = yearProductId; }
  if (Object.keys(patch).length) await upsertPartnerConfig(slug, patch).catch(() => {});
  return { monthProductId, yearProductId };
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

    // Best-effort refresh from Stripe (usage + active + max_redemptions)
    try {
      const connectedAccountId = await loadConnectedAccountId(slug);
      if (connectedAccountId && list.length) {
        const stripe = getStripe();
        const refreshed: StoredPromo[] = [];
        for (const p of list.slice(0, 80)) {
          try {
            const pc = await stripe.promotionCodes.retrieve(p.promotionCodeId, {} as any, { stripeAccount: connectedAccountId });
            const max = (pc as any)?.max_redemptions;
            const times = (pc as any)?.times_redeemed;
            refreshed.push({
              ...p,
              active: typeof (pc as any)?.active === "boolean" ? Boolean((pc as any).active) : p.active,
              maxUses: Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : p.maxUses,
              timesRedeemed: Number.isFinite(Number(times)) && Number(times) >= 0 ? Number(times) : p.timesRedeemed,
            });
          } catch {
            refreshed.push(p);
          }
        }
        if (list.length > 80) refreshed.push(...list.slice(80));
        writeList(slug, refreshed).catch(() => {});
        return NextResponse.json({ ok: true, promos: refreshed }, { status: 200 });
      }
    } catch {}

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
    const excludeMonthly = Boolean(body?.excludeMonthly);
    const excludeAnnual = Boolean(body?.excludeAnnual);

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
    const { monthProductId, yearProductId } = await ensurePartnerStripeProducts(stripe, slug, connectedAccountId);
    const duration: PromoDuration = type === "percent_forever" ? "forever" : "once";

    const meta = {
      partner_slug: slug,
      exclude_monthly: excludeMonthly ? "1" : "0",
      exclude_annual: excludeAnnual ? "1" : "0",
    };

    // Coupon product restrictions so Stripe Checkout can enforce "exclude monthly/annual"
    const products: string[] = [];
    if (!excludeMonthly) products.push(monthProductId);
    if (!excludeAnnual) products.push(yearProductId);
    if (!products.length) {
      return NextResponse.json({ ok: false, error: "invalid_exclusions", detail: "Promo cannot exclude both monthly and annual." }, { status: 400 });
    }

    // Create coupon + promotion code under connected account
    const coupon = await stripe.coupons.create(
      {
        percent_off: percentOff,
        duration,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        applies_to: { products },
        metadata: meta,
      } as any,
      { stripeAccount: connectedAccountId }
    );

    const promo = await stripe.promotionCodes.create(
      {
        coupon: coupon.id,
        code,
        active: true,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        metadata: meta,
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
      excludeMonthly,
      excludeAnnual,
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
    const maxUsesRaw = body?.maxUses === "" || body?.maxUses === null || body?.maxUses === undefined ? undefined : Number(body.maxUses);
    const maxUses = Number.isFinite(maxUsesRaw as any) && (maxUsesRaw as number) > 0 ? Math.floor(maxUsesRaw as number) : undefined;
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!promotionCodeId) return NextResponse.json({ ok: false, error: "missing_promotion_code_id" }, { status: 400 });

    const connectedAccountId = await loadConnectedAccountId(slug);
    if (!connectedAccountId) return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });

    const stripe = getStripe();
    const updatePayload: any = { active };
    if (maxUses) updatePayload.max_redemptions = maxUses;
    await stripe.promotionCodes.update(promotionCodeId, updatePayload, { stripeAccount: connectedAccountId });

    const current = await readList(slug);
    const next = current.map((p) =>
      p.promotionCodeId === promotionCodeId
        ? {
            ...p,
            active,
            ...(maxUses ? { maxUses } : {}),
          }
        : p
    );
    const w = await writeList(slug, next);
    if (!w.ok) return NextResponse.json(w, { status: 500 });

    return NextResponse.json({ ok: true, promos: next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "update_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

// Replace/edit a promo code by creating a new Stripe coupon + promotion code, then disabling the old one.
// Stripe does NOT allow editing percent_off/duration/code on existing promotion codes, so this is the safest UX.
export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const promotionCodeId = String(body?.promotionCodeId || "").trim();
    const code = String(body?.code || "").trim().toUpperCase();
    const type = String(body?.type || "percent_once") as StoredPromo["type"];
    const percentOff = Number(body?.percentOff || 0);
    const maxUsesRaw = body?.maxUses === "" || body?.maxUses === null || body?.maxUses === undefined ? undefined : Number(body.maxUses);
    const maxUses = Number.isFinite(maxUsesRaw as any) && (maxUsesRaw as number) > 0 ? Math.floor(maxUsesRaw as number) : undefined;
    const excludeMonthly = Boolean(body?.excludeMonthly);
    const excludeAnnual = Boolean(body?.excludeAnnual);

    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!promotionCodeId) return NextResponse.json({ ok: false, error: "missing_promotion_code_id" }, { status: 400 });
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
    const { monthProductId, yearProductId } = await ensurePartnerStripeProducts(stripe, slug, connectedAccountId);
    const duration: PromoDuration = type === "percent_forever" ? "forever" : "once";

    // Disable old promotion code (best-effort)
    try {
      await stripe.promotionCodes.update(promotionCodeId, { active: false } as any, { stripeAccount: connectedAccountId });
    } catch {}

    const meta = {
      partner_slug: slug,
      replaced_promotion_code_id: promotionCodeId,
      exclude_monthly: excludeMonthly ? "1" : "0",
      exclude_annual: excludeAnnual ? "1" : "0",
    };

    // Coupon product restrictions so Stripe Checkout can enforce "exclude monthly/annual"
    const products: string[] = [];
    if (!excludeMonthly) products.push(monthProductId);
    if (!excludeAnnual) products.push(yearProductId);
    if (!products.length) {
      return NextResponse.json({ ok: false, error: "invalid_exclusions", detail: "Promo cannot exclude both monthly and annual." }, { status: 400 });
    }

    // Create new coupon + promotion code
    const coupon = await stripe.coupons.create(
      {
        percent_off: percentOff,
        duration,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        applies_to: { products },
        metadata: meta,
      } as any,
      { stripeAccount: connectedAccountId }
    );

    const promo = await stripe.promotionCodes.create(
      {
        coupon: coupon.id,
        code,
        active: true,
        ...(maxUses ? { max_redemptions: maxUses } : {}),
        metadata: meta,
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
      excludeMonthly,
      excludeAnnual,
      couponId: coupon.id,
      promotionCodeId: promo.id,
    };

    const current = await readList(slug);
    const filtered = current.filter((p) => p.promotionCodeId !== promotionCodeId);
    const next = [item, ...filtered].slice(0, 200);
    const w = await writeList(slug, next);
    if (!w.ok) return NextResponse.json(w, { status: 500 });

    return NextResponse.json({ ok: true, item, promos: next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "edit_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body?.slug || "");
    const promotionCodeId = String(body?.promotionCodeId || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!promotionCodeId) return NextResponse.json({ ok: false, error: "missing_promotion_code_id" }, { status: 400 });

    const connectedAccountId = await loadConnectedAccountId(slug);
    if (!connectedAccountId) return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });

    // Disable in Stripe (best-effort)
    try {
      const stripe = getStripe();
      await stripe.promotionCodes.update(promotionCodeId, { active: false } as any, { stripeAccount: connectedAccountId });
    } catch {}

    const current = await readList(slug);
    const next = current.filter((p) => p.promotionCodeId !== promotionCodeId);
    const w = await writeList(slug, next);
    if (!w.ok) return NextResponse.json(w, { status: 500 });

    return NextResponse.json({ ok: true, promos: next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "delete_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}


