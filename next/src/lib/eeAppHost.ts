/**
 * Browser hosts where the canonical Ecom Efficiency **workspace** runs (app subdomain / local dev).
 * Partner white-label domains must NOT match — they rely on Connect verification + optional globals.
 */
export function isMainEcomEfficiencyWorkspaceHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = String(window.location.hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
  if (h === "app.ecomefficiency.com") return true;
  if (h === "app.localhost") return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  return false;
}
