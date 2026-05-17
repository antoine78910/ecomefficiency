/**
 * Client-side device fingerprint (FingerprintJS + stable hardware/rendering signals).
 * Used for account-sharing detection — more reliable than IP alone (VPNs).
 */

export const DEVICE_FINGERPRINT_VERSION = "v2";

export type DeviceFingerprintSignals = {
  screen?: string;
  colorDepth?: number;
  devicePixelRatio?: number;
  webgl?: string;
  timezone?: string;
  languages?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

export type DeviceFingerprintPayload = {
  fingerprint: string;
  fingerprint_version: string;
  visitor_id?: string;
  confidence?: number;
  signals?: DeviceFingerprintSignals;
};

const CACHE_KEY = "ee_device_fingerprint_v2";

let inflight: Promise<DeviceFingerprintPayload | null> | null = null;

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.TextEncoder) return "";
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildFallbackFingerprint(): Promise<DeviceFingerprintPayload | null> {
  if (typeof window === "undefined") return null;
  try {
    const nav = window.navigator;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const screenW = window.screen?.width || 0;
    const screenH = window.screen?.height || 0;
    const pixelRatio = window.devicePixelRatio || 1;
    const raw = [
      "v1_fallback",
      nav.platform || "",
      nav.language || "",
      (nav.languages || []).join(","),
      nav.userAgent || "",
      tz,
      `${screenW}x${screenH}`,
      String(window.screen?.colorDepth || ""),
      String(pixelRatio),
      String(nav.hardwareConcurrency || ""),
      String((nav as Navigator & { deviceMemory?: number }).deviceMemory || ""),
      String(nav.maxTouchPoints || 0),
    ].join("|");
    const hash = await sha256Hex(raw);
    if (!hash) return null;
    return {
      fingerprint: `v1_${hash.slice(0, 32)}`,
      fingerprint_version: "v1",
      signals: {
        screen: `${screenW}x${screenH}`,
        colorDepth: window.screen?.colorDepth,
        devicePixelRatio: pixelRatio,
        timezone: tz,
        languages: (nav.languages || []).join(","),
        platform: nav.platform || "",
        hardwareConcurrency: nav.hardwareConcurrency,
        deviceMemory: (nav as Navigator & { deviceMemory?: number }).deviceMemory,
      },
    };
  } catch {
    return null;
  }
}

/** Collect fingerprint once per tab (cached in sessionStorage). */
export async function collectDeviceFingerprint(): Promise<DeviceFingerprintPayload | null> {
  if (typeof window === "undefined") return null;

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as DeviceFingerprintPayload;
      if (parsed?.fingerprint) return parsed;
    }
  } catch {}

  if (!inflight) {
    inflight = (async () => {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const agent = await FingerprintJS.load();
        const result = await agent.get();
        const components = result.components as Record<string, { value?: unknown }>;

        const screenRes = components.screenResolution?.value;
        const screen =
          Array.isArray(screenRes) && screenRes.length >= 2
            ? `${screenRes[0]}x${screenRes[1]}`
            : String(screenRes || "");

        const webgl =
          String(components.webglRenderer?.value || components.webglVendor?.value || "").slice(0, 160) ||
          undefined;

        const payload: DeviceFingerprintPayload = {
          fingerprint: `v2_${result.visitorId}`,
          fingerprint_version: DEVICE_FINGERPRINT_VERSION,
          visitor_id: result.visitorId,
          confidence:
            typeof result.confidence?.score === "number" ? result.confidence.score : undefined,
          signals: {
            screen,
            colorDepth:
              typeof components.colorDepth?.value === "number"
                ? components.colorDepth.value
                : window.screen?.colorDepth,
            devicePixelRatio:
              typeof components.devicePixelRatio?.value === "number"
                ? components.devicePixelRatio.value
                : window.devicePixelRatio,
            webgl,
            timezone: String(components.timezone?.value || ""),
            languages: Array.isArray(components.languages?.value)
              ? (components.languages.value as string[]).join(",")
              : "",
            platform: String(components.platform?.value || ""),
            hardwareConcurrency:
              typeof components.hardwareConcurrency?.value === "number"
                ? components.hardwareConcurrency.value
                : navigator.hardwareConcurrency,
            deviceMemory:
              typeof components.deviceMemory?.value === "number"
                ? components.deviceMemory.value
                : (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
          },
        };

        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        } catch {}

        return payload;
      } catch {
        const fallback = await buildFallbackFingerprint();
        if (fallback) {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(fallback));
          } catch {}
        }
        return fallback;
      } finally {
        inflight = null;
      }
    })();
  }

  return inflight;
}

export function getCachedDeviceFingerprint(): DeviceFingerprintPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as DeviceFingerprintPayload;
    return parsed?.fingerprint ? parsed : null;
  } catch {
    return null;
  }
}

/** Meta fields stored on ip_events rows. */
export function fingerprintMetaForEvent(
  payload: DeviceFingerprintPayload | null
): Record<string, unknown> | null {
  if (!payload?.fingerprint) return null;
  return {
    device_fingerprint: payload.fingerprint,
    fingerprint_version: payload.fingerprint_version,
    fp_visitor_id: payload.visitor_id || null,
    fp_confidence: payload.confidence ?? null,
    fp_signals: payload.signals || null,
  };
}

export function shortFingerprintLabel(fp: string): string {
  const s = String(fp || "").trim();
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}
