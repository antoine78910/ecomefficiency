import { createHmac, timingSafeEqual } from "crypto";

const SESSION_VERSION = 1;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sessionSecret(): string {
  return (
    process.env.HIGGSFIELD_SESSION_SECRET ||
    process.env.HIGGSFIELD_PIN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "ee-hf-session-fallback"
  );
}

function signPayload(encoded: string): string {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

export function issueHiggsfieldAccessToken(email: string): string {
  const payload = {
    v: SESSION_VERSION,
    email: email.toLowerCase().trim(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifyHiggsfieldAccessToken(
  token: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (!token || !email) return false;
  const parts = String(token).split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;
  const expected = signPayload(encoded);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    if (sig !== expected) return false;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as { v?: number; email?: string; exp?: number };
    if (payload.v !== SESSION_VERSION) return false;
    if (!payload.exp || Date.now() > payload.exp) return false;
    return (
      String(payload.email || "").toLowerCase() ===
      String(email || "").toLowerCase().trim()
    );
  } catch {
    return false;
  }
}
