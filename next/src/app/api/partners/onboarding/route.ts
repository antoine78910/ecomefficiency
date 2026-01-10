import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

type Currency = "USD" | "EUR" | "OTHER";
type SignupMode = "public" | "invite_only";

function cleanSlug(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const saasName = String(body?.saasName || "").trim();
    const slugRaw = String(body?.slug || "");
    const slug = cleanSlug(slugRaw);
    const adminEmail = String(body?.adminEmail || "").trim();

    if (!saasName) return NextResponse.json({ ok: false, error: "missing_saas_name" }, { status: 400 });
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json({ ok: false, error: "invalid_admin_email" }, { status: 400 });
    }

    const payload = {
      saasName,
      slug,
      tagline: body?.tagline ? String(body.tagline).trim() : "",
      logoUrl: body?.logoUrl ? String(body.logoUrl) : "",
      faviconUrl: body?.faviconUrl ? String(body.faviconUrl) : "",
      colors: {
        main: body?.mainColor ? String(body.mainColor).trim() : "",
        secondary: body?.secondaryColor ? String(body.secondaryColor).trim() : "",
        accent: body?.accentColor ? String(body.accentColor).trim() : "",
        background: body?.backgroundColor ? String(body.backgroundColor).trim() : "",
      },
      customDomain: body?.customDomain ? String(body.customDomain).trim() : "",
      domainProvider: body?.domainProvider ? String(body.domainProvider).trim() : "",
      adminEmail,
      signupMode: (body?.signupMode as SignupMode) || "public",
      stripeAccountEmail: body?.stripeAccountEmail ? String(body.stripeAccountEmail).trim() : "",
      currency: (body?.currency as Currency) || "USD",
      currencyOther: body?.currencyOther ? String(body.currencyOther).trim() : "",
      monthlyPrice: body?.monthlyPrice ? Number(body.monthlyPrice) : null,
      supportEmail: body?.supportEmail ? String(body.supportEmail).trim() : "",
      desiredLaunch: body?.desiredLaunch ? String(body.desiredLaunch).trim() : "",
      notes: body?.notes ? String(body.notes).trim() : "",
      meta: {
        createdAt: new Date().toISOString(),
        userAgent: req.headers.get("user-agent") || "",
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          "",
      },
    };

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    }

    const key = `partner_config:${slug}`;

    // Prevent accidental overwrite if slug already exists
    try {
      const { data } = await supabaseAdmin.from("app_state").select("key,value").eq("key", key).maybeSingle();
      if (data?.key) {
        return NextResponse.json({ ok: false, error: "slug_taken" }, { status: 409 });
      }
    } catch {}

    const { error } = await supabaseAdmin
      .from("app_state")
      .upsert({ key, value: payload, updated_at: new Date().toISOString() }, { onConflict: "key" as any });

    if (error) {
      return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "invalid_json", detail: e?.message || String(e) }, { status: 400 });
  }
}


