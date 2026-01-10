import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { Resend } from "resend";

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
      whatsappNumber: body?.whatsappNumber ? String(body.whatsappNumber).trim() : "",
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

    // Persist (tolerant to schema differences like missing updated_at)
    const tryUpsert = async (withUpdatedAt: boolean) => {
      const row: any = withUpdatedAt
        ? { key, value: payload, updated_at: new Date().toISOString() }
        : { key, value: payload };
      const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
      return error;
    };

    let upsertError: any = await tryUpsert(true);
    if (upsertError) {
      const msg = String(upsertError?.message || "");
      const missingUpdatedAt =
        /updated_at/i.test(msg) &&
        /(does not exist|unknown column|column)/i.test(msg);
      if (missingUpdatedAt) {
        upsertError = await tryUpsert(false);
      }
    }

    if (upsertError) {
      return NextResponse.json(
        {
          ok: false,
          error: "db_error",
          detail: upsertError?.message || "Unknown database error",
          code: upsertError?.code || null,
          hint: upsertError?.hint || null,
          details: upsertError?.details || null,
        },
        { status: 500 }
      );
    }

    // Best effort: notify internal email about new onboarding (do not block success)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const subject = `New Partners Onboarding: ${payload.saasName} (${payload.slug})`;
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.45; color: #111;">
            <h2 style="margin: 0 0 12px;">New partners onboarding submitted</h2>
            <p style="margin: 0 0 10px;"><strong>SaaS name:</strong> ${escapeHtml(payload.saasName)}</p>
            <p style="margin: 0 0 10px;"><strong>Slug:</strong> ${escapeHtml(payload.slug)}</p>
            <p style="margin: 0 0 10px;"><strong>Default URL:</strong> https://partners.ecomefficiency.com/${escapeHtml(payload.slug)}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 14px 0;" />
            <p style="margin: 0 0 8px;"><strong>Admin email:</strong> ${escapeHtml(payload.adminEmail)}</p>
            <p style="margin: 0 0 8px;"><strong>Support email:</strong> ${escapeHtml(payload.supportEmail || "")}</p>
            <p style="margin: 0 0 8px;"><strong>WhatsApp:</strong> ${escapeHtml(payload.whatsappNumber || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Domain provider:</strong> ${escapeHtml(payload.domainProvider || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Custom domain:</strong> ${escapeHtml(payload.customDomain || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Signup mode:</strong> ${escapeHtml(payload.signupMode || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Stripe email:</strong> ${escapeHtml(payload.stripeAccountEmail || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Currency:</strong> ${escapeHtml(payload.currency === "OTHER" ? payload.currencyOther : payload.currency)}</p>
            <p style="margin: 0 0 8px;"><strong>Monthly price:</strong> ${payload.monthlyPrice ?? ""}</p>
            <p style="margin: 0 0 8px;"><strong>Desired launch:</strong> ${escapeHtml(payload.desiredLaunch || "")}</p>
            <p style="margin: 0 0 8px;"><strong>Notes:</strong><br/>${escapeHtml(payload.notes || "").replace(/\\n/g, "<br/>")}</p>
          </div>
        `;
        await resend.emails.send({
          from: "Ecom Efficiency <onboarding@ecomefficiency.com>",
          to: "anto.delbos@gmail.com",
          subject,
          html,
          replyTo: payload.adminEmail || undefined,
        });
      }
    } catch (e: any) {
      console.error("[partners/onboarding] Failed to send internal email:", e?.message || String(e));
    }

    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "invalid_json", detail: e?.message || String(e) }, { status: 400 });
  }
}

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


