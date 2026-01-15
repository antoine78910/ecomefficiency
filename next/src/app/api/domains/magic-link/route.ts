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

function safeLocalPartFromEmail(email: string) {
  const e = String(email || "").trim();
  const at = e.indexOf("@");
  if (at <= 0) return "";
  return e.slice(0, at).trim().toLowerCase();
}

function isValidLocalPart(lp: string) {
  const s = String(lp || "").trim();
  // conservative: letters, numbers, dot, dash, underscore
  return /^[a-z0-9._-]+$/.test(s) && s.length >= 2 && s.length <= 64;
}

async function upsertAppState(key: string, value: any) {
  if (!supabaseAdmin) throw new Error("supabase_admin_missing");
  const shouldStringifyValue = (msg: string) =>
    /column\s+"value"\s+is\s+of\s+type/i.test(msg) ||
    /invalid input syntax/i.test(msg) ||
    /could not parse/i.test(msg) ||
    (/json/i.test(msg) && /type/i.test(msg));

  const tryUpsert = async (withUpdatedAt: boolean, stringifyValue: boolean) => {
    const row: any = withUpdatedAt
      ? { key, value: stringifyValue ? JSON.stringify(value) : value, updated_at: new Date().toISOString() }
      : { key, value: stringifyValue ? JSON.stringify(value) : value };
    const { error } = await supabaseAdmin.from("app_state").upsert(row, { onConflict: "key" as any });
    return error;
  };

  let err: any = await tryUpsert(true, false);
  if (err) {
    const msg = String(err?.message || "");
    const missingUpdatedAt = /updated_at/i.test(msg) && /(does not exist|unknown column|column)/i.test(msg);
    if (missingUpdatedAt) err = await tryUpsert(false, false);
    if (err && shouldStringifyValue(String(err?.message || ""))) {
      err = await tryUpsert(!missingUpdatedAt, true);
      if (err && missingUpdatedAt) err = await tryUpsert(false, true);
    }
  }
  if (err) throw err;
}

