"use client";

import * as React from "react";
import { Copy, Download, Plus, Trash2, Upload, Sparkles, MessageCircleReply, ArrowUp, ArrowDown } from "lucide-react";

type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

type CommentNode = {
  id: string;
  name: string;
  avatarSrc: string; // data url
  timeLabel: string; // e.g. "2h", "Yesterday"
  text: string;
  reaction: ReactionType;
  reactionCount: number;
  replies: CommentNode[];
};

type ExportRatio = "1080x1080" | "1080x1350";

function uid() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (crypto as any).randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function clampText(input: string, max = 360) {
  const s = String(input || "").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
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
  return escapeXmlText(input);
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

function getCanvasContext() {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
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

function wrapTextLines(text: string, maxWidth: number, font: string, maxLines = 4) {
  const cleaned = clampText(text || "", 260) || "Write your comment…";
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
  if (lines.length === maxLines && words.length) {
    let last = lines[lines.length - 1] || "";
    while (last && measureTextWidth(`${last}…`, font) > maxWidth) last = last.slice(0, -1);
    if (last !== lines[lines.length - 1]) lines[lines.length - 1] = `${last}…`;
  }
  return lines.slice(0, maxLines);
}

function initials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
  const a = parts[0]?.slice(0, 1) || "U";
  const b = parts.length > 1 ? parts[parts.length - 1]!.slice(0, 1) : "";
  return (a + b).toUpperCase().slice(0, 2);
}

function avatarDataUrl(seed: string) {
  const s = seed || "user";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 42 + (hash % 40)) % 360;
  const txt = initials(s);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="g" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
        <stop stop-color="hsl(${hueA} 92% 62%)"/>
        <stop offset="1" stop-color="hsl(${hueB} 86% 52%)"/>
      </linearGradient>
    </defs>
    <circle cx="48" cy="48" r="44" fill="url(#g)"/>
    <circle cx="48" cy="48" r="44" fill="rgba(0,0,0,0.06)"/>
    <text x="48" y="58" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="28" text-anchor="middle" fill="white" font-weight="800">${escapeXmlText(
      txt,
    )}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomName() {
  const first = ["Mia", "Sofia", "Chloe", "Emma", "Lena", "Noah", "Leo", "Max", "Ryan", "Alex", "Sam", "Nina", "Julia", "Ben"];
  const last = ["Martin", "Dubois", "Garcia", "Smith", "Brown", "Wilson", "Petit", "Rossi", "Moreau", "Lopez", "Bernard", "Fischer", "Klein"];
  return `${pick(first)} ${pick(last)}`;
}

function randomTime() {
  return pick(["1h", "2h", "4h", "7h", "Yesterday", "2d", "3d", "1w"]);
}

function randomReaction(): ReactionType {
  return pick(["like", "love", "haha", "wow", "sad", "angry"]);
}

function reactionLabel(r: ReactionType) {
  return r === "like" ? "Like" : r === "love" ? "Love" : r === "haha" ? "Haha" : r === "wow" ? "Wow" : r === "sad" ? "Sad" : "Angry";
}

function reactionGlyph(r: ReactionType) {
  return r === "like" ? "👍" : r === "love" ? "❤️" : r === "haha" ? "😂" : r === "wow" ? "😮" : r === "sad" ? "😢" : "😡";
}

function buildEcomComment() {
  const bank = [
    "How long did shipping take for you?",
    "Is the sizing true to size? Thinking of ordering.",
    "Quality looks great—did you try washing it yet?",
    "Does it work for sensitive skin? Any feedback?",
    "Customer service replied fast for me.",
    "Just got mine—packaging was super clean.",
    "Does this come with a warranty?",
    "Can you share a quick before/after update?",
    "Is there a discount code right now?",
    "Is the material breathable for summer?",
    "Would you recommend this as a gift?",
    "How’s the battery life in real use?",
  ];
  return pick(bank);
}

function makeComment(overrides?: Partial<CommentNode>): CommentNode {
  const name = overrides?.name || randomName();
  return {
    id: uid(),
    name,
    avatarSrc: overrides?.avatarSrc || avatarDataUrl(name),
    timeLabel: overrides?.timeLabel || randomTime(),
    text: overrides?.text || buildEcomComment(),
    reaction: overrides?.reaction || randomReaction(),
    reactionCount: overrides?.reactionCount ?? Math.floor(3 + Math.random() * 120),
    replies: overrides?.replies || [],
  };
}

function updateNode(list: CommentNode[], id: string, patch: Partial<CommentNode>): CommentNode[] {
  return list.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (!n.replies.length) return n;
    return { ...n, replies: updateNode(n.replies, id, patch) };
  });
}

