import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = "force-dynamic";

type ToolKey = "elevenlabs" | "higgsfield";

function utcDayStartIso(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return d.toISOString();
}

function normalizeEmail(v: unknown) {
  return String(v || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: admin.status || 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { tool?: ToolKey; email?: string };
  const tool = (body.tool || "") as ToolKey;
  const email = normalizeEmail(body.email);

  // Test lock: only allow refill for this email for now.
  const ONLY_EMAIL = "anto.delbos@gmail.com";
  if (!email || email !== ONLY_EMAIL) {
    return NextResponse.json({ ok: false, error: "email_not_allowed" }, { status: 403 });
  }
  if (tool !== "elevenlabs" && tool !== "higgsfield") {
    return NextResponse.json({ ok: false, error: "invalid_tool" }, { status: 400 });
  }

  const since = utcDayStartIso();

  const table = tool === "elevenlabs" ? "elevenlabs_usage_events" : "higgsfield_usage_events";
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("delta")
    .eq("email", email)
    .gte("at", since);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const usedRaw = (data || []).reduce((sum: number, row: any) => sum + (Number(row?.delta) || 0), 0);
  const used = Math.max(0, usedRaw);

  if (used <= 0) {
    return NextResponse.json({ ok: true, tool, email, since, refilled: 0, used_before: used, used_after: 0 });
  }

  const at = new Date().toISOString();
  const refillDelta = -used;

  const insertPayload: Record<string, unknown> =
    tool === "elevenlabs"
      ? {
          email,
          delta: refillDelta,
          used_this_period: null,
          at,
          user_agent: "admin_refill",
          source: "admin_refill",
        }
      : {
          email,
          delta: refillDelta,
          used_today: null,
          at,
          user_agent: "admin_refill",
          source: "admin_refill",
        };

  const ins = await supabaseAdmin.from(table).insert(insertPayload);
  if (ins.error) {
    return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tool,
    email,
    since,
    refilled: used,
    used_before: used,
    used_after: 0,
  });
}

