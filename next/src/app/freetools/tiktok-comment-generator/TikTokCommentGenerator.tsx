"use client";

import * as React from "react";
import { Copy, Download, ShieldCheck, Sparkles, Upload, UserRound, Users } from "lucide-react";

function clampText(input: string, max = 280) {
  const s = String(input || "").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function slugifyName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function downloadPngFromSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (!png) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  };
  img.src = url;
}

function escapeXmlText(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXmlAttr(input: string) {
  // for href="" etc
  return escapeXmlText(input);
}

function toSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getCanvasContext() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  return ctx;
}

function measureTextWidth(text: string, font: string) {
  try {
    const ctx = getCanvasContext();
    if (!ctx) return text.length * 12;
    ctx.font = font;
    return ctx.measureText(text).width;
  } catch {
    return text.length * 12;
  }
}

function wrapTextLines(text: string, maxWidth: number, font: string, maxLines = 3) {
  const cleaned = clampText(text || "", 220) || "Write any comment and see what happens 😊";
  const words = cleaned.split(/\s+/g).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (measureTextWidth(next, font) <= maxWidth || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  // if overflow, clamp last line
  if (lines.length === maxLines && words.length) {
    let last = lines[lines.length - 1] || "";
    while (last && measureTextWidth(`${last}…`, font) > maxWidth) {
      last = last.slice(0, -1);
    }
    if (last !== lines[lines.length - 1]) lines[lines.length - 1] = `${last}…`;
  }
  return lines.slice(0, maxLines);
}

function defaultAvatarDataUrl() {
  // matches the grey placeholder in the reference screenshot
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="44" fill="#d1d5db"/>
  <circle cx="40" cy="48" r="18" fill="#6b7280" opacity="0.55"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildTikTokReplySvg({
  username,
  certified,
  comment,
  avatarSrc,
}: {
  username: string;
  certified: boolean;
  comment: string;
  avatarSrc: string;
}) {
  const safeName = clampText(username || "username", 22) || "username";
  const prefix = `Reply to ${safeName}'s`;
  const suffix = "comment";

  const w = 1000;
  const h = 360;

  const bubbleX = 60;
  const bubbleY = 28;
  const bubbleW = 880;
  const bubbleH = 260;
  const r = 22;

  // smaller tail like the reference
  const tailStartX = bubbleX + 138;
  const tailTipX = bubbleX + 42;
  const tailTipY = bubbleY + bubbleH + 40;

  const avatarCx = bubbleX + 80;
  const avatarCy = bubbleY + 86;
  const avatarR = 34;

  const contentX = bubbleX + 138;
  const headerY = bubbleY + 68;

  const headerFont = '700 26px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
  const prefixWidth = measureTextWidth(prefix, headerFont);

  const badgeR = 11;
  const badgeCx = contentX + prefixWidth + 20 + badgeR;
  const badgeCy = headerY - 12;
  const suffixX = badgeCx + badgeR + 16;

  const bodyFont = '900 52px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
  const bodyMaxWidth = bubbleX + bubbleW - 44 - contentX;
  const bodyLines = wrapTextLines(comment, bodyMaxWidth, bodyFont, 3);
  const bodyStartY = bubbleY + 152;
  const lineH = 58;

  const bubblePath = [
    `M ${bubbleX + r} ${bubbleY}`,
    `H ${bubbleX + bubbleW - r}`,
    `Q ${bubbleX + bubbleW} ${bubbleY} ${bubbleX + bubbleW} ${bubbleY + r}`,
    `V ${bubbleY + bubbleH - r}`,
    `Q ${bubbleX + bubbleW} ${bubbleY + bubbleH} ${bubbleX + bubbleW - r} ${bubbleY + bubbleH}`,
    `H ${tailStartX}`,
    `L ${tailTipX} ${tailTipY}`,
    `L ${tailTipX + 22} ${bubbleY + bubbleH}`,
    `H ${bubbleX + r}`,
    `Q ${bubbleX} ${bubbleY + bubbleH} ${bubbleX} ${bubbleY + bubbleH - r}`,
    `V ${bubbleY + r}`,
    `Q ${bubbleX} ${bubbleY} ${bubbleX + r} ${bubbleY}`,
    "Z",
  ].join(" ");

  const headerPrefixFill = "#6b7280";
  const headerSuffixFill = "#9ca3af";
  const bubbleTextFill = "#0b0b10";
  const bgFill = "#0b0b10";
  const verifiedBlue = "#53bde8";

  const avatarHref = escapeXmlAttr(avatarSrc || defaultAvatarDataUrl());

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="black" flood-opacity="0.35"/>
    </filter>
    <clipPath id="avatarClip">
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}"/>
    </clipPath>
  </defs>

  <rect width="${w}" height="${h}" fill="${bgFill}"/>

  <g filter="url(#shadow)">
    <path d="${bubblePath}" fill="#ffffff"/>
  </g>

  <g clip-path="url(#avatarClip)">
    <image href="${avatarHref}" x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" preserveAspectRatio="xMidYMid slice" />
  </g>

  <text x="${contentX}" y="${headerY}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" font-weight="700" fill="${headerPrefixFill}">${escapeXmlText(prefix)}</text>

  ${
    certified
      ? `
  <g>
    <circle cx="${badgeCx}" cy="${badgeCy}" r="${badgeR}" fill="${verifiedBlue}"/>
    <path d="M ${badgeCx - 6.2} ${badgeCy + 0.2} L ${badgeCx - 1.6} ${badgeCy + 4.8} L ${badgeCx + 7.2} ${badgeCy - 4.8}" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
`
      : ""
  }

  <text x="${certified ? suffixX : contentX + prefixWidth + 18}" y="${headerY}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" font-weight="700" fill="${headerSuffixFill}">${escapeXmlText(suffix)}</text>

  ${bodyLines
    .map((line, idx) => {
      const y = bodyStartY + idx * lineH;
      return `<text x="${contentX}" y="${y}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="52" font-weight="900" fill="${bubbleTextFill}">${escapeXmlText(line)}</text>`;
    })
    .join("\n")}
</svg>
`;
}

export default function TikTokCommentGenerator() {
  const [certified, setCertified] = React.useState(true);
  const [username, setUsername] = React.useState("username");
  const [commentText, setCommentText] = React.useState("Write any comment and see what happens 😊");
  const [avatarSrc, setAvatarSrc] = React.useState(() => defaultAvatarDataUrl());

  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const copyText = React.useCallback(async (t: string) => {
    const txt = String(t || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // ignore
    }
  }, []);

  const onPickAvatar = React.useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onResetAvatar = React.useCallback(() => {
    setAvatarSrc(defaultAvatarDataUrl());
  }, []);

  const onAvatarFile = React.useCallback((f?: File | null) => {
    if (!f) return;
    if (!/^image\//i.test(f.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === "string" ? reader.result : "";
      if (!res.startsWith("data:image/")) return;
      setAvatarSrc(res);
    };
    reader.readAsDataURL(f);
  }, []);

  const svg = React.useMemo(
    () =>
      buildTikTokReplySvg({
        username,
        certified,
        comment: commentText,
        avatarSrc,
      }),
    [avatarSrc, certified, commentText, username],
  );

  const exportImage = React.useCallback(() => {
    const safeName = clampText(username || "username", 22) || "username";
    downloadPngFromSvg(svg, `tiktok-comment-${slugifyName(safeName) || "export"}.png`);
  }, [svg, username]);

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold">TikTok comment generator</div>
            <div className="text-xs text-gray-400 mt-1">Generate unlimited comments for free. No sign-up.</div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-[11px] text-purple-200">
            <Sparkles className="h-3.5 w-3.5" />
            Unlimited free
          </span>
        </div>

        <div className="mt-6">
          <div className="text-[11px] text-gray-400 font-semibold tracking-wide">COMMENT CONTROLS</div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-200/70" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full h-11 rounded-xl border border-white/10 bg-white/5 text-white px-10 pr-12 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={onPickAvatar}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center text-white/70 transition-colors"
                title="Upload profile photo"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatarFile(e.target.files?.[0] || null)}
              />
            </div>

            <button
              type="button"
              onClick={() => setCertified((s) => !s)}
              className={[
                "h-11 w-11 rounded-xl border inline-flex items-center justify-center transition-colors",
                certified ? "border-purple-500/35 bg-purple-500/10 hover:bg-purple-500/15" : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
              title="Verified badge"
            >
              <ShieldCheck className={["h-4 w-4", certified ? "text-purple-200" : "text-white/60"].join(" ")} />
            </button>

            <button
              type="button"
              onClick={onResetAvatar}
              className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center text-white/70 transition-colors"
              title="Reset profile photo"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              className="w-full bg-transparent text-white text-sm outline-none resize-none leading-relaxed"
            />
            <div className="mt-2 text-right text-[11px] text-white/35">{String(commentText.length)} chars</div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => copyText(commentText)}
              className="flex-1 h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Preview</div>
              <div className="text-xs text-gray-400 mt-1">This is how your generated comment can look on screen.</div>
            </div>
            <button
              type="button"
              onClick={exportImage}
              className="h-10 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              title="Export Image"
            >
              <Download className="h-4 w-4" />
              Export Image
            </button>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6 md:p-10 overflow-hidden">
            <div className="mx-auto max-w-3xl">
              <img src={toSvgDataUrl(svg)} alt="" className="w-full h-auto select-none" draggable={false} />
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Tip: for higher engagement, mix 2–3 question comments with 1–2 “save/pin/follow” comments.
          </div>
        </div>
      </div>
    </div>
  );
}

