import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { Resend } from "resend";

export const runtime = "nodejs";

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

    const slugRaw = String(body?.slug || "");
    const slug = cleanSlug(slugRaw);
    const adminEmail = String(body?.adminEmail || "").trim();

    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json({ ok: false, error: "invalid_admin_email" }, { status: 400 });
    }

    const saasName = String(body?.saasName || slug).trim();

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
      onboarding: body?.onboarding && typeof body.onboarding === "object" ? body.onboarding : undefined,
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
      try {
        const row: any = withUpdatedAt
          ? { key, value: payload, updated_at: new Date().toISOString() }
          : { key, value: payload };
        const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
        return error;
      } catch (e: any) {
        return { message: e?.message || String(e) };
      }
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

    // Best effort: notify internal email about new onboarding (do not block success)
    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const subject = `New Partners Onboarding: ${payload.saasName} (${payload.slug})`;

        const onboarding = (payload as any).onboarding || {};
        const onboardingHtml =
          onboarding && Object.keys(onboarding).length
            ? `
            <hr style="border: none; border-top: 1px solid #ddd; margin: 14px 0;" />
            <h3 style="margin: 0 0 8px;">Onboarding answers</h3>
            <p style="margin: 0 0 8px;"><strong>Type:</strong> ${escapeHtml(String(onboarding.creatorTypeLabel || onboarding.creatorType || ""))}</p>
            <p style="margin: 0 0 8px;"><strong>Audience level:</strong> ${escapeHtml(String(onboarding.audienceLevel || ""))}</p>
            <p style="margin: 0 0 8px;"><strong>Main channels:</strong> ${escapeHtml(String((onboarding.audienceMainChannelLabels || onboarding.audienceMainChannels || onboarding.audienceMainChannelLabel || onboarding.audienceMainChannel || []) as any))}</p>
            <p style="margin: 0 0 8px;"><strong>Launch onboard:</strong> ${escapeHtml(String(onboarding.launchOnboardCount ?? ""))}</p>
            <p style="margin: 0 0 8px;"><strong>Offer type:</strong> ${escapeHtml(String(onboarding.offerType || ""))}</p>
          `
            : "";

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.45; color: #111;">
            <h2 style="margin: 0 0 12px;">New partners onboarding submitted</h2>
            <p style="margin: 0 0 10px;"><strong>SaaS name:</strong> ${escapeHtml(payload.saasName)}</p>
            <p style="margin: 0 0 10px;"><strong>Slug:</strong> ${escapeHtml(payload.slug)}</p>
            <p style="margin: 0 0 10px;"><strong>Default URL:</strong> https://partners.ecomefficiency.com/${escapeHtml(payload.slug)}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 14px 0;" />
            <p style="margin: 0 0 8px;"><strong>Admin email:</strong> ${escapeHtml(payload.adminEmail)}</p>
            ${onboardingHtml}
          </div>
        `;
        await resend.emails.send({
          from: "Ecom Efficiency <onboarding@ecomefficiency.com>",
          to: "anto.delbos@gmail.com",
          subject,
          html,
          replyTo: payload.adminEmail || undefined,
        });
        emailSent = true;
      }
    } catch (e: any) {
      console.error("[partners/onboarding] Failed to send internal email:", e?.message || String(e));
    }

    // If DB failed, still return success (email is the fallback so we don't block onboarding)
    if (upsertError) {
      const detail =
        upsertError?.message ||
        (typeof upsertError === "string" ? upsertError : "") ||
        (() => {
          try { return JSON.stringify(upsertError); } catch { return ""; }
        })() ||
        "Unknown database error";

      console.error("[partners/onboarding] DB write failed:", detail);

      return NextResponse.json(
        {
          ok: true,
          slug,
          persisted: false,
          emailSent,
          warning: "db_write_failed",
          dbErrorDetail: detail,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, slug, persisted: true, emailSent }, { status: 200 });
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


