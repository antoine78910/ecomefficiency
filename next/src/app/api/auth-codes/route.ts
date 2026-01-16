import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

// In-memory store (ephemeral). For production, replace with persistent store (KV/DB).
type CodeRecord = {
  code: string;
  plan: 'growth';
  createdAt: number;
  expiresAt: number;
  used: boolean;
  service: 'pipiads' | 'elevenlabs';
  fingerprint?: string; // optional binding to browser fingerprint
};
const CODES = new Map<string, CodeRecord>();

async function persistCode(rec: CodeRecord) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('auth_codes').insert({
      code: rec.code,
      plan: rec.plan,
      service: rec.service,
      created_at_ms: rec.createdAt,
      expires_at_ms: rec.expiresAt,
      used: rec.used,
    });
  } catch {}
}

async function loadCode(code: string): Promise<CodeRecord | null> {
  const mem = CODES.get(code);
  if (mem) return mem;
  if (!supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin.from('auth_codes').select('*').eq('code', code).limit(1).maybeSingle();
    if (!data) return null;
    return {
      code: data.code,
      plan: 'growth',
      createdAt: data.created_at_ms || Date.parse(data.created_at) || Date.now(),
      expiresAt: data.expires_at_ms || (Date.parse(data.created_at) + 2*60*1000),
      used: !!data.used,
      service: data.service,
    } as CodeRecord;
  } catch { return null; }
}

async function markUsed(code: string) {
  const rec = CODES.get(code);
  if (rec) { rec.used = true; CODES.set(code, rec); }
  if (!supabaseAdmin) return;
  try { await supabaseAdmin.from('auth_codes').update({ used: true }).eq('code', code); } catch {}
}

function generateCode(): string {
  // URL-safe 32 chars
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString('base64url');
}

async function verifyGrowth(email?: string, customerId?: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
    let cid = customerId || '';
    if (!cid && email) {
      const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 });
      const c = search.data?.[0];
      if (c) cid = c.id;
    }
    if (!cid) return false;
    const subs = await stripe.subscriptions.list({ customer: cid, status: 'all', limit: 10 });
    const latest = subs.data.sort((a,b)=>(b.created||0)-(a.created||0))[0];
    if (!latest) return false;
    const active = latest.status === 'active' || latest.status === 'trialing';
    if (!active) return false;
    // map plan to growth
    const price = latest.items.data[0]?.price as Stripe.Price | undefined;
    const env = process.env;
    const growthIds = [env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_MONTHLY, env.NEXT_PUBLIC_STRIPE_PRICE_ID_GROWTH_YEARLY].filter(Boolean) as string[];
    if (price?.id && growthIds.includes(price.id)) return true;
    const lookup = (price?.lookup_key || '').toString().toLowerCase();
    const nickname = (price?.nickname || '').toString().toLowerCase();
    if (lookup.includes('growth') || nickname.includes('growth')) return true;
    try {
      const prodId = typeof price?.product === 'string' ? price?.product : (price?.product as any)?.id;
      if (prodId) {
        const product = await stripe.products.retrieve(prodId);
        const name = (product?.name || '').toLowerCase();
        if (name.includes('growth')) return true;
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
}

export const dynamic = 'force-dynamic'

// POST /api/auth-codes -> generate one-time code for a service (pipiads/elevenlabs)
export async function POST(req: NextRequest) {
  try {
    const { service } = (await req.json().catch(()=>({}))) as { service?: 'pipiads' | 'elevenlabs' };
    if (service !== 'pipiads' && service !== 'elevenlabs') {
      return NextResponse.json({ ok: false, error: 'invalid_service' }, { status: 400 });
    }
    const email = req.headers.get('x-user-email') || undefined;
    const customerId = req.headers.get('x-stripe-customer-id') || undefined;
    console.log('[API][AUTH-CODES][POST] service=', service, 'email?', !!email, 'customerId?', !!customerId)
    const ok = await verifyGrowth(email, customerId);
    if (!ok) return NextResponse.json({ ok: false, error: 'not_pro' }, { status: 403 });

    const code = generateCode();
    const now = Date.now();
    const rec: CodeRecord = {
      code,
      plan: 'growth',
      createdAt: now,
      expiresAt: now + 2 * 60 * 1000, // 2 minutes validity
      used: false,
      service,
    };
    CODES.set(code, rec);
    console.log('[API][AUTH-CODES][POST] generated code=', code, 'expiresAt=', rec.expiresAt)
    await persistCode(rec);
    return NextResponse.json({ ok: true, code, expiresAt: rec.expiresAt });
  } catch (e: any) {
    console.error('[API][AUTH-CODES][POST] error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 });
  }
}

// PUT /api/auth-codes -> redeem (extension side). Body: { code, service, fingerprint? }
export async function PUT(req: NextRequest) {
  try {
    const { code, service, fingerprint } = (await req.json().catch(()=>({}))) as { code?: string; service?: 'pipiads'|'elevenlabs'; fingerprint?: string };
    if (!code || (service !== 'pipiads' && service !== 'elevenlabs')) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    console.log('[API][AUTH-CODES][PUT] code=', code, 'service=', service)
    const rec = await loadCode(code);
    if (!rec || rec.used || rec.service !== service || Date.now() > rec.expiresAt) {
      console.warn('[API][AUTH-CODES][PUT] invalid or expired:', { found: !!rec, used: rec?.used, serviceMatch: rec?.service === service, now: Date.now(), exp: rec?.expiresAt })
      return NextResponse.json({ ok: false, error: 'invalid_or_expired' }, { status: 400 });
    }
    await markUsed(code);
    // Payload that extension can use. Do NOT return credentials; return signed grant only.
    return NextResponse.json({ ok: true, grant: { service: rec.service, issuedAt: rec.createdAt, ttlMs: rec.expiresAt - rec.createdAt } });
  } catch (e: any) {
    console.error('[API][AUTH-CODES][PUT] error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 });
  }
}

// GET /api/auth-codes?code=... -> check status (optional). Only for debugging.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '';
  const recMem = code ? CODES.get(code) : undefined;
  let rec: CodeRecord | null = recMem ?? null;
  if (!rec) {
    rec = await loadCode(code);
  }
  if (!rec) return NextResponse.json({ ok: false, status: 'unknown' }, { status: 404 });
  return NextResponse.json({ ok: true, status: rec.used ? 'used' : (Date.now()>rec.expiresAt?'expired':'valid'), service: rec.service });
}