function deleteNode(list: CommentNode[], id: string): CommentNode[] {
  const out: CommentNode[] = [];
  for (const n of list) {
    if (n.id === id) continue;
    out.push({ ...n, replies: deleteNode(n.replies, id) });
  }
  return out;
}

function insertReply(list: CommentNode[], parentId: string, node: CommentNode): CommentNode[] {
  return list.map((n) => {
    if (n.id === parentId) return { ...n, replies: [...n.replies, node] };
    if (!n.replies.length) return n;
    return { ...n, replies: insertReply(n.replies, parentId, node) };
  });
}

function flatten(list: CommentNode[], depth = 0): Array<{ node: CommentNode; depth: number; parentId: string | null }> {
  const out: Array<{ node: CommentNode; depth: number; parentId: string | null }> = [];
  for (const n of list) {
    out.push({ node: n, depth, parentId: null });
    for (const r of n.replies) out.push({ node: r, depth: depth + 1, parentId: n.id });
  }
  return out;
}

function moveNode(list: CommentNode[], id: string, dir: -1 | 1): CommentNode[] {
  // only reorders top-level comments (keeps UI simple)
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return list;
  const next = idx + dir;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  const tmp = copy[idx]!;
  copy[idx] = copy[next]!;
  copy[next] = tmp;
  return copy;
}

