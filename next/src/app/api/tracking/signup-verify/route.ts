import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getVerifySecret() {
  return String(process.env.SIGNUP_TRACKING_VERIFY_SECRET || "").trim();
}

function isValidKey(key: string) {
  const expected = getVerifySecret();
  if (!expected) return false;
  return key === expected;
}

async function getAuthedUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(req: NextRequest) {
  const key = String(req.nextUrl.searchParams.get("key") || "").trim();
  if (!getVerifySecret()) {
    return NextResponse.json(
      { ok: false, error: "SIGNUP_TRACKING_VERIFY_SECRET not configured on server" },
      { status: 503 }
    );
  }
  if (!isValidKey(key)) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 401 });
  }

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" }, { status: 401 });
  }

  const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
  const isNewAccount = createdAt > 0 && Date.now() - createdAt < 60 * 60 * 1000;

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      is_new_account: isNewAccount,
    },
    verify_page_path: "/signup-tracking-verify",
    instructions: [
      "Open this page while signed in, with ?key=YOUR_SECRET in the URL.",
      "Use auto=1 to fire missing Google Ads + GTM signup events on load.",
      "In GTM, create a trigger: Custom Event = ee_signup_complete.",
    ],
  });
}
