/**
 * Admin panel token: required in production, optional fallback in dev for local testing.
 * In production, ADMIN_PANEL_TOKEN must be set in env (e.g. Vercel); no hardcoded fallback.
 */
export function getAdminPanelToken(): string | null {
  const token = process.env.ADMIN_PANEL_TOKEN?.trim();
  if (process.env.NODE_ENV === "production") {
    return token && token.length > 0 ? token : null;
  }
  return token || "Zjhfc82005ad";
}

export function isAdminPanelConfigured(): boolean {
  return getAdminPanelToken() !== null;
}
