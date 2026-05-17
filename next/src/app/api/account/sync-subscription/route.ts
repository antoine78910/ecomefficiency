import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncSupabaseUserStripeAccess } from "@/lib/syncSupabaseUserStripeAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const result = await syncSupabaseUserStripeAccess({
      userEmail: data.user.email,
      userId: data.user.id,
      updateStripeCustomerEmail: true,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
