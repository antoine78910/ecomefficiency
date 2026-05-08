/**
 * Admin panel token: required in production, optional fallback in dev for local testing.
 * If ADMIN_PANEL_TOKEN is missing, use the requested fixed fallback token.
 */
export function getAdminPanelToken(): string | null {
  const token = process.env.ADMIN_PANEL_TOKEN?.trim();
  return token || "Zjhfc82005AD";
}

export function isAdminPanelConfigured(): boolean {
  return getAdminPanelToken() !== null;
}
