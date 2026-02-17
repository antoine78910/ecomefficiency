import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  user_metadata?: any;
};

function normalizeSource(v: any): string {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "unknown";
  if (s === "x" || s === "x/twitter" || s === "x_twitter") return "twitter";
  if (s === "twitter/x") return "twitter";
  if (s === "ai" || s === "llm" || s === "chatgpt" || s === "gpt") return "ai_llm";
  if (s === "friend") return "friends";
  return s;
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") || "");
    const expected = process.env.ADMIN_PANEL_TOKEN || "Zjhfc82005ad";
    // Allow either query param token OR httpOnly cookie token (set by middleware)
    const cookieHeader = String((req as any)?.headers?.get?.("cookie") || "");
    const cookieToken = (() => {
      const m = cookieHeader.match(/(?:^|;\s*)ee_admin_token=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    })();
    const provided = token || cookieToken;
    if (!expected || provided !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "supabase_admin_env_missing" }, { status: 500 });
    }

    const limit = Math.max(1, Math.min(300, Number(searchParams.get("limit") || 200)));

    const u = new URL(`${supabaseUrl}/auth/v1/admin/users`);
    u.searchParams.set("page", "1");
    u.searchParams.set("per_page", String(limit));

    const usersRes = await fetch(u.toString(), {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!usersRes.ok) {
      const txt = await usersRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: "supabase_admin_users_failed", detail: txt || usersRes.statusText }, { status: 500 });
    }

    const usersJson = (await usersRes.json().catch(() => ({}))) as any;
    const rawUsers: AdminUser[] = Array.isArray(usersJson?.users) ? usersJson.users : [];

    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;

    const enriched = await mapWithLimit(rawUsers, 6, async (user) => {
      const meta = (user.user_metadata || {}) as any;
      const source = normalizeSource(meta.acquisition_source);
      const customerId = meta.stripe_customer_id ? String(meta.stripe_customer_id) : null;

      let paid: boolean | null = null;
      let plan: string | null = null;
      let subStatus: string | null = null;

      // Fallback snapshot captured at onboarding
      if (!stripe || !customerId) {
        if (typeof meta.acquisition_paid_at_answer === "boolean") paid = Boolean(meta.acquisition_paid_at_answer);
        if (meta.acquisition_plan_at_answer) plan = String(meta.acquisition_plan_at_answer);
      }

      if (stripe && customerId) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 3 });
          const latest = (subs.data || []).sort((a, b) => (b.created || 0) - (a.created || 0))[0];
          if (latest) {
            subStatus = latest.status || null;
            paid = latest.status === "active" || latest.status === "trialing";
            const metaPlan = String(meta.plan || "").toLowerCase();
            if (metaPlan) plan = metaPlan;
          } else {
            paid = false;
          }
        } catch {
          paid = null;
        }
      }

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        source,
        stripe_customer_id: customerId,
        paid,
        plan,
        sub_status: subStatus,
      };
    });

    const bySource: Record<string, { total: number; paid: number; unknownPaid: number }> = {};
    for (const u2 of enriched) {
      const s = u2.source || "unknown";
      if (!bySource[s]) bySource[s] = { total: 0, paid: 0, unknownPaid: 0 };
      bySource[s].total += 1;
      if (u2.paid === true) bySource[s].paid += 1;
      if (u2.paid === null) bySource[s].unknownPaid += 1;
    }

    const totals = enriched.reduce(
      (acc, u2) => {
        acc.total += 1;
        if (u2.paid === true) acc.paid += 1;
        if (u2.paid === false) acc.unpaid += 1;
        if (u2.paid === null) acc.unknown += 1;
        return acc;
      },
      { total: 0, paid: 0, unpaid: 0, unknown: 0 },
    );

    return NextResponse.json({
      ok: true,
      totals,
      bySource,
      users: enriched,
      stripeEnabled: Boolean(stripe),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}

