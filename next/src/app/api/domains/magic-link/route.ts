import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/server";

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function parseMaybeJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return value as any as T;
    }
  }
  return value as T;
}

function isValidEmail(value: string) {
  const v = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function htmlEmail({ saasName, link }: { saasName: string; link: string }) {
  const safeName = saasName || "Your SaaS";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sign in to ${safeName}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 14px;text-align:center;">
                <div style="font-size:22px;font-weight:700;line-height:1.3;">Sign in to ${safeName}</div>
                <div style="margin-top:8px;font-size:14px;color:rgba(255,255,255,0.70);">Click the button below. The link expires soon.</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 28px 28px;">
                <a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(to bottom,#9541e0,#7c30c7);border:1px solid #9541e0;color:#fff;text-decoration:none;font-weight:600;">
                  Sign in
                </a>
                <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.55);word-break:break-all;">
                  If the button doesn’t work, copy/paste this link:<br/>
                  <span style="color:rgba(171,99,255,0.95);">${link}</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });

    const host = cleanDomain(req.headers.get("x-forwarded-host") || req.headers.get("host") || "");
    if (!host) return NextResponse.json({ ok: false, error: "missing_host" }, { status: 400 });

    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });

    // Resolve partner slug by custom domain mapping
    const mapKey = `partner_domain:${host}`;
    const { data: mapRow } = await supabaseAdmin.from("app_state").select("value").eq("key", mapKey).maybeSingle();
    const mapping = parseMaybeJson((mapRow as any)?.value) as any;
    const slug = String(mapping?.slug || "").trim().toLowerCase();
    if (!slug) {
      // avoid leaking info
      return NextResponse.json({ ok: true, queued: true }, { status: 200 });
    }

    // Read partner config for sender branding
    const cfgKey = `partner_config:${slug}`;
    const { data: cfgRow } = await supabaseAdmin.from("app_state").select("value").eq("key", cfgKey).maybeSingle();
    const cfg = (parseMaybeJson((cfgRow as any)?.value) as any) || {};
    const saasName = String(cfg?.saasName || slug);
    const customDomain = cleanDomain(cfg?.customDomain || host) || host;

    // We send from: no-reply@notify.<customDomain>
    const senderDomain = `notify.${customDomain}`;
    const fromName = String(cfg?.emailFromName || saasName || "No Reply");
    const fromEmail = `no-reply@${senderDomain}`;

    // Generate a Supabase magic link and send it via Resend
    const origin = `https://${host}`;
    const redirectTo = `${origin}/app`;

    // We try magiclink first; if it fails (new user), fallback to signup link.
    let actionLink = "";
    try {
      const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (error) throw error;
      actionLink = String((data as any)?.properties?.action_link || "");
    } catch {
      try {
        const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
          type: "signup",
          email,
          options: { redirectTo },
        });
        if (!error) actionLink = String((data as any)?.properties?.action_link || "");
      } catch {}
    }

    if (actionLink) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Your sign-in link for ${saasName}`,
        html: htmlEmail({ saasName, link: actionLink }),
        text: `Sign in to ${saasName}: ${actionLink}`,
      });
    }

    // Always return OK to prevent email enumeration / abuse signals.
    return NextResponse.json({ ok: true, queued: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

