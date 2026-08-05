import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/integrations/supabase/server";
import {
  adjustRewardBalance,
  formatRewardMoney,
  getRewardWallet,
  type RewardEntryType,
} from "@/lib/rewardCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: RewardEntryType[] = [
  "redeem_subscription",
  "redeem_higgsfield",
  "redeem_elevenlabs",
  "admin_adjust",
];

async function resolveUserId(body: { user_id?: string; email?: string }): Promise<string | null> {
  if (body.user_id) return String(body.user_id).trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const users = data?.users || [];
    // Prefer exact match; paginate a bit if needed
    let found = users.find((u: { id?: string; email?: string | null }) => String(u.email || "").toLowerCase() === email);
    if (found?.id) return found.id;
    for (let page = 2; page <= 10; page++) {
      const next = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const batch = next.data?.users || [];
      if (!batch.length) break;
      found = batch.find((u: { id?: string; email?: string | null }) => String(u.email || "").toLowerCase() === email);
      if (found?.id) return found.id;
    }
  } catch (e) {
    console.error("[admin/reward-credits] resolveUserId", e);
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      user_id?: string;
      email?: string;
      amount_cents?: number;
      entry_type?: string;
      note?: string;
    };

    const userId = await resolveUserId(body);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    const entryType = String(body.entry_type || "admin_adjust") as RewardEntryType;
    if (!ALLOWED_TYPES.includes(entryType)) {
      return NextResponse.json({ ok: false, error: "invalid_entry_type" }, { status: 400 });
    }

    const amountCents = Math.trunc(Number(body.amount_cents));
    if (!Number.isFinite(amountCents) || amountCents === 0) {
      return NextResponse.json({ ok: false, error: "amount_cents_required" }, { status: 400 });
    }

    const result = await adjustRewardBalance({
      userId,
      amountCents,
      entryType,
      note: body.note,
      adminEmail: process.env.ADMIN_EMAIL || null,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      wallet: result.wallet,
      balance_label: result.wallet ? formatRewardMoney(result.wallet.balance_cents) : null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const email = String(req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  const userIdParam = String(req.nextUrl.searchParams.get("user_id") || "").trim();
  const userId = await resolveUserId({ email, user_id: userIdParam });
  if (!userId) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }
  const wallet = await getRewardWallet(userId);
  return NextResponse.json({
    ok: true,
    user_id: userId,
    wallet,
    balance_label: wallet ? formatRewardMoney(wallet.balance_cents) : null,
  });
}
