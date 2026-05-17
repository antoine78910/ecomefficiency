/**
 * Client-side device fingerprint (FingerprintJS + AdsPower-style signals).
 * Trio fort : WebGL unmasked + AudioContext + Canvas. IP/VPN ne change pas l’empreinte.
 */

export const DEVICE_FINGERPRINT_VERSION = "v4";

export type DeviceFingerprintSignals = {
  screen?: string;
  screenDetail?: string;
  colorDepth?: number;
  devicePixelRatio?: number;
  webgl?: string;
  webglVendor?: string;
  webglRenderer?: string;
  webglUnmaskedVendor?: string;
  webglUnmaskedRenderer?: string;
  timezone?: string;
  languages?: string;
  platform?: string;
  userAgent?: string;
  chromeVersion?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  canvasHash?: string;
  audioHash?: string;
  audioSampleRate?: number;
  fontsHash?: string;
  fontsCount?: number;
};

export type DeviceFingerprintPayload = {
  fingerprint: string;
  fingerprint_version: string;
  visitor_id?: string;
  confidence?: number;
  signals?: DeviceFingerprintSignals;
};

const CACHE_KEY = "ee_device_fingerprint_v4";

let inflight: Promise<DeviceFingerprintPayload | null> | null = null;

const FONT_PROBE_LIST = [
  "Arial",
  "Arial Black",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Consolas",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Impact",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Microsoft Sans Serif",
  "Palatino Linotype",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Menlo",
  "Monaco",
  "SF Pro Display",
  "PingFang SC",
  "Helvetica Neue",
];

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle || !window.TextEncoder) return "";
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseChromeVersion(userAgent: string): string {
  const m = userAgent.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+){0,3})/i);
  return m?.[1] || "";
}

type WebGLInfo = {
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
};

function collectWebGLInfo(): WebGLInfo {
  const empty = { vendor: "", renderer: "", unmaskedVendor: "", unmaskedRenderer: "" };
  if (typeof document === "undefined") return empty;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return empty;

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = String(gl.getParameter(gl.VENDOR) || "");
    const renderer = String(gl.getParameter(gl.RENDERER) || "");
    const unmaskedVendor = dbg
      ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "")
      : vendor;
    const unmaskedRenderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
      : renderer;

    return {
      vendor: vendor.slice(0, 120),
      renderer: renderer.slice(0, 160),
      unmaskedVendor: unmaskedVendor.slice(0, 120),
      unmaskedRenderer: unmaskedRenderer.slice(0, 200),
    };
  } catch {
    return empty;
  }
}

function collectScreenSignals(): { screen: string; screenDetail: string } {
  if (typeof window === "undefined") return { screen: "", screenDetail: "" };
  const s = window.screen;
  const screen = `${s?.width || 0}x${s?.height || 0}`;
  const outer = `${window.outerWidth || 0}x${window.outerHeight || 0}`;
  const inner = `${window.innerWidth || 0}x${window.innerHeight || 0}`;
  const avail = `${s?.availWidth || 0}x${s?.availHeight || 0}`;
  const toolbarRatio =
    window.outerHeight > 0 ? (window.innerHeight / window.outerHeight).toFixed(3) : "";
  const screenDetail = `outer:${outer}|inner:${inner}|avail:${avail}|ratio:${toolbarRatio}`;
  return { screen, screenDetail };
}

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

async function collectAudioFingerprint(): Promise<{ audioHash: string; sampleRate: number }> {
  if (typeof window === "undefined") return { audioHash: "", sampleRate: 0 };
  try {
    const Ctx =
      window.OfflineAudioContext ||
      (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return { audioHash: "", sampleRate: 0 };

    const sampleRate = 44100;
    const offline = new Ctx(1, sampleRate, sampleRate);
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
    if (!channel?.length) return { audioHash: "", sampleRate };

    let sum = 0;
    const start = Math.min(4500, channel.length - 1);
    const end = Math.min(5000, channel.length);
    for (let i = start; i < end; i++) sum += Math.abs(channel[i]);

    const audioHash = await sha256Hex(
      [
        String(sampleRate),
        String(sum),
        String(comp.threshold.value),
        String(comp.knee.value),
        String(comp.ratio.value),
        String(comp.attack.value),
        String(comp.release.value),
      ].join("|")
    );

    return { audioHash, sampleRate };
  } catch {
    return { audioHash: "", sampleRate: 0 };
  }
}

async function collectFontsHash(): Promise<{ fontsHash: string; fontsCount: number }> {
  if (typeof document === "undefined") return { fontsHash: "", fontsCount: 0 };
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { fontsHash: "", fontsCount: 0 };

    const testString = "mmmmmmmmmmlli";
    const baseFonts = ["monospace", "sans-serif", "serif"] as const;
    const baseWidths: Record<string, number> = {};

    for (const base of baseFonts) {
      ctx.font = `72px ${base}`;
      baseWidths[base] = ctx.measureText(testString).width;
    }

    const detected: string[] = [];
    for (const font of FONT_PROBE_LIST) {
      let match = false;
      for (const base of baseFonts) {
        ctx.font = `72px "${font}",${base}`;
        const w = ctx.measureText(testString).width;
        if (w !== baseWidths[base]) {
          match = true;
          break;
        }
      }
      if (match) detected.push(font);
    }

    const fontsHash = await sha256Hex(detected.sort().join(","));
    return { fontsHash, fontsCount: detected.length };
  } catch {
    return { fontsHash: "", fontsCount: 0 };
  }
}

