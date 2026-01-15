export function normalizeHex(input: string, fallback = "#000000") {
  const v = String(input || "").trim();
  // Accept "#rrggbb", "#rgb", "rrggbb", "rgb"
  const withHash = v.startsWith("#") ? v : (v ? `#${v}` : "");
  if (/^#[0-9a-f]{6}$/i.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(withHash)) {
    const r = withHash[1], g = withHash[2], b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback.toLowerCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex, "#000000").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

// WCAG relative luminance for sRGB
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((v) => v / 255);
  const lin = srgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function bestTextColorOn(hexBackground: string): "#000000" | "#ffffff" {
  // Threshold tuned for typical UI buttons; if background is bright, use black text.
  const lum = relativeLuminance(hexBackground);
  return lum > 0.62 ? "#000000" : "#ffffff";
}

export function mixHex(a: string, b: string, t = 0.5) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(A.r + (B.r - A.r) * t);
  const g = clamp(A.g + (B.g - A.g) * t);
  const bl = clamp(A.b + (B.b - A.b) * t);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(bl)}`;
}

export function hexWithAlpha(hex: string, alpha01: number) {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, Number(alpha01)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}


