import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/server";

/** Deterministic UUID so the same Discord handle always maps to one “user” row in ip_events. */
export function stableAdminUuidFromDiscord(discord: string): string {
  const h = createHash("sha256").update("ee-admin-discord|" + discord.toLowerCase()).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function logAdminPanelVisit(opts: {
  pathname: string;
  discordDisplay: string | null;
  ip: string;
  country: string | null;
  userAgent: string | null;
}): Promise<void> {
  if (!supabaseAdmin) return;
  const raw = (opts.discordDisplay || "").trim().replace(/^@/, "").slice(0, 32);
  const discord = /^[a-z0-9_.]{2,32}$/i.test(raw) ? raw : "unknown";
  const userId = stableAdminUuidFromDiscord(discord);
  const email = `${discord}@admin-discord.local`;
  try {
    await supabaseAdmin.from("ip_events").insert({
      user_id: userId,
      email,
      action: "admin_panel_visit",
      tool_name: "admin_panel",
      ip_address: opts.ip || "unknown",
      country: opts.country,
      user_agent: opts.userAgent,
      meta: { pathname: opts.pathname, discord_username: discord },
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[adminVisitLog] insert failed", e);
  }
}