function collectNavigatorSignals(): Pick<
  DeviceFingerprintSignals,
  "platform" | "languages" | "hardwareConcurrency" | "deviceMemory" | "userAgent" | "chromeVersion"
> {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const userAgent = String(nav.userAgent || "");
  return {
    platform: String(nav.platform || ""),
    languages: (nav.languages || []).join(","),
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: (nav as Navigator & { deviceMemory?: number }).deviceMemory,
    userAgent: userAgent.slice(0, 512),
    chromeVersion: parseChromeVersion(userAgent),
  };
}

async function buildCoreSignals(): Promise<{
  canvasHash: string;
  audioHash: string;
  audioSampleRate: number;
  fontsHash: string;
  fontsCount: number;
  webgl: WebGLInfo;
  screen: string;
  screenDetail: string;
  nav: ReturnType<typeof collectNavigatorSignals>;
}> {
  const [canvasHash, audio, fonts, webgl] = await Promise.all([
    collectCanvasHash(),
    collectAudioFingerprint(),
    collectFontsHash(),
    Promise.resolve(collectWebGLInfo()),
  ]);
  const { screen, screenDetail } = collectScreenSignals();
  const nav = collectNavigatorSignals();
  return {
    canvasHash,
    audioHash: audio.audioHash,
    audioSampleRate: audio.sampleRate,
    fontsHash: fonts.fontsHash,
    fontsCount: fonts.fontsCount,
    webgl,
    screen,
    screenDetail,
    nav,
  };
}

async function buildFallbackFingerprint(): Promise<DeviceFingerprintPayload | null> {
  if (typeof window === "undefined") return null;
  try {
    const core = await buildCoreSignals();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const raw = [
      "v1_fallback",
      core.canvasHash,
      core.audioHash,
      core.webgl.unmaskedRenderer,
      core.webgl.unmaskedVendor,
      core.fontsHash,
      core.nav.userAgent,
      core.nav.chromeVersion,
      core.screenDetail,
      tz,
    ].join("|");
    const hash = await sha256Hex(raw);
    if (!hash) return null;
    return {
      fingerprint: `v1_${hash.slice(0, 32)}`,
      fingerprint_version: "v1",
      signals: {
        ...core.nav,
        screen: core.screen,
        screenDetail: core.screenDetail,
        timezone: tz,
        webgl: core.webgl.unmaskedRenderer,
        webglVendor: core.webgl.vendor,
        webglRenderer: core.webgl.renderer,
        webglUnmaskedVendor: core.webgl.unmaskedVendor,
        webglUnmaskedRenderer: core.webgl.unmaskedRenderer,
        canvasHash: core.canvasHash || undefined,
        audioHash: core.audioHash || undefined,
        audioSampleRate: core.audioSampleRate || undefined,
        fontsHash: core.fontsHash || undefined,
        fontsCount: core.fontsCount,
        colorDepth: window.screen?.colorDepth,
        devicePixelRatio: window.devicePixelRatio,
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
        const [core, fpjsResult] = await Promise.all([
          buildCoreSignals(),
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

        const visitorId = fpjsResult?.visitorId || "";
        const tz =
          String(
            (fpjsResult?.components as Record<string, { value?: unknown }>)?.timezone?.value || ""
          ) || Intl.DateTimeFormat().resolvedOptions().timeZone;

        const compositeRaw = [
          DEVICE_FINGERPRINT_VERSION,
          visitorId,
          core.canvasHash,
          core.audioHash,
          String(core.audioSampleRate),
          core.webgl.unmaskedVendor,
          core.webgl.unmaskedRenderer,
          core.fontsHash,
          core.nav.chromeVersion,
          core.nav.userAgent,
          core.screenDetail,
          core.nav.platform,
          String(core.nav.hardwareConcurrency),
          String(core.nav.deviceMemory),
        ].join("|");

        const compositeHash = await sha256Hex(compositeRaw);
        if (!compositeHash) return buildFallbackFingerprint();

        const payload: DeviceFingerprintPayload = {
          fingerprint: `v4_${compositeHash.slice(0, 32)}`,
          fingerprint_version: DEVICE_FINGERPRINT_VERSION,
          visitor_id: visitorId || undefined,
          confidence:
            typeof fpjsResult?.confidence?.score === "number"
              ? fpjsResult.confidence.score
              : undefined,
          signals: {
            ...core.nav,
            screen: core.screen,
            screenDetail: core.screenDetail,
            colorDepth: window.screen?.colorDepth,
            devicePixelRatio: window.devicePixelRatio,
            timezone: tz,
            webgl: core.webgl.unmaskedRenderer,
            webglVendor: core.webgl.vendor,
            webglRenderer: core.webgl.renderer,
            webglUnmaskedVendor: core.webgl.unmaskedVendor,
            webglUnmaskedRenderer: core.webgl.unmaskedRenderer,
            canvasHash: core.canvasHash || undefined,
            audioHash: core.audioHash || undefined,
            audioSampleRate: core.audioSampleRate || undefined,
            fontsHash: core.fontsHash || undefined,
            fontsCount: core.fontsCount,
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
  const s = payload.signals;
  return {
    device_fingerprint: payload.fingerprint,
    fingerprint_version: payload.fingerprint_version,
    fp_visitor_id: payload.visitor_id || null,
    fp_confidence: payload.confidence ?? null,
    fp_signals: s || null,
    fp_canvas_hash: s?.canvasHash || null,
    fp_audio_hash: s?.audioHash || null,
    fp_chrome_version: s?.chromeVersion || null,
    fp_webgl_unmasked: s?.webglUnmaskedRenderer || null,
    fp_fonts_count: s?.fontsCount ?? null,
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
