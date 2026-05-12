import { cookies, headers } from "next/headers";
import { logAdminPanelVisit } from "@/lib/adminVisitLog";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const h = await headers();
    const c = await cookies();
    const pathname = h.get("x-ee-admin-pathname") || "/admin";
    const discordCookie = c.get("ee_admin_discord_user")?.value || null;
    const xf = h.get("x-forwarded-for") || "";
    const ip = (xf.split(",")[0] || "").trim() || h.get("x-real-ip") || "unknown";
    const country = (h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || "").toUpperCase() || null;
    const ua = h.get("user-agent") || null;
    await logAdminPanelVisit({
      pathname,
      discordDisplay: discordCookie,
      ip,
      country,
      userAgent: ua,
    });
  } catch (e) {
    console.warn("[admin/layout] visit log skipped", e);
  }
  return <>{children}</>;
}
