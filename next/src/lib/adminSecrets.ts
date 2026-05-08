/**
 * Requested fixed admin token used everywhere.
 */
export function getAdminPanelToken(): string | null {
  return "Zjhfc82005AD";
}

export function isAdminPanelConfigured(): boolean {
  return getAdminPanelToken() !== null;
}
