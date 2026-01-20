import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { trackBrevoEvent, upsertBrevoContactToList } from "@/lib/brevo";

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

function resolveTenantSlugFromHost(hostname: string, mappedSlug: string | null) {
  const h = cleanDomain(hostname);
  if (!h) return null;

  // Known first-party hosts
  if (h === "ecomefficiency.com") return "ecomefficiency";
  if (h.endsWith(".ecomefficiency.com")) {
    if (h.startsWith("partners.")) return "partners";
    if (h.startsWith("app.")) return "ecomefficiency";
    if (h.startsWith("tools.")) return "ecomefficiency";
    // fallback to main tenant for other subdomains
    return "ecomefficiency";
  }

  // Custom domains: use mapping (partner slug)
  const slug = String(mappedSlug || "").trim().toLowerCase();
  return slug ? slug : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });
    }

    // Build SSR Supabase client from request cookies (to read current user)
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        // We don't need to mutate cookies in this route.
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const host = cleanDomain(hostHeader);
    if (!host) return NextResponse.json({ ok: true, skipped: true, reason: "missing_host" }, { status: 200 });

    // Resolve tenant slug for custom domains via app_state mapping (already used elsewhere)
    let mappedSlug: string | null = null;
    try {
      const mapKey = `partner_domain:${host}`;
      const { data: mapRow } = await supabaseAdmin.from("app_state").select("value").eq("key", mapKey).maybeSingle();
      const mapping = parseMaybeJson((mapRow as any)?.value) as any;
      const s = String(mapping?.slug || "").trim().toLowerCase();
      mappedSlug = s || null;
    } catch {}

    const tenantSlug = resolveTenantSlugFromHost(host, mappedSlug);
    if (!tenantSlug) return NextResponse.json({ ok: true, skipped: true, reason: "unknown_tenant" }, { status: 200 });

    // Resolve tenant-specific Brevo list id (optional)
    let brevoListId: number | null = null;
    try {
      if (tenantSlug === "ecomefficiency") {
        const v = Number(process.env.BREVO_MAIN_LIST_ID || "");
        brevoListId = Number.isFinite(v) && v > 0 ? v : null;
      } else if (tenantSlug === "partners") {
        const v = Number(process.env.BREVO_PARTNERS_LIST_ID || "");
        brevoListId = Number.isFinite(v) && v > 0 ? v : null;
      } else {
        const cfgKey = `partner_config:${tenantSlug}`;
        const { data: cfgRow } = await supabaseAdmin.from("app_state").select("value").eq("key", cfgKey).maybeSingle();
        const cfg = (parseMaybeJson((cfgRow as any)?.value) as any) || {};
        const v = Number(cfg?.brevoListId ?? cfg?.brevo_list_id ?? "");
        brevoListId = Number.isFinite(v) && v > 0 ? v : null;
      }
    } catch {}

    // Ensure tenant row exists (idempotent)
    const { data: tenantRow, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .upsert({ slug: tenantSlug }, { onConflict: "slug" as any })
      .select("id, slug")
      .maybeSingle();
    if (tenantErr || !tenantRow?.id) {
      return NextResponse.json({ ok: false, error: "tenant_upsert_failed" }, { status: 500 });
    }

    // Ensure membership (one tenant per user)
    const { data: existingMembership } = await supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership?.tenant_id) {
      if (String(existingMembership.tenant_id) !== String(tenantRow.id)) {
        return NextResponse.json(
          { ok: false, error: "tenant_mismatch", tenantSlug, host },
          { status: 403 }
        );
      }
      // best-effort: keep Brevo split/segmented per tenant
      try {
        if (user.email) {
          if (brevoListId) {
            await upsertBrevoContactToList({
              email: user.email,
              listId: brevoListId,
              attributes: { WL_TENANT: tenantSlug, WL_HOST: host },
            });
          }
          await trackBrevoEvent({
            email: user.email,
            eventName: "tenant_session",
            eventProps: { tenant: tenantSlug, host },
            contactProps: { WL_TENANT: tenantSlug, WL_HOST: host },
          });
        }
      } catch {}
      return NextResponse.json({ ok: true, tenantSlug, status: "existing" }, { status: 200 });
    }

    const { error: insertErr } = await supabaseAdmin.from("tenant_memberships").insert({
      tenant_id: tenantRow.id,
      user_id: user.id,
      role: "member",
    });
    if (insertErr) {
      // If unique constraint raced, treat as ok and re-check
      const msg = String((insertErr as any)?.message || "");
      if (!/unique|duplicate/i.test(msg)) {
        return NextResponse.json({ ok: false, error: "membership_insert_failed" }, { status: 500 });
      }
    }

    // best-effort: keep Brevo split/segmented per tenant
    try {
      if (user.email) {
        if (brevoListId) {
          await upsertBrevoContactToList({
            email: user.email,
            listId: brevoListId,
            attributes: { WL_TENANT: tenantSlug, WL_HOST: host },
          });
        }
        await trackBrevoEvent({
          email: user.email,
          eventName: "tenant_assigned",
          eventProps: { tenant: tenantSlug, host },
          contactProps: { WL_TENANT: tenantSlug, WL_HOST: host },
        });
      }
    } catch {}

    return NextResponse.json({ ok: true, tenantSlug, status: "created" }, { status: 200 });
  } catch (e: any) {
    console.error("[api/tenant/ensure] error:", e?.message || String(e));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