function htmlEmail({ saasName, link, buttonColor, buttonColorDark }: { saasName: string; link: string; buttonColor: string; buttonColorDark: string }) {
  const safeName = saasName || "Your SaaS";
  // Ensure colors are valid hex codes
  const mainColor = buttonColor || "#9541e0";
  const darkColor = buttonColorDark || "#7c30c7";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
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
                <div style="margin-top:8px;font-size:14px;color:rgba(255,255,255,0.70);">Click the button below to access your account. This link expires in 1 hour.</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 28px 28px;">
                <a href="${link}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:linear-gradient(to bottom,${mainColor},${darkColor});border:1px solid ${mainColor};color:#fff;text-decoration:none;font-weight:600;font-size:15px;">
                  Sign in to ${safeName}
                </a>
                <div style="margin-top:18px;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;">
                  If the button doesn't work, copy and paste this link into your browser:<br/>
                  <span style="color:rgba(255,255,255,0.75);word-break:break-all;">${link}</span>
                </div>
                <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.10);font-size:11px;color:rgba(255,255,255,0.50);">
                  This email was sent by ${safeName}. If you didn't request this link, you can safely ignore this email.
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
    const planRaw = String(body?.plan || "").trim().toLowerCase();
    const plan: "month" | "year" | "" = planRaw === "year" ? "year" : planRaw === "month" ? "month" : "";
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

    // Prefer configured, verified Resend domain (e.g. notify.customdomain.com).
    // IMPORTANT: Never send from an unverified custom domain (hurts deliverability and may be rejected).
    // If not verified yet, fallback to a known verified platform sender domain.
    const cfgEmailDomain = cleanDomain(cfg?.emailDomain || "");
    const resendStatus = String(cfg?.resendDomainStatus || "").toLowerCase();
    const canUseCfgDomain = cfgEmailDomain && (resendStatus === "verified" || resendStatus === "active");
    // Preferred sender domain should be the partner's domain (white-label). If not verified yet, Resend may reject it.
    // We'll try the preferred domain first, and fallback to a verified platform domain only if sending fails.
    const preferredSenderDomain = cfgEmailDomain || `notify.${customDomain}`;
    const fallbackSenderDomain = cleanDomain(process.env.RESEND_FALLBACK_FROM_DOMAIN || "notify.ecomefficiency.com");
    const primarySenderDomain = canUseCfgDomain ? cfgEmailDomain : preferredSenderDomain;
    const fromName = String(cfg?.emailFromName || saasName || "Support");
    // Don't use "no-reply" (hurts deliverability). Prefer supportEmail local part, fallback to "support".
    const supportEmailCfg = String(cfg?.supportEmail || cfg?.adminEmail || "").trim();
    const suggestedLocal = safeLocalPartFromEmail(supportEmailCfg);
    const localPart = isValidLocalPart(suggestedLocal) && suggestedLocal !== "no-reply" && suggestedLocal !== "noreply" ? suggestedLocal : "support";
    const makeFromEmail = (domain: string) => `${localPart}@${domain}`;

    // Get partner colors for email button
    const colors = cfg?.colors || {};
    const buttonColor = String(colors?.accent || colors?.main || "#9541e0").trim();
    // Create a darker shade for gradient (reduce brightness by ~20%)
    const buttonColorDark = String(colors?.secondary || colors?.accent || "#7c30c7").trim();

    // Generate a Supabase magic link and send it via Resend
    // Use custom domain if configured, otherwise use the host from request
    const targetDomain = customDomain && customDomain !== host ? customDomain : host;
    const origin = `https://${targetDomain}`;
    // IMPORTANT:
    // Supabase verifies the link on the auth domain (auth.ecomefficiency.com). Cookies/localStorage cannot be shared
    // to the custom domain, so we must land on the custom domain and set the session there.
    // Our `/signin` page on custom domains already handles `#access_token` or `?code=` and will redirect to `/app`.
    const afterSignIn = `/app${plan ? `?plan=${encodeURIComponent(plan)}` : ""}`;
    const redirectTo = `${origin}/signin?next=${encodeURIComponent(afterSignIn)}`;

    // Track "signup" intent for partner dashboard (so signups show up even before payment)
    // This powers the Data tab which reads app_state: partner_stats:<slug>.
    try {
      const statsKey = `partner_stats:${slug}`;
      const { data: statsRow } = await supabaseAdmin.from("app_state").select("value").eq("key", statsKey).maybeSingle();
      const rawStats = parseMaybeJson((statsRow as any)?.value) as any;
      const stats = rawStats && typeof rawStats === "object" ? rawStats : {};
      const nowIso = new Date().toISOString();
      const emailLc = String(email || "").toLowerCase().trim();

      const signupEmails: string[] = Array.isArray(stats.signupEmails) ? stats.signupEmails.map((x: any) => String(x || "").toLowerCase().trim()).filter(Boolean) : [];
      const already = signupEmails.includes(emailLc);
      const nextSignupEmails = already ? signupEmails : [emailLc, ...signupEmails].slice(0, 5000);

      const recentSignups: any[] = Array.isArray(stats.recentSignups) ? stats.recentSignups : [];
      const alreadyInRecent = recentSignups.some((s) => String(s?.email || "").toLowerCase().trim() === emailLc);
      const nextRecentSignups = alreadyInRecent ? recentSignups : [{ email: emailLc, createdAt: nowIso }, ...recentSignups].slice(0, 100);

      const nextStats = {
        ...stats,
        signupEmails: nextSignupEmails,
        recentSignups: nextRecentSignups,
        // keep signups consistent with unique emails
        signupsUnique: nextSignupEmails.length,
        signups: nextSignupEmails.length,
        lastUpdated: nowIso,
      };
      await upsertAppState(statsKey, nextStats);
    } catch {
      // best-effort
    }

    // We try magiclink first; if it fails (new user), fallback to signup link.
    // IMPORTANT: We prefer sending a custom-domain callback link based on `hashed_token` so we don't
    // depend on Supabase `redirect_to` allowlisting (otherwise Supabase can fallback to Site URL like app.ecomefficiency.com).
    let actionLink = "";
    let tokenHash = "";
    let verificationType: "magiclink" | "signup" = "magiclink";
    try {
      const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (error) throw error;
      actionLink = String((data as any)?.properties?.action_link || "");
      tokenHash = String((data as any)?.properties?.hashed_token || "");
      verificationType =
        String((data as any)?.properties?.verification_type || "magiclink") === "signup" ? "signup" : "magiclink";
    } catch {
      try {
        const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
          type: "signup",
          email,
          options: { redirectTo },
        });
        if (!error) {
          actionLink = String((data as any)?.properties?.action_link || "");
          tokenHash = String((data as any)?.properties?.hashed_token || "");
          verificationType = "signup";
        }
      } catch {}
    }

    const directCallbackLink =
      tokenHash && verificationType
        ? `${origin}/signin?next=${encodeURIComponent(afterSignIn)}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(
            verificationType
          )}`
        : "";
    const finalLink = directCallbackLink || actionLink;

    if (finalLink) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sendWithDomain = async (domain: string) => {
        const fromEmail = makeFromEmail(domain);
        await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: email,
          subject: `Sign in to ${saasName}`,
          html: htmlEmail({ saasName, link: finalLink, buttonColor: buttonColor, buttonColorDark: buttonColorDark }),
          text: `Sign in to ${saasName}\n\nClick this link to sign in: ${finalLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this link, you can safely ignore this email.`,
          ...(isValidEmail(supportEmailCfg) ? { replyTo: supportEmailCfg } : {}),
          headers: {
            "X-Entity-Ref-ID": `${slug}-${Date.now()}`,
            "List-Unsubscribe": `<mailto:${fromEmail}?subject=unsubscribe>`,
          },
          tags: [
            { name: "category", value: "authentication" },
            { name: "type", value: "magic-link" },
          ],
        });
      };

      try {
        await sendWithDomain(primarySenderDomain);
      } catch {
        // Fallback only if different (keeps login working while domain is being verified)
        if (fallbackSenderDomain && fallbackSenderDomain !== primarySenderDomain) {
          try {
            await sendWithDomain(fallbackSenderDomain);
          } catch {
            // best-effort: ignore
          }
        }
      }
    }

    // Always return OK to prevent email enumeration / abuse signals.
    return NextResponse.json({ ok: true, queued: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "unknown_error", detail: e?.message || String(e) }, { status: 500 });
  }
}