function buildExportSvg(thread: CommentNode[], ratio: ExportRatio) {
  const W = 1080;
  const H = ratio === "1080x1080" ? 1080 : 1350;
  const P = 64;

  const cardX = P;
  const cardY = P;
  const cardW = W - P * 2;
  const cardH = H - P * 2;

  const titleFont = '700 34px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
  const nameFont = '700 22px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
  const metaFont = '400 18px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
  const bodyFont = '400 22px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';

  let y = cardY + 56;
  const items = flatten(thread);

  const rows: string[] = [];
  rows.push(
    `<text x="${cardX + 28}" y="${y}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="34" font-weight="700" fill="#0b0f17">Comments</text>`,
  );
  y += 28;
  rows.push(`<text x="${cardX + 28}" y="${y + 22}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">Preview • Export PNG</text>`);
  y += 56;

  for (const it of items) {
    const n = it.node;
    const depth = Math.min(2, it.depth);
    const indent = depth * 56;
    const avatarSize = depth === 0 ? 52 : 44;
    const avatarR = avatarSize / 2;
    const x0 = cardX + 28 + indent;
    const avatarX = x0;
    const avatarY = y;
    const textX = avatarX + avatarSize + 16;
    const textMaxW = cardX + cardW - 28 - textX;

    const nameW = measureTextWidth(n.name, nameFont);
    const safeName = clampText(n.name, 34) || "User";
    const safeTime = clampText(n.timeLabel, 16) || "1h";
    const safeText = clampText(n.text, 260) || "Write your comment…";
    const lines = wrapTextLines(safeText, textMaxW, bodyFont, 4);

    const rowH = Math.max(avatarSize, 26 + lines.length * 28 + 30);
    if (avatarY + rowH > cardY + cardH - 28) {
      rows.push(
        `<text x="${cardX + 28}" y="${cardY + cardH - 18}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">…</text>`,
      );
      break;
    }

    const avatarHref = escapeXmlAttr(n.avatarSrc || avatarDataUrl(n.name));
    const clipId = `clip_${n.id.replace(/[^a-zA-Z0-9_]/g, "_")}`;

    rows.push(`<defs><clipPath id="${clipId}"><circle cx="${avatarX + avatarR}" cy="${avatarY + avatarR}" r="${avatarR}"/></clipPath></defs>`);
    rows.push(
      `<g clip-path="url(#${clipId})"><image href="${avatarHref}" x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid slice"/></g>`,
    );

    // name + time
    rows.push(
      `<text x="${textX}" y="${avatarY + 18}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" font-weight="700" fill="#0b0f17">${escapeXmlText(
        safeName,
      )}</text>`,
    );
    const timeX = textX + Math.min(nameW + 16, textMaxW * 0.7);
    rows.push(
      `<text x="${timeX}" y="${avatarY + 18}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">${escapeXmlText(
        safeTime,
      )}</text>`,
    );

    // body lines
    let ty = avatarY + 46;
    for (const ln of lines) {
      rows.push(
        `<text x="${textX}" y="${ty}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="22" fill="#111827">${escapeXmlText(
          ln,
        )}</text>`,
      );
      ty += 28;
    }

    // meta row
    rows.push(
      `<text x="${textX}" y="${avatarY + rowH - 6}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">Like • Reply</text>`,
    );

    // reactions pill (right)
    const pillText = `${reactionGlyph(n.reaction)} ${String(Math.max(0, n.reactionCount || 0))}`;
    const pillW = Math.max(92, measureTextWidth(pillText, metaFont) + 26);
    const pillX = cardX + cardW - 28 - pillW;
    const pillY = avatarY + rowH - 30;
    rows.push(`<rect x="${pillX}" y="${pillY}" width="${pillW}" height="26" rx="13" fill="#eef2ff"/>`);
    rows.push(
      `<text x="${pillX + pillW / 2}" y="${pillY + 18}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="16" fill="#111827">${escapeXmlText(
        pillText,
      )}</text>`,
    );

    y += rowH + 18;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07070c"/>
      <stop offset="1" stop-color="#140a22"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="black" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g filter="url(#shadow)">
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="28" fill="#ffffff"/>
  </g>
  ${rows.join("\n")}
</svg>`;

  return svg;
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

function SmallBadge({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/25">{children}</span>;
}

export default function FacebookCommentsGenerator() {
  const [exportRatio, setExportRatio] = React.useState<ExportRatio>("1080x1350");

  const [thread, setThread] = React.useState<CommentNode[]>(() => {
    const a = makeComment({ text: "Is it legit? Anyone tried it yet?", reaction: "like", reactionCount: 48 });
    const b = makeComment({ text: "Just received mine — quality surprised me.", reaction: "love", reactionCount: 19 });
    const r1 = makeComment({ name: "Ava Wilson", text: "Same here. Shipping was 5 days for me.", reaction: "like", reactionCount: 8 });
    return [
      { ...a, replies: [r1] },
      b,
    ];
  });

  const [selectedId, setSelectedId] = React.useState<string>(() => thread[0]?.id || "");

  const selected = React.useMemo(() => {
    const stack: CommentNode[] = [...thread];
    while (stack.length) {
      const n = stack.shift()!;
      if (n.id === selectedId) return n;
      for (const r of n.replies) stack.push(r);
    }
    return null;
  }, [thread, selectedId]);

  const setSelectedPatch = (patch: Partial<CommentNode>) => {
    if (!selectedId) return;
    setThread((cur) => updateNode(cur, selectedId, patch));
  };

  const addComment = () => {
    const c = makeComment();
    setThread((cur) => [...cur, c]);
    setSelectedId(c.id);
  };

  const addReply = () => {
    if (!selectedId) return;
    const reply = makeComment({ reactionCount: Math.floor(0 + Math.random() * 32) });
    setThread((cur) => insertReply(cur, selectedId, reply));
    setSelectedId(reply.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setThread((cur) => deleteNode(cur, selectedId));
    setSelectedId((prev) => {
      if (prev === thread[0]?.id) return thread[1]?.id || "";
      return thread[0]?.id || "";
    });
  };

  const randomize = () => {
    const top = Array.from({ length: 3 }, () => makeComment({ text: buildEcomComment() }));
    top[0] = { ...top[0]!, replies: [makeComment({ text: "Any issues with returns? Curious.", reaction: "wow", reactionCount: 6 })] };
    top[1] = { ...top[1]!, replies: [makeComment({ text: "True to size for me. I sized up once.", reaction: "like", reactionCount: 10 })] };
    setThread(top);
    setSelectedId(top[0]?.id || "");
  };

  const exportPng = () => {
    const svg = buildExportSvg(thread, exportRatio);
    const safe = slugifyName(thread[0]?.name || "export") || "export";
    downloadPngFromSvg(svg, `facebook-comments-${safe}-${exportRatio}.png`);
  };

  const copyThread = async () => {
    const lines: string[] = [];
    for (const c of thread) {
      lines.push(`${c.name} (${c.timeLabel}): ${c.text}`);
      for (const r of c.replies) lines.push(`  ↳ ${r.name} (${r.timeLabel}): ${r.text}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      // ignore
    }
  };

  const onUploadAvatar = async (file: File | null) => {
    if (!file || !selectedId) return;
    const dataUrl = await fileToDataUrl(file);
    setSelectedPatch({ avatarSrc: dataUrl });
  };

  const moveUp = () => {
    if (!selectedId) return;
    setThread((cur) => moveNode(cur, selectedId, -1));
  };
  const moveDown = () => {
    if (!selectedId) return;
    setThread((cur) => moveNode(cur, selectedId, 1));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-white font-semibold">Facebook Comments Generator for ads</div>
            <div className="text-xs text-gray-400 mt-1">
              Create thread mockups, test trust angles, and export a PNG. (Also searched as “facebook comments generator”.)
            </div>
          </div>
          <SmallBadge>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              No sign‑up
            </span>
          </SmallBadge>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addComment}
            className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm inline-flex items-center gap-2 transition-colors"
            title="Add comment"
          >
            <Plus className="h-4 w-4 text-purple-200/80" />
            <span className="font-semibold">Add comment</span>
          </button>
          <button
            type="button"
            onClick={addReply}
            className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm inline-flex items-center gap-2 transition-colors"
            title="Add reply"
          >
            <MessageCircleReply className="h-4 w-4 text-purple-200/80" />
            <span className="font-semibold">Add reply</span>
          </button>
          <button
            type="button"
            onClick={randomize}
            className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm inline-flex items-center gap-2 transition-colors"
            title="Generate sample thread"
          >
            <Sparkles className="h-4 w-4 text-purple-200/80" />
            <span className="font-semibold">Sample thread</span>
          </button>
          <button
            type="button"
            onClick={copyThread}
            className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm inline-flex items-center gap-2 transition-colors"
            title="Copy as text"
          >
            <Copy className="h-4 w-4 text-purple-200/80" />
            <span className="font-semibold">Copy</span>
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-gray-400 font-semibold tracking-wide mb-2">THREAD</div>
          <div className="space-y-2">
            {thread.map((c, idx) => (
              <div key={c.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2.5 transition-colors",
                    selectedId === c.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/10 bg-black/10 hover:bg-black/20",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-[12px] text-gray-400 truncate">{c.text}</div>
                    </div>
                    <div className="shrink-0 text-[12px] text-gray-400">{idx + 1}</div>
                  </div>
                </button>
                {c.replies.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-2.5 transition-colors ml-6",
                      selectedId === r.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/10 bg-black/10 hover:bg-black/20",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-semibold truncate">↳ {r.name}</div>
                        <div className="text-[12px] text-gray-400 truncate">{r.text}</div>
                      </div>
                      <div className="shrink-0 text-[12px] text-gray-400">reply</div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {!thread.length ? <div className="text-sm text-gray-400">No comments yet.</div> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white font-semibold">Selected</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={moveUp}
                className="h-9 w-9 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 inline-flex items-center justify-center text-white/80 transition-colors"
                title="Move up (top-level only)"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={moveDown}
                className="h-9 w-9 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 inline-flex items-center justify-center text-white/80 transition-colors"
                title="Move down (top-level only)"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={removeSelected}
                className="h-9 w-9 rounded-xl border border-white/10 bg-black/20 hover:bg-red-500/15 hover:border-red-500/30 inline-flex items-center justify-center text-white/80 transition-colors"
                title="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Name</div>
              <input
                value={selected?.name || ""}
                onChange={(e) => setSelectedPatch({ name: e.target.value })}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                placeholder="Name"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Time label</div>
              <input
                value={selected?.timeLabel || ""}
                onChange={(e) => setSelectedPatch({ timeLabel: e.target.value })}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                placeholder="2h / Yesterday / 2d"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-medium text-gray-200 mb-2">Comment</div>
            <textarea
              value={selected?.text || ""}
              onChange={(e) => setSelectedPatch({ text: e.target.value })}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/30 text-white px-4 py-3 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20 resize-none"
              placeholder="Write a comment..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Reaction</div>
              <select
                value={(selected?.reaction || "like") as ReactionType}
                onChange={(e) => setSelectedPatch({ reaction: e.target.value as ReactionType })}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="like">Like</option>
                <option value="love">Love</option>
                <option value="haha">Haha</option>
                <option value="wow">Wow</option>
                <option value="sad">Sad</option>
                <option value="angry">Angry</option>
              </select>
            </label>
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Reaction count</div>
              <input
                value={String(selected?.reactionCount ?? 0)}
                onChange={(e) => setSelectedPatch({ reactionCount: Math.max(0, Number(e.target.value) || 0) })}
                type="number"
                min={0}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 hover:bg-black/30 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 text-purple-200/80" />
                <span className="font-semibold">Upload avatar</span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onUploadAvatar(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              onClick={() => selectedId && setSelectedPatch({ avatarSrc: avatarDataUrl(selected?.name || "User") })}
              className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm font-semibold transition-colors"
              title="Reset avatar"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Preview + export</div>
              <div className="text-xs text-gray-400 mt-1">
                Export ready for ads • Perfect for Meta mockups & trust angles • 100% Free
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={exportRatio}
                onChange={(e) => setExportRatio(e.target.value as ExportRatio)}
                className="h-10 rounded-xl border border-white/10 bg-black/30 text-white text-sm px-3 outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                title="Export size"
              >
                <option value="1080x1350">1080×1350 (Feed)</option>
                <option value="1080x1080">1080×1080 (Square)</option>
              </select>
              <button
                type="button"
                onClick={exportPng}
                className="h-10 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                title="Export PNG"
              >
                <Download className="h-4 w-4" />
                Export PNG
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-[radial-gradient(circle_at_top,#9541e0_0%,transparent_52%),radial-gradient(circle_at_bottom_right,#7c30c7_0%,transparent_55%)] p-[1px]">
            <div className="rounded-3xl bg-black/40 p-6 md:p-10 overflow-hidden">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl bg-white text-black px-6 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <div className="text-lg font-bold text-gray-900">Comments</div>
                  <div className="text-xs text-gray-500 mt-1">Thread preview (facebook comments generator)</div>

                  <div className="mt-5 space-y-5">
                    {thread.map((c) => (
                      <div key={c.id}>
                        <CommentRow node={c} depth={0} onSelect={() => setSelectedId(c.id)} selected={selectedId === c.id} />
                        {c.replies.map((r) => (
                          <div key={r.id} className="mt-4 ml-12">
                            <CommentRow node={r} depth={1} onSelect={() => setSelectedId(r.id)} selected={selectedId === r.id} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {!thread.length ? <div className="text-sm text-gray-500 mt-4">Add a comment to start.</div> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Tip: use this as a <strong>comment generator for Facebook</strong> mockup—mix questions + short confirmations for realistic threads.
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  node,
  depth,
  onSelect,
  selected,
}: {
  node: CommentNode;
  depth: number;
  onSelect: () => void;
  selected: boolean;
}) {
  const avatarSize = depth === 0 ? 46 : 40;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left group rounded-2xl transition-colors",
        selected ? "bg-purple-500/10 ring-1 ring-purple-500/30" : "hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-3 py-3">
        <div className="shrink-0 rounded-full bg-gray-200 overflow-hidden" style={{ width: avatarSize, height: avatarSize }}>
          <img src={node.avatarSrc || avatarDataUrl(node.name)} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-semibold text-gray-900 truncate">{node.name}</div>
            <div className="text-[13px] text-gray-500">{node.timeLabel}</div>
          </div>
          <div className="mt-1 text-[15px] leading-[22px] text-gray-900">{node.text}</div>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-gray-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-gray-700">
              <span aria-hidden="true">{reactionGlyph(node.reaction)}</span>
              <span>{Math.max(0, node.reactionCount || 0)}</span>
            </span>
            <span>Like</span>
            <span>Reply</span>
            <span className="opacity-70">•</span>
            <span className="opacity-70">{reactionLabel(node.reaction)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

