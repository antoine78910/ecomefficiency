"use client";

import * as React from "react";
import { Copy, Download, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

type Mode = "single" | "bulk";
type CommentType = "reply" | "video";
type Gender = "male" | "female";

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

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateUsername(gender: Gender) {
  const first = gender === "female"
    ? ["lena", "mia", "zoe", "chloe", "sara", "nina", "emma", "eva", "julia", "noa"]
    : ["alex", "leo", "max", "ryan", "liam", "noah", "adam", "james", "sam", "ben"];
  const second = ["shop", "ecom", "creator", "daily", "hub", "vibes", "studio", "lab", "notes", "club"];
  const n = Math.random() < 0.7 ? String(Math.floor(10 + Math.random() * 90)) : "";
  return `${pick(first)}_${pick(second)}${n}`;
}

function avatarDataUrl(seed: string, gender: Gender) {
  const s = seed || "user";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hueA = (hash % 360 + (gender === "female" ? 18 : 0)) % 360;
  const hueB = (hueA + 38 + (hash % 30)) % 360;
  const initial = s.trim().slice(0, 1).toUpperCase() || "U";
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="g" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
        <stop stop-color="hsl(${hueA} 92% 62%)"/>
        <stop offset="1" stop-color="hsl(${hueB} 86% 52%)"/>
      </linearGradient>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="black" flood-opacity="0.35"/>
      </filter>
    </defs>
    <circle cx="48" cy="48" r="44" fill="url(#g)" filter="url(#s)"/>
    <circle cx="48" cy="46" r="22" fill="rgba(0,0,0,0.18)"/>
    <text x="48" y="57" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" text-anchor="middle" fill="white" font-weight="800">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildComment({
  type,
  topic,
  original,
  certified,
}: {
  type: CommentType;
  topic: string;
  original: string;
  certified: boolean;
}) {
  const hooks = [
    "This is actually super useful.",
    "Wait… this is smart.",
    "You just saved me hours.",
    "Ok I’m trying this today.",
    "This is the real advice.",
    "Underrated tip.",
  ];

  const replies = [
    "What product are you using for this?",
    "Can you drop the exact steps?",
    "Do you have a template for this?",
    "Does this work for low budgets too?",
    "How long did it take to see results?",
    "Any mistakes to avoid?",
  ];

  const closers = [
    "Thanks for sharing.",
    "Instant follow.",
    "Keep these coming.",
    "Pin this.",
    "Needed this.",
  ];

  const emojis = ["🔥", "✅", "💯", "🚀", "👏", "😮", "🧠"];
  const e = pick(emojis);

  const topicLine = topic ? ` (${topic})` : "";
  const badge = certified ? "✅ " : "";

  if (type === "video") {
    return clampText(`${badge}${pick(hooks)}${topicLine} ${pick(closers)} ${e}`, 220);
  }

  const base = original ? `Re: “${clampText(original, 80)}” — ` : "";
  return clampText(`${badge}${base}${pick(replies)} ${e}`, 240);
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

function exportPreviewAsImage({
  username,
  gender,
  certified,
  text,
}: {
  username: string;
  gender: Gender;
  certified: boolean;
  text: string;
}) {
  const safeText = clampText(text || "", 220) || "Write any comment and see what happens 😊";
  const safeName = clampText(username || "user", 22);
  const initial = safeName.slice(0, 1).toUpperCase() || "U";

  // 1100x630 social-ish export
  const w = 1100;
  const h = 630;
  const bg = "#0b0b10";
  const bubble = "#ffffff";
  const bubbleText = "#0b0b10";
  const accent = "#9541e0";
  const badge = certified ? "Certified" : "";
  const badgeWidth = certified ? 104 : 0;

  const hueOffset = gender === "female" ? 18 : 0;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#130a1f"/>
    </linearGradient>
    <linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${(268 + hueOffset) % 360} 90% 62%)"/>
      <stop offset="1" stop-color="hsl(${(290 + hueOffset) % 360} 85% 50%)"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="black" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <g filter="url(#shadow)">
    <path d="M240 210c0-26 21-48 48-48h520c26 0 48 22 48 48v210c0 26-22 48-48 48H420l-120 96v-96H288c-27 0-48-22-48-48V210Z" fill="${bubble}"/>
  </g>

  <circle cx="340" cy="262" r="44" fill="url(#av)"/>
  <text x="340" y="276" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="34" text-anchor="middle" fill="white" font-weight="800">${initial}</text>

  <text x="410" y="242" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#4b5563" font-weight="700">Reply to ${safeName}'s comment</text>
  <text x="410" y="274" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="44" fill="${bubbleText}" font-weight="900">${safeText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>

  ${certified ? `
  <g>
    <rect x="${410 + 0}" y="292" rx="999" ry="999" width="${badgeWidth}" height="28" fill="rgba(149,65,224,0.12)" stroke="rgba(149,65,224,0.35)"/>
    <circle cx="${424}" cy="306" r="7" fill="${accent}"/>
    <path d="M420.8 306l2.2 2.6 5.1-6.1" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${437}" y="312" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="13" fill="${accent}" font-weight="800">${badge}</text>
  </g>` : ""}
</svg>`;

  downloadPngFromSvg(svg, `tiktok-comment-${slugifyName(safeName) || "export"}.png`);
}

export default function TikTokCommentGenerator() {
  const [mode, setMode] = React.useState<Mode>("single");
  const [commentType, setCommentType] = React.useState<CommentType>("reply");
  const [gender, setGender] = React.useState<Gender>("male");
  const [certified, setCertified] = React.useState(true);
  const [username, setUsername] = React.useState(() => generateUsername("male"));
  const [topic, setTopic] = React.useState("ecommerce");
  const [originalComment, setOriginalComment] = React.useState("Is this real?");
  const [singleOut, setSingleOut] = React.useState("");

  const [bulkCount, setBulkCount] = React.useState(10);
  const [bulkContext, setBulkContext] = React.useState("A short TikTok about improving ROAS and profit.");
  const [bulkOut, setBulkOut] = React.useState<string[]>([]);

  const avatar = React.useMemo(() => avatarDataUrl(username, gender), [gender, username]);

  const regenerateUser = () => {
    const next = generateUsername(gender);
    setUsername(next);
  };

  const generateSingle = () => {
    const out = buildComment({
      type: commentType,
      topic,
      original: commentType === "reply" ? originalComment : "",
      certified,
    });
    setSingleOut(out);
  };

  const generateBulk = () => {
    const safe = Math.max(3, Math.min(50, Number.isFinite(bulkCount) ? bulkCount : 10));
    const arr = Array.from({ length: safe }, () =>
      buildComment({ type: "video", topic: bulkContext || topic, original: "", certified }),
    );
    setBulkOut(arr);
  };

  const copyText = async (t: string) => {
    const txt = String(t || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // ignore
    }
  };

  const previewText = mode === "single" ? (singleOut || "Write any comment and see what happens 😊") : (bulkOut[0] || "Generate comments in bulk 😊");

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

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={[
              "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              mode === "single" ? "border-purple-500/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
            ].join(" ")}
          >
            Single Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={[
              "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              mode === "bulk" ? "border-purple-500/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
            ].join(" ")}
          >
            Bulk Mode
          </button>
        </div>

        <div className="mt-6">
          <div className="text-[11px] text-gray-400 font-semibold tracking-wide">COMMENT CONTROLS</div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommentType("reply")}
              className={[
                "flex-1 rounded-xl border px-4 py-2 text-sm transition-colors",
                commentType === "reply" ? "border-purple-500/35 bg-purple-500/10 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
              ].join(" ")}
            >
              Comment Reply
            </button>
            <button
              type="button"
              onClick={() => setCommentType("video")}
              className={[
                "flex-1 rounded-xl border px-4 py-2 text-sm transition-colors",
                commentType === "video" ? "border-purple-500/35 bg-purple-500/10 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
              ].join(" ")}
            >
              Video Comment
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Topic (optional)</div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="example: ecommerce, skincare, fitness…"
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              />
            </label>

            {mode === "single" && commentType === "reply" ? (
              <label className="block">
                <div className="text-sm font-medium text-gray-200 mb-2">Original comment</div>
                <input
                  value={originalComment}
                  onChange={(e) => setOriginalComment(e.target.value)}
                  placeholder="example: Is this legit?"
                  className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                />
              </label>
            ) : null}

            {mode === "bulk" ? (
              <>
                <label className="block">
                  <div className="text-sm font-medium text-gray-200 mb-2">Video context</div>
                  <textarea
                    value={bulkContext}
                    onChange={(e) => setBulkContext(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-black/30 text-white px-4 py-3 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20 resize-none"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium text-gray-200 mb-2">How many comments?</div>
                  <input
                    value={String(bulkCount)}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    type="number"
                    min={3}
                    max={50}
                    className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[11px] text-gray-400 font-semibold tracking-wide">USER</div>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              />
              <div className="text-[11px] text-gray-500 mt-1">Randomize or type your own username.</div>
            </div>
            <div className="flex gap-2">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="h-11 rounded-xl border border-white/10 bg-black/30 text-white text-sm px-3 outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <button
                type="button"
                onClick={regenerateUser}
                className="h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                title="Generate username"
              >
                <RefreshCcw className="h-4 w-4" />
                Generate
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCertified((s) => !s)}
            className={[
              "mt-3 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2",
              certified ? "border-purple-500/35 bg-purple-500/10 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
            ].join(" ")}
          >
            <ShieldCheck className="h-4 w-4" />
            Certified badge {certified ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {mode === "single" ? (
            <button
              type="button"
              onClick={generateSingle}
              className="flex-1 h-11 rounded-xl px-5 text-sm font-semibold transition-colors bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.22)]"
            >
              Generate comment
            </button>
          ) : (
            <button
              type="button"
              onClick={generateBulk}
              className="flex-1 h-11 rounded-xl px-5 text-sm font-semibold transition-colors bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.22)]"
            >
              Generate {bulkCount} comments
            </button>
          )}
          <button
            type="button"
            onClick={() => copyText(mode === "single" ? singleOut : bulkOut.join("\n"))}
            className="h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
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
              onClick={() => exportPreviewAsImage({ username, gender, certified, text: previewText })}
              className="h-10 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              title="Export Image"
            >
              <Download className="h-4 w-4" />
              Export Image
            </button>
          </div>

          <div className="mt-6 rounded-3xl bg-[radial-gradient(circle_at_top,#9541e0_0%,transparent_52%),radial-gradient(circle_at_bottom_right,#7c30c7_0%,transparent_55%)] p-[1px]">
            <div className="rounded-3xl bg-black/40 p-6 md:p-10 overflow-hidden">
              <div className="mx-auto max-w-2xl">
                <div className="rounded-3xl bg-white text-black p-6 md:p-8 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <div className="text-gray-500 font-semibold text-sm">Reply to {username || "user"}&apos;s comment</div>
                  <div className="mt-4 flex items-start gap-4">
                    <div className="shrink-0">
                      <img
                        src={avatar}
                        alt=""
                        className="w-12 h-12 rounded-full border border-black/10 object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-extrabold text-lg">{username || "user"}</div>
                        {certified ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Certified
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-3xl md:text-4xl font-black leading-tight">{previewText}</div>
                    </div>
                  </div>
                </div>

                {mode === "bulk" && bulkOut.length ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-white mb-2">Bulk output</div>
                    <ol className="space-y-2 text-sm text-gray-200">
                      {bulkOut.slice(0, 12).map((t, idx) => (
                        <li key={`${t}-${idx}`} className="flex items-start justify-between gap-3">
                          <span className="flex-1">{t}</span>
                          <button
                            type="button"
                            onClick={() => copyText(t)}
                            className="shrink-0 rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 px-2.5 py-1 text-xs text-white"
                            title="Copy"
                          >
                            Copy
                          </button>
                        </li>
                      ))}
                    </ol>
                    {bulkOut.length > 12 ? <div className="text-[11px] text-gray-500 mt-3">Showing first 12 comments.</div> : null}
                  </div>
                ) : null}
              </div>
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

