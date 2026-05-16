import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { getAdminPanelToken } from "@/lib/adminSecrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest) {
  const expected = getAdminPanelToken();
  if (!expected) return false;

  const url = new URL(req.url);
  const queryToken = String(url.searchParams.get("token") || "");
  if (queryToken && queryToken === expected) return true;

  const cookieStore = await cookies();
  const cookieToken = String(cookieStore.get("ee_admin_token")?.value || "");
  return cookieToken === expected;
}

type FunnelRow = {
  channel: string;
  clicked_at: string;
  landed_at: string | null;
  signed_up_at: string | null;
  converted_at: string | null;
};

function summarize(rows: FunnelRow[]) {
  const byChannel: Record<
    string,
    { clicks: number; landings: number; signups: number; conversions: number }
  > = {};

  const daily: Record<
    string,
    Record<string, { clicks: number; landings: number; signups: number; conversions: number }>
  > = {};

  for (const row of rows) {
    const ch = row.channel || "unknown";
    if (!byChannel[ch]) {
      byChannel[ch] = { clicks: 0, landings: 0, signups: 0, conversions: 0 };
    }
    byChannel[ch].clicks += 1;
    if (row.landed_at) byChannel[ch].landings += 1;
    if (row.signed_up_at) byChannel[ch].signups += 1;
    if (row.converted_at) byChannel[ch].conversions += 1;

    const day = row.clicked_at?.slice(0, 10) || "unknown";
    if (!daily[day]) daily[day] = {};
    if (!daily[day][ch]) {
      daily[day][ch] = { clicks: 0, landings: 0, signups: 0, conversions: 0 };
    }
    daily[day][ch].clicks += 1;
    if (row.landed_at) daily[day][ch].landings += 1;
    if (row.signed_up_at) daily[day][ch].signups += 1;
    if (row.converted_at) daily[day][ch].conversions += 1;
  }

  const rates: Record<string, { landingRate: number; signupRate: number; conversionRate: number }> =
    {};
  for (const [ch, s] of Object.entries(byChannel)) {
    const clicks = s.clicks || 1;
    rates[ch] = {
      landingRate: Math.round((s.landings / clicks) * 1000) / 10,
      signupRate: Math.round((s.signups / clicks) * 1000) / 10,
      conversionRate: Math.round((s.conversions / clicks) * 1000) / 10,
    };
  }

  const dailyRows = Object.entries(daily)
    .flatMap(([date, channels]) =>
      Object.entries(channels).map(([channel, stats]) => ({
        date,
        channel,
        ...stats,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.channel.localeCompare(b.channel));

  return { byChannel, rates, dailyRows };
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !getAdminPanelToken()) {
      return NextResponse.json({ ok: false, error: "ADMIN_PANEL_TOKEN not set" }, { status: 503 });
    }
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days") || 30)));
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    let startIso: string;
    let endIso: string;
    if (start && end) {
      startIso = `${start}T00:00:00.000Z`;
      endIso = `${end}T23:59:59.999Z`;
    } else {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - days);
      startIso = from.toISOString();
      endIso = today.toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("funnel_sessions")
      .select("channel, clicked_at, landed_at, signed_up_at, converted_at")
      .gte("clicked_at", startIso)
      .lte("clicked_at", endIso)
      .order("clicked_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as FunnelRow[];
    const { byChannel, rates, dailyRows } = summarize(rows);

    const totals = rows.reduce(
      (acc, r) => {
        acc.clicks += 1;
        if (r.landed_at) acc.landings += 1;
        if (r.signed_up_at) acc.signups += 1;
        if (r.converted_at) acc.conversions += 1;
        return acc;
      },
      { clicks: 0, landings: 0, signups: 0, conversions: 0 },
    );

    return NextResponse.json({
      ok: true,
      start: startIso.slice(0, 10),
      end: endIso.slice(0, 10),
      totals,
      byChannel,
      rates,
      dailyRows,
      recent: rows.slice(0, 50),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
