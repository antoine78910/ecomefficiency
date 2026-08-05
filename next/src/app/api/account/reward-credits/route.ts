import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CONVERT_MIN_BALANCE_CENTS,
  MONTHLY_REWARD_CENTS,
  formatRewardMoney,
  getRewardWallet,
  listRecentLedger,
} from "@/lib/rewardCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const wallet = await getRewardWallet(user.id);
    const balanceCents = wallet?.balance_cents ?? 0;
    const ledger = await listRecentLedger(user.id, 10);

    return NextResponse.json({
      ok: true,
      currency: "usd",
      balance_cents: balanceCents,
      balance_label: formatRewardMoney(balanceCents),
      monthly_grant_cents: MONTHLY_REWARD_CENTS,
      monthly_grant_label: formatRewardMoney(MONTHLY_REWARD_CENTS),
      convert_min_cents: CONVERT_MIN_BALANCE_CENTS,
      convert_min_label: formatRewardMoney(CONVERT_MIN_BALANCE_CENTS),
      can_convert_tools: balanceCents >= CONVERT_MIN_BALANCE_CENTS,
      ledger,
      discord_url: "https://discord.gg/7UgABk3jKJ",
      support_email: "support@ecomefficiency.com",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
