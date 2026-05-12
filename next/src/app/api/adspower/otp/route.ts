import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function parsePortalValue(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

async function partnerSlugFromHost(host: string): Promise<string> {
  if (!supabaseAdmin || !host) return "";
  if (
    host === "ecomefficiency.com" ||
    host.endsWith(".ecomefficiency.com") ||
    host.endsWith("localhost") ||
    host.endsWith(".vercel.app")
  ) {
    return "";
  }
  try {
    const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", `partner_domain:${host}`).maybeSingle();
    const mapping = parsePortalValue((data as any)?.value);
    return String(mapping?.slug || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

async function stripeHasActiveToolAccess(email: string, customerId: string, partnerSlug: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return false;
  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
  let stripeAccount: string | undefined;
  if (partnerSlug && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.from("portal_state").select("value").eq("key", `partner_config:${partnerSlug}`).maybeSingle();
      const cfg = parsePortalValue((data as any)?.value);
      const ca = String(cfg?.connectedAccountId || "").trim();
      if (ca) stripeAccount = ca;
    } catch {}
  }
  let cid = String(customerId || "").trim();
  const em = String(email || "").trim();
  if (!cid && em) {
    try {
      const search = await stripe.customers.search(
        { query: `email:'${em.replace(/'/g, "\\'")}'`, limit: 1 },
        stripeAccount ? ({ stripeAccount } as any) : undefined
      );
      cid = search.data[0]?.id || "";
    } catch {}
  }
  if (!cid) return false;
  const subs = await stripe.subscriptions.list(
    { customer: cid, status: "all", limit: 10 },
    stripeAccount ? ({ stripeAccount } as any) : undefined
  );
  const sorted = subs.data.sort((a, b) => (b.created || 0) - (a.created || 0));
  for (const sub of sorted) {
    if (sub.status === "active" || sub.status === "trialing") return true;
    if (sub.status === "incomplete" && sub.latest_invoice) {
      try {
        const invId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
        if (invId) {
          const inv = await stripe.invoices.retrieve(invId, stripeAccount ? ({ stripeAccount } as any) : undefined);
          if (inv.status === "paid") return true;
        }
      } catch {}
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const host = cleanDomain(req.headers.get("x-forwarded-host") || req.headers.get("host") || "");
    const mappedPartner = await partnerSlugFromHost(host);
    if (mappedPartner) {
      return NextResponse.json({ ok: false, error: "not_available" }, { status: 403 });
    }

    if (process.env.VERCEL_ENV === "production" && host !== "app.ecomefficiency.com") {
      return NextResponse.json({ ok: false, error: "forbidden_host" }, { status: 403 });
    }

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
    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr || !ures?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const user = ures.user;
    const email = String(user.email || "").trim();
    const stripeCustomerId = String(((user.user_metadata as any) || {}).stripe_customer_id || "").trim();

    const allowed = await stripeHasActiveToolAccess(email, stripeCustomerId, "");
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "subscription_required" }, { status: 403 });
    }

    const base = String(process.env.ADSPOWER_OTP_IMAP_BASE_URL || "http://51.83.103.21:20016").replace(/\/$/, "");
    const secret = String(process.env.ADSPOWER_OTP_ENDPOINT_SECRET || "").trim();
    const since = String(req.nextUrl.searchParams.get("since") || "0");
    const qs = new URLSearchParams();
    if (since) qs.set("since", since);
    qs.set("max_age_ms", "60000");
    if (secret) qs.set("secret", secret);

    const upstream = `${base}/otp-adspower?${qs.toString()}`;
    const r = await fetch(upstream, { cache: "no-store", signal: AbortSignal.timeout(28_000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: "upstream_error", status: r.status }, { status: 502 });
    }
    const code = String((j as any)?.code || "").trim();
    return NextResponse.json({
      ok: true,
      code,
      source: String((j as any)?.source || "") || undefined,
    });
  } catch (e: any) {
    console.error("[adspower/otp]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
