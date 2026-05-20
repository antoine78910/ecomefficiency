import { supabaseAdmin } from "@/integrations/supabase/server";

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

async function loadPartnerBySlug(slug: string, domain: string) {
  const cfgKey = `partner_config:${slug}`;
  const { data: cfgRow } = await supabaseAdmin!.from("portal_state").select("value").eq("key", cfgKey).maybeSingle();
  const cfg = parseMaybeJson((cfgRow as any)?.value) || {};
  return { domain, slug, cfg };
}

export async function readPartnerForDomain(domainParam: string): Promise<{
  domain: string;
  slug?: string;
  cfg?: any;
}> {
  const domain = cleanDomain(domainParam);
  if (!domain || !supabaseAdmin) return { domain };

  try {
    const mapKey = `partner_domain:${domain}`;
    const { data: mapRow } = await supabaseAdmin.from("portal_state").select("value").eq("key", mapKey).maybeSingle();
    const mapping = parseMaybeJson((mapRow as any)?.value) as any;
    const slug = mapping?.slug ? String(mapping.slug) : "";
    if (slug) return loadPartnerBySlug(slug, domain);

    const marketingKey = `partner_marketing_host:${domain}`;
    const { data: mRow } = await supabaseAdmin.from("portal_state").select("value").eq("key", marketingKey).maybeSingle();
    const m = parseMaybeJson((mRow as any)?.value) as any;
    const mSlug = m?.slug ? String(m.slug) : "";
    if (mSlug) return loadPartnerBySlug(mSlug, domain);

    return { domain };
  } catch {
    return { domain };
  }
}

