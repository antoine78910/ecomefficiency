import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminPanelToken } from "@/lib/adminSecrets";
import { syncSupabaseUserStripeAccess } from "@/lib/syncSupabaseUserStripeAccess";

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

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && !getAdminPanelToken()) {
      return NextResponse.json({ ok: false, error: "ADMIN_PANEL_TOKEN not set" }, { status: 503 });
    }
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    const lookupEmail = String(body.lookupEmail || body.stripeEmail || "").trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
    }

    const result = await syncSupabaseUserStripeAccess({
      userEmail: email,
      lookupEmails: lookupEmail ? [lookupEmail] : undefined,
      updateStripeCustomerEmail: body.updateStripeCustomerEmail !== false,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "user_not_found" ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
