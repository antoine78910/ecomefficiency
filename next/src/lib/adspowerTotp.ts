import { generateSync } from "otplib";

/** Standard Google Authenticator / AdsPower step (seconds). */
export const ADSPOWER_TOTP_PERIOD_SEC = 30;

/** Min seconds left in the 30s window before returning (0 = return immediately). */
export const ADSPOWER_TOTP_MIN_VALID_SEC = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Seconds remaining until the TOTP step rolls (1..period). */
export function totpSecondsLeftInPeriod(epochSec: number, period = ADSPOWER_TOTP_PERIOD_SEC): number {
  const mod = epochSec % period;
  return mod === 0 ? period : period - mod;
}

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

/**
 * If fewer than `minValidSec` remain in the current 30s window, waits until the next window.
 * With `minValidSec` 0, returns the current code immediately.
 */
export async function getAdspowerTotpPayloadForEmail(
  email: string,
  secrets: Map<string, string>,
  opts?: { minValidSec?: number; period?: number }
): Promise<{ code: string; validForSeconds: number; validUntilUnix: number } | null> {
  const key = String(email || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  const secret = secrets.get(key);
  if (!secret) return null;

  const period = opts?.period ?? ADSPOWER_TOTP_PERIOD_SEC;
  const minValidSec = opts?.minValidSec ?? ADSPOWER_TOTP_MIN_VALID_SEC;

  try {
    let epoch = Math.floor(Date.now() / 1000);
    let left = totpSecondsLeftInPeriod(epoch, period);
    if (left < minValidSec) {
      await sleep((left + 1) * 1000);
    }
    epoch = Math.floor(Date.now() / 1000);
    const code = generateSync({ secret, strategy: "totp", period });
    left = totpSecondsLeftInPeriod(epoch, period);
    const validUntilUnix = epoch + left;
    return { code, validForSeconds: left, validUntilUnix };
  } catch {
    return null;
  }
}
