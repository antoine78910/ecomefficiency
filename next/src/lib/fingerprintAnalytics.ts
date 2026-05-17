/** Server-safe helpers for ip_events / user_sessions fingerprint fields. */

export type FingerprintSignalsSnapshot = {
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

export type FingerprintDetail = {
  id: string;
  shortLabel: string;
  eventCount: number;
  sessionCount: number;
  lastSeen: string;
  ips: string[];
  signals: FingerprintSignalsSnapshot | null;
};

export function shortFingerprintLabel(fp: string): string {
  const s = String(fp || "").trim();
  if (!s) return "—";
  if (s.length <= 16) return s;
  return `${s.slice(0, 12)}…${s.slice(-4)}`;
}

export function fingerprintFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  const direct = String(m.device_fingerprint || "").trim();
  if (direct) return direct;
  const visitor = String(m.fp_visitor_id || "").trim();
  if (visitor) return visitor.startsWith("v2_") ? visitor : `v2_${visitor}`;
  return null;
}

export function signalsFromMeta(meta: unknown): FingerprintSignalsSnapshot | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const raw = (meta as Record<string, unknown>).fp_signals;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as FingerprintSignalsSnapshot;
}

export function buildFingerprintDetails(
  events: Array<{ ip_address?: string | null; created_at?: string | null; meta?: unknown }>,
  sessions: Array<{
    ip_address?: string | null;
    created_at?: string | null;
    last_activity?: string | null;
    device_fingerprint?: string | null;
  }>
): FingerprintDetail[] {
  const byFp = new Map<
    string,
    { eventCount: number; sessionCount: number; lastMs: number; ips: Set<string>; signals: FingerprintSignalsSnapshot | null }
  >();

  const touch = (fp: string, ip: string, ts: string | null | undefined, kind: "event" | "session", signals: FingerprintSignalsSnapshot | null) => {
    if (!fp) return;
    let row = byFp.get(fp);
    if (!row) {
      row = { eventCount: 0, sessionCount: 0, lastMs: 0, ips: new Set(), signals: null };
      byFp.set(fp, row);
    }
    if (kind === "event") row.eventCount++;
    else row.sessionCount++;
    if (ip && ip !== "unknown") row.ips.add(ip);
    if (signals && !row.signals) row.signals = signals;
    const t = ts ? new Date(ts).getTime() : NaN;
    if (!Number.isNaN(t)) row.lastMs = Math.max(row.lastMs, t);
  };

  for (const ev of events) {
    const fp = fingerprintFromMeta(ev.meta);
    if (!fp) continue;
    touch(fp, String(ev.ip_address || ""), ev.created_at, "event", signalsFromMeta(ev.meta));
  }

  for (const s of sessions) {
    const fp = String(s.device_fingerprint || "").trim();
    if (!fp) continue;
    touch(fp, String(s.ip_address || ""), s.last_activity || s.created_at, "session", null);
  }

  return [...byFp.entries()]
    .map(([id, v]) => ({
      id,
      shortLabel: shortFingerprintLabel(id),
      eventCount: v.eventCount,
      sessionCount: v.sessionCount,
      lastSeen: v.lastMs ? new Date(v.lastMs).toISOString() : "",
      ips: [...v.ips],
      signals: v.signals,
    }))
    .sort((a, b) => new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime());
}
