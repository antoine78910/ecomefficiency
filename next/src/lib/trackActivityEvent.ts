import {
  collectDeviceFingerprint,
  fingerprintMetaForEvent,
  getCachedDeviceFingerprint,
} from "@/lib/deviceFingerprint";

export type TrackActivityBody = {
  user_id: string;
  email?: string | null;
  action: string;
  tool_name?: string | null;
  meta?: Record<string, unknown> | null;
};

/** POST /api/activity/track-event with device fingerprint in meta (VPN-resistant). */
export async function trackActivityEvent(body: TrackActivityBody): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const fp =
      getCachedDeviceFingerprint() || (await collectDeviceFingerprint());
    const fpMeta = fingerprintMetaForEvent(fp);
    const meta = { ...(body.meta || {}), ...(fpMeta || {}) };

    await fetch("/api/activity/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, meta: Object.keys(meta).length ? meta : null }),
    });
  } catch {
    // silent
  }
}
