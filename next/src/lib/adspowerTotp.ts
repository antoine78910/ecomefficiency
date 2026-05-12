import { generateSync } from "otplib";

/**
 * Map login email → Base32 TOTP secret (same as Google Authenticator / AdsPower).
 * Env: ADSPOWER_TOTP_BY_EMAIL_JSON={"admin@ecomefficiency.com":"XXXX"}
 */
export function parseAdspowerTotpSecretsFromEnv(raw: string | undefined): Map<string, string> {
  const m = new Map<string, string>();
  const s = String(raw ?? "").trim();
  if (!s) return m;
  try {
    const obj = JSON.parse(s) as Record<string, unknown>;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return m;
    for (const [k, v] of Object.entries(obj)) {
      const email = String(k || "")
        .trim()
        .toLowerCase();
      const secret = String(v ?? "")
        .trim()
        .replace(/\s/g, "");
      if (email && secret) m.set(email, secret);
    }
  } catch {
    return m;
  }
  return m;
}

export function getAdspowerTotpCodeForEmail(email: string, secrets: Map<string, string>): string | null {
  const key = String(email || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  const secret = secrets.get(key);
  if (!secret) return null;
  try {
    return generateSync({ secret, strategy: "totp" });
  } catch {
    return null;
  }
}
