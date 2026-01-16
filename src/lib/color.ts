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
  const [rs, gs, bs] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// 50/50 blend
export function mixHex(a: string, b: string, t = 0.5) {
  const { r: r1, g: g1, b: b1 } = hexToRgb(a);
  const { r: r2, g: g2, b: b2 } = hexToRgb(b);
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const bl = Math.round(b1 * (1 - t) + b2 * t);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(bl)}`;
}

export function hexWithAlpha(hex: string, alpha01: number) {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, Number(alpha01)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function bestTextColorOn(bgHex: string) {
  const lum = relativeLuminance(bgHex);
  return lum > 0.5 ? "#000000" : "#ffffff";
}
