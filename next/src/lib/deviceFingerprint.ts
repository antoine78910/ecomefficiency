/**
 * Client-side device fingerprint (FingerprintJS + canvas + AudioContext).
 * Used for account-sharing detection — more reliable than IP alone (VPNs).
 */

export const DEVICE_FINGERPRINT_VERSION = "v3";

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
  /** SHA-256 hex of canvas rendering fingerprint */
  canvasHash?: string;
  /** SHA-256 hex of AudioContext offline render fingerprint */
  audioHash?: string;
};

export type DeviceFingerprintPayload = {
  fingerprint: string;
  fingerprint_version: string;
  visitor_id?: string;
  confidence?: number;
  signals?: DeviceFingerprintSignals;
};

const CACHE_KEY = "ee_device_fingerprint_v3";

let inflight: Promise<DeviceFingerprintPayload | null> | null = null;

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.TextEncoder) return "";
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Canvas 2D render — stable across sessions, hard to spoof without dedicated libs. */
async function collectCanvasHash(): Promise<string> {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = "11pt 'Times New Roman'";
    const txt = "EcomEfficiency canvas 🎨";
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.font = "18pt Arial";
    ctx.fillText(txt, 4, 45);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(255,0,255)";
    ctx.beginPath();
    ctx.arc(50, 25, 18, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return sha256Hex(canvas.toDataURL());
  } catch {
    return "";
  }
}

/** Offline AudioContext sum — stable hardware/audio stack signature. */
async function collectAudioContextHash(): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const Ctx =
      window.OfflineAudioContext ||
      (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return "";

    const offline = new Ctx(1, 44100, 44100);
    const osc = offline.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, offline.currentTime);

    const comp = offline.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-50, offline.currentTime);
    comp.knee.setValueAtTime(40, offline.currentTime);
    comp.ratio.setValueAtTime(12, offline.currentTime);
    comp.attack.setValueAtTime(0, offline.currentTime);
    comp.release.setValueAtTime(0.25, offline.currentTime);

    osc.connect(comp);
    comp.connect(offline.destination);
    osc.start(0);

    const buffer = await offline.startRendering();
    const channel = buffer.getChannelData(0);
    if (!channel?.length) return "";

    let sum = 0;
    const start = Math.min(4500, channel.length - 1);
    const end = Math.min(5000, channel.length);
    for (let i = start; i < end; i++) sum += Math.abs(channel[i]);

    return sha256Hex(
      [
        String(sum),
        String(comp.threshold.value),
        String(comp.knee.value),
        String(comp.ratio.value),
        String(comp.attack.value),
        String(comp.release.value),
      ].join("|")
    );
  } catch {
    return "";
  }
}

async function buildFallbackFingerprint(): Promise<DeviceFingerprintPayload | null> {
  if (typeof window === "undefined") return null;
  try {
    const [canvasHash, audioHash] = await Promise.all([
      collectCanvasHash(),
      collectAudioContextHash(),
    ]);
    const nav = window.navigator;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const screenW = window.screen?.width || 0;
    const screenH = window.screen?.height || 0;
    const pixelRatio = window.devicePixelRatio || 1;
    const raw = [
      "v1_fallback",
      canvasHash,
      audioHash,
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
        canvasHash: canvasHash || undefined,
        audioHash: audioHash || undefined,
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
      if (parsed?.fingerprint && parsed.fingerprint_version === DEVICE_FINGERPRINT_VERSION) {
        return parsed;
      }
    }
  } catch {}

  if (!inflight) {
    inflight = (async () => {
      try {
        const [canvasHash, audioHash, fpjsResult] = await Promise.all([
          collectCanvasHash(),
          collectAudioContextHash(),
          (async () => {
            try {
              const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
              const agent = await FingerprintJS.load();
              return await agent.get();
            } catch {
              return null;
            }
          })(),
        ]);

        const components = (fpjsResult?.components || {}) as Record<string, { value?: unknown }>;
        const screenRes = components.screenResolution?.value;
        const screen =
          Array.isArray(screenRes) && screenRes.length >= 2
            ? `${screenRes[0]}x${screenRes[1]}`
            : String(screenRes || "");

        const webgl =
          String(components.webglRenderer?.value || components.webglVendor?.value || "").slice(0, 160) ||
          undefined;

        const visitorId = fpjsResult?.visitorId || "";
        const compositeRaw = [
          DEVICE_FINGERPRINT_VERSION,
          visitorId,
          canvasHash,
          audioHash,
          webgl || "",
          screen,
        ].join("|");
        const compositeHash = await sha256Hex(compositeRaw);
        if (!compositeHash) {
          return buildFallbackFingerprint();
        }

        const payload: DeviceFingerprintPayload = {
          fingerprint: `v3_${compositeHash.slice(0, 32)}`,
          fingerprint_version: DEVICE_FINGERPRINT_VERSION,
          visitor_id: visitorId || undefined,
          confidence:
            typeof fpjsResult?.confidence?.score === "number"
              ? fpjsResult.confidence.score
              : undefined,
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
            canvasHash: canvasHash || undefined,
            audioHash: audioHash || undefined,
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
    fp_canvas_hash: payload.signals?.canvasHash || null,
    fp_audio_hash: payload.signals?.audioHash || null,
  };
}

export function shortFingerprintLabel(fp: string): string {
  const s = String(fp || "").trim();
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

export function shortHashLabel(hash: string | undefined): string {
  const s = String(hash || "").trim();
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…`;
}
