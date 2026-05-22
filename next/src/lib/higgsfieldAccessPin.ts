import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const HIGGSFIELD_DEFAULT_ACCESS_PIN =
  (process.env.HIGGSFIELD_DEFAULT_ACCESS_PIN || "4821").replace(/\D/g, "").slice(0, 4) ||
  "4821";

const PIN_KEY_PREFIX = "ee_hf_access_pin:";

function pinSecret(): string {
  return (
    process.env.HIGGSFIELD_PIN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "ee-hf-pin-fallback"
  );
}

export function normalizeAccessPin(input: unknown): string | null {
  const s = String(input ?? "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(s)) return null;
  return s;
}

export function hashAccessPin(email: string, pin: string): string {
  return createHmac("sha256", pinSecret())
    .update(`${email.toLowerCase().trim()}|${pin}`)
    .digest("hex");
}

function portalKey(email: string): string {
  return PIN_KEY_PREFIX + email.toLowerCase().trim();
}

export async function getStoredPinHash(email: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const key = portalKey(email);
  const { data } = await supabaseAdmin
    .from("portal_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = (data as { value?: { hash?: string } } | null)?.value;
  const hash = value && typeof value.hash === "string" ? value.hash : null;
  return hash || null;
}

export async function hasCustomAccessPin(email: string): Promise<boolean> {
  const hash = await getStoredPinHash(email);
  return !!hash;
}

export async function setCustomAccessPin(
  email: string,
  pin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseAdmin) return { ok: false, error: "not_configured" };
  const normalized = normalizeAccessPin(pin);
  if (!normalized) return { ok: false, error: "invalid_pin" };
  const hash = hashAccessPin(email, normalized);
  const key = portalKey(email);
  await supabaseAdmin.from("portal_state").upsert(
    {
      key,
      value: { hash, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" as "key" }
  );
  return { ok: true };
}

export async function verifyAccessPin(
  email: string,
  pin: unknown
): Promise<boolean> {
  const normalized = normalizeAccessPin(pin);
  if (!normalized) return false;
  const stored = await getStoredPinHash(email);
  const expectedHash = stored
    ? stored
    : hashAccessPin(email, HIGGSFIELD_DEFAULT_ACCESS_PIN);
  const attempt = hashAccessPin(email, normalized);
  try {
    return timingSafeEqual(
      Buffer.from(attempt, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}
