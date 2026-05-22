import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";

const PIN_KEY_PREFIX = "ee_hf_access_pin:";

type StoredPinValue = {
  hash?: string;
  custom?: boolean;
  updated_at?: string;
};

function pinSecret(): string {
  return (
    process.env.HIGGSFIELD_PIN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "ee-hf-pin-fallback"
  );
}

/** Stable unique 4-digit code per email (not shared across users). */
export function deriveDefaultAccessPin(email: string): string {
  const normalized = email.toLowerCase().trim();
  const digest = createHmac("sha256", pinSecret())
    .update(`ee-hf-default-pin:v1|${normalized}`)
    .digest();
  const n = digest.readUInt32BE(0) % 10000;
  return String(n).padStart(4, "0");
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

async function getStoredPinRecord(email: string): Promise<StoredPinValue | null> {
  if (!supabaseAdmin) return null;
  const key = portalKey(email);
  const { data } = await supabaseAdmin
    .from("portal_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = (data as { value?: StoredPinValue } | null)?.value;
  if (!value || typeof value.hash !== "string") return null;
  return value;
}

export async function getStoredPinHash(email: string): Promise<string | null> {
  const rec = await getStoredPinRecord(email);
  return rec?.hash || null;
}

export async function hasCustomAccessPin(email: string): Promise<boolean> {
  const hash = await getStoredPinHash(email);
  return !!hash;
}

export async function getAccessPinForDisplay(
  email: string
): Promise<{ pin: string; has_custom_pin: boolean }> {
  const custom = await hasCustomAccessPin(email);
  if (custom) {
    return { pin: "", has_custom_pin: true };
  }
  return {
    pin: deriveDefaultAccessPin(email),
    has_custom_pin: false,
  };
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
      value: {
        hash,
        custom: true,
        updated_at: new Date().toISOString(),
      },
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
    : hashAccessPin(email, deriveDefaultAccessPin(email));
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
