import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { getAdminPanelToken } from "@/lib/adminSecrets";

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    "dev_insecure_admin_session_secret"
  );
}

export async function requireAdminSession() {
  const cookieStore = await cookies();

  // Legacy/admin token flow still used by some admin routes.
  const expectedToken = getAdminPanelToken();
  const tokenCookie = String(cookieStore.get("ee_admin_token")?.value || "");
  if (expectedToken && tokenCookie && tokenCookie === expectedToken) {
    return { ok: true as const };
  }

  // Signed admin session flow from /api/admin/auth/login.
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie?.value) return { ok: false as const, status: 401 };

  const allowedEmail = (process.env.ADMIN_EMAIL || "anto.delbos@gmail.com").toLowerCase().trim();
  const secret = getAdminSessionSecret();

  try {
    const raw = String(sessionCookie.value || "");
    const [payloadB64, sig] = raw.split(".", 2);
    if (!payloadB64 || !sig) return { ok: false as const, status: 401 };
    const expectedSig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
    if (sig !== expectedSig) return { ok: false as const, status: 401 };

    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr || "{}") as { email?: string; exp?: number };
    const exp = Number(payload?.exp || 0);
    const email = String(payload?.email || "").toLowerCase().trim();
    if (!email || email !== allowedEmail) return { ok: false as const, status: 401 };
    if (!exp || Date.now() > exp) return { ok: false as const, status: 401 };
  } catch {
    return { ok: false as const, status: 401 };
  }

  return { ok: true as const };
}

