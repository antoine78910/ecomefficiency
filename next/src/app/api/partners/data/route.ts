import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "anto.delbos@gmail.com";

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

async function readConfig(slug: string) {
  const key = `partner_config:${slug}`;
  const { data, error } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  if (error) return { ok: false as const, error, config: null as any };
  const config = parseMaybeJson((data as any)?.value) || {};
  return { ok: true as const, config };
}

async function canRead(slug: string, requesterEmail: string) {
  const reqEmail = String(requesterEmail || "").trim().toLowerCase();
  if (!reqEmail) return false;
  if (reqEmail === ADMIN_EMAIL.toLowerCase()) return true;
  try {
    const cfg = await readConfig(slug);
    const adminEmail = String((cfg.ok ? (cfg.config as any)?.adminEmail : "") || "").trim().toLowerCase();
    if (!adminEmail) return true; // bootstrap
    return adminEmail === reqEmail;
  } catch {
    return false;
  }
}

async function readPartnerStats(slug: string) {
  const key = `partner_stats:${slug}`;
  const { data } = await supabaseAdmin.from("app_state").select("value").eq("key", key).maybeSingle();
  const val = (data as any)?.value;
  return val && typeof val === "object" ? val : {};
}

function safeEmail(v: any) {
  const s = String(v || "").trim().toLowerCase();
  return s.includes("@") ? s : "";
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 500 });

    const url = new URL(req.url);
    const slug = cleanSlug(url.searchParams.get("slug") || "");
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });

    const requesterEmail = req.headers.get("x-user-email") || "";
    const allowed = await canRead(slug, requesterEmail);
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const cfgRes = await readConfig(slug);
    const cfg = cfgRes.ok ? (cfgRes.config || {}) : {};
    const connectedAccountId = String((cfg as any)?.connectedAccountId || "").trim();

    const stats = await readPartnerStats(slug);
    const recentSignups: any[] = Array.isArray((stats as any)?.recentSignups) ? (stats as any).recentSignups : [];
    const signupEmails: string[] = Array.isArray((stats as any)?.signupEmails)
      ? (stats as any).signupEmails.map((x: any) => safeEmail(x)).filter(Boolean)
      : [];
    const recentPayments: any[] = Array.isArray((stats as any)?.recentPayments) ? (stats as any).recentPayments : [];

    // Map payment info by email (most recent wins)
    const paymentByEmail = new Map<string, { amount?: number; currency?: string; createdAt?: string }>();
    for (const p of recentPayments) {
      const em = safeEmail(p?.email);
      if (!em) continue;
      if (!paymentByEmail.has(em)) {
        paymentByEmail.set(em, {
          amount: Number(p?.amount || 0) || 0,
          currency: p?.currency ? String(p.currency).toUpperCase() : undefined,
          createdAt: p?.createdAt ? String(p.createdAt) : undefined,
        });
      }
    }

    // Live Stripe subscriptions (connected account)
    const subsByEmail = new Map<
      string,
      {
        createdAt?: string;
        interval?: "month" | "year" | string;
        status?: string;
        cancelAtPeriodEnd?: boolean;
        canceledAt?: string | null;
        couponCode?: string;
      }
    >();

    if (connectedAccountId) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" as any });
      const allSubs: Stripe.Subscription[] = [];
      let startingAfter: string | undefined = undefined;
      // paginate a bit so "old customers" still show up (bounded for performance)
      for (let page = 0; page < 5; page++) {
        const resp: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list(
          {
            limit: 100,
            status: "all",
            ...(startingAfter ? { starting_after: startingAfter } : {}),
            expand: ["data.customer", "data.items.data.price", "data.discount"],
          } as any,
          { stripeAccount: connectedAccountId } as any
        );
        allSubs.push(...(resp.data || []));
        if (!resp.has_more) break;
        startingAfter = resp.data?.[resp.data.length - 1]?.id;
        if (!startingAfter) break;
      }

      // Best-effort promo-code lookup cache
      const promoCodeCache = new Map<string, string>();
      const getPromoCode = async (id: string): Promise<string> => {
        const key = String(id || "").trim();
        if (!key) return "";
        if (promoCodeCache.has(key)) return promoCodeCache.get(key) || "";
        try {
          const pc: any = await stripe.promotionCodes.retrieve(key, {} as any, { stripeAccount: connectedAccountId } as any);
          const code = String(pc?.code || "").trim();
          promoCodeCache.set(key, code);
          return code;
        } catch {
          promoCodeCache.set(key, "");
          return "";
        }
      };

      for (const sub of allSubs || []) {
        const cust: any = (sub as any).customer;
        const email = safeEmail(cust?.email);
        if (!email) continue;

        const prev = subsByEmail.get(email);
        const created = sub.created ? new Date(sub.created * 1000).toISOString() : undefined;
        // Keep the newest subscription by created time
        if (prev?.createdAt && created && Date.parse(prev.createdAt) > Date.parse(created)) continue;

        const interval = (sub.items?.data?.[0] as any)?.price?.recurring?.interval || undefined;
        const status = String((sub as any)?.status || "");
        const cancelAtPeriodEnd = Boolean((sub as any)?.cancel_at_period_end);
        const canceledAt = (sub as any)?.canceled_at ? new Date(Number((sub as any).canceled_at) * 1000).toISOString() : null;

        let couponCode = "";
        try {
          const discount: any = (sub as any)?.discount;
          const promotionCode = discount?.promotion_code;
          if (typeof promotionCode === "string") couponCode = await getPromoCode(promotionCode);
          else if (promotionCode && typeof promotionCode === "object") couponCode = String(promotionCode?.code || "").trim();
        } catch {}

        subsByEmail.set(email, { createdAt: created, interval, status, cancelAtPeriodEnd, canceledAt, couponCode });
      }
    }

    // Union emails from signups and subscriptions
    const emails = new Set<string>();
    for (const s of recentSignups) {
      const em = safeEmail(s?.email);
      if (em) emails.add(em);
    }
    for (const em of signupEmails) if (em) emails.add(em);
    for (const em of subsByEmail.keys()) emails.add(em);

    const rows = Array.from(emails).map((email) => {
      const signup = recentSignups.find((s) => safeEmail(s?.email) === email) || {};
      const pay = paymentByEmail.get(email);
      const sub = subsByEmail.get(email);

      const interval = sub?.interval === "year" ? "year" : sub?.interval === "month" ? "month" : sub?.interval || "";
      const isActive = sub?.status === "active" || sub?.status === "trialing";
      const isCanceled = sub?.status === "canceled" || Boolean(sub?.cancelAtPeriodEnd) || Boolean(sub?.canceledAt);

      return {
        firstName: String(signup?.firstName || ""),
        email,
        signupCreatedAt: signup?.createdAt ? String(signup.createdAt) : "",
        // Payment
        paymentAmount: pay?.amount ?? null,
        paymentCurrency: pay?.currency || "",
        paymentCreatedAt: pay?.createdAt || "",
        // Subscription
        couponCode: sub?.couponCode || "",
        subscriptionCreatedAt: sub?.createdAt || "",
        subscriptionInterval: interval,
        subscriptionCanceled: isCanceled,
        subscriptionActive: isActive,
        subscriptionStatus: sub?.status || "",
      };
    });

    // Sort newest first (subscriptionCreatedAt > signupCreatedAt > paymentCreatedAt)
    rows.sort((a: any, b: any) => {
      const ta = Date.parse(String(a.subscriptionCreatedAt || a.signupCreatedAt || a.paymentCreatedAt || 0)) || 0;
      const tb = Date.parse(String(b.subscriptionCreatedAt || b.signupCreatedAt || b.paymentCreatedAt || 0)) || 0;
      return tb - ta;
    });

    return NextResponse.json(
      {
        ok: true,
        slug,
        generatedAt: new Date().toISOString(),
        rows,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

