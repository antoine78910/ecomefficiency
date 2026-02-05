"use client";

import * as React from "react";
import { Copy, Download, Heart, MessageCircle, Moon, Share2, ShieldCheck, Sparkles, UserRound, Clock3, Wand2 } from "lucide-react";

type Mode = "single" | "bulk";
type Gender = "male" | "female";

function clampText(input: string, max = 220) {
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
  const first =
    gender === "female"
      ? ["lena", "mia", "zoe", "chloe", "sara", "nina", "emma", "eva", "julia", "noa"]
      : ["alex", "leo", "max", "ryan", "liam", "noah", "adam", "james", "sam", "ben"];
  const second = ["studio", "daily", "vibes", "creator", "notes", "club", "life", "journal", "world", "feed"];
  const n = Math.random() < 0.75 ? String(Math.floor(10 + Math.random() * 90)) : "";
  return `${pick(first)}_${pick(second)}${n}`;
}

function avatarDataUrl(seed: string) {
  const s = seed || "user";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 42 + (hash % 40)) % 360;
  const initial = s.trim().slice(0, 1).toUpperCase() || "U";
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="g" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
        <stop stop-color="hsl(${hueA} 92% 62%)"/>
        <stop offset="1" stop-color="hsl(${hueB} 86% 52%)"/>
      </linearGradient>
    </defs>
    <circle cx="48" cy="48" r="44" fill="url(#g)"/>
    <circle cx="48" cy="46" r="22" fill="rgba(0,0,0,0.18)"/>
    <text x="48" y="57" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="30" text-anchor="middle" fill="white" font-weight="800">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildInstagramComment({
  topic,
  tone,
  includeEmoji,
}: {
  topic: string;
  tone: "supportive" | "funny" | "curious" | "hype" | "professional";
  includeEmoji: boolean;
}) {
  const emojis = ["😂", "🔥", "😍", "👏", "💯", "🤍", "🙌", "😮"];
  const e = includeEmoji ? ` ${pick(emojis)}` : "";
  const t = topic ? ` (${topic})` : "";

  const supportive = [
    "This is so helpful.",
    "Love this perspective.",
    "You explained this perfectly.",
    "Needed this today.",
    "This is honestly inspiring.",
  ];
  const funny = [
    "Ok but why is this me 😭",
    "I’m not ok after this 😂",
    "The way I ran to try this…",
    "Stoppp this is too real 😂",
    "I laughed way too hard",
  ];
  const curious = [
    "How did you do this?",
    "What would you recommend for beginners?",
    "Can you share the details?",
    "Where can I learn more about this?",
    "Does this work with any niche?",
  ];
  const hype = [
    "This is a vibe.",
    "Instant follow.",
    "You’re onto something.",
    "This deserves more views.",
    "Keep posting these!",
  ];
  const professional = [
    "Great execution—clear and actionable.",
    "Strong point. Consistency is everything here.",
    "Solid breakdown. Thanks for sharing.",
    "This is a great framework to test.",
    "Well said—simple and effective.",
  ];

  const bank =
    tone === "supportive" ? supportive : tone === "funny" ? funny : tone === "curious" ? curious : tone === "hype" ? hype : professional;

  return clampText(`${pick(bank)}${t}${e}`, 220);
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

function exportInstagramCommentImage({
  username,
  timeLabel,
  comment,
  likes,
  replies,
}: {
  username: string;
  timeLabel: string;
  comment: string;
  likes: number;
  replies: number;
}) {
  const safeName = clampText(username || "username", 18);
  const safeTime = clampText(timeLabel || "2w", 6);
  const safeComment = clampText(comment || "Write any comment and see what happens 😊", 120);

  const w = 1200;
  const h = 675;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05050a"/>
      <stop offset="1" stop-color="#130a1f"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="black" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <g transform="translate(210 190)" filter="url(#shadow)">
    <rect width="780" height="250" rx="18" fill="#ffffff"/>

    <!-- avatar -->
    <circle cx="78" cy="72" r="32" fill="#d1d5db"/>
    <circle cx="78" cy="72" r="32" fill="rgba(0,0,0,0.06)"/>

    <!-- header -->
    <text x="132" y="62" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="20" font-weight="700" fill="#111827">${safeName}</text>
    <text x="${132 + safeName.length * 10 + 10}" y="62" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">${safeTime}</text>

    <!-- heart + likes -->
    <path d="M722 46c-10 0-18 8-18 18 0 24 30 42 30 42s30-18 30-42c0-10-8-18-18-18-6 0-12 3-14 8-2-5-8-8-14-8Z" fill="none" stroke="#6b7280" stroke-width="3"/>
    <text x="760" y="128" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#6b7280">${String(likes)}</text>

    <!-- comment -->
    <text x="132" y="112" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="26" font-weight="400" fill="#111827">${safeComment.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>

    <!-- reply -->
    <text x="132" y="160" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#9ca3af">Reply</text>

    <!-- view more replies -->
    <line x1="132" y1="198" x2="210" y2="198" stroke="#d1d5db" stroke-width="2"/>
    <text x="232" y="204" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="18" fill="#9ca3af">View ${String(replies)} more replies</text>
  </g>
</svg>`;

  downloadPngFromSvg(svg, `instagram-comment-${slugifyName(safeName) || "export"}.png`);
}

function SmallPill({
  icon,
  children,
  rightSlot,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-xl border border-white/10 bg-black/20 hover:bg-black/30 text-white/90 px-3 text-sm inline-flex items-center gap-2 transition-colors"
    >
      <span className="text-purple-200/80">{icon}</span>
      <span className="font-semibold">{children}</span>
      {rightSlot ? <span className="ml-1 text-white/40">{rightSlot}</span> : null}
    </button>
  );
}

export default function InstagramCommentGenerator() {
  const [mode, setMode] = React.useState<Mode>("single");
  const [gender, setGender] = React.useState<Gender>("male");
  const [username, setUsername] = React.useState("username");
  const [certified, setCertified] = React.useState(false);

  const [timeLabel, setTimeLabel] = React.useState<"1h" | "1d" | "3d" | "1w" | "2w" | "1m">("2w");
  const [likes, setLikes] = React.useState(114);
  const [moreReplies, setMoreReplies] = React.useState(5);

  const [topic, setTopic] = React.useState("fashion");
  const [tone, setTone] = React.useState<"supportive" | "funny" | "curious" | "hype" | "professional">("supportive");
  const [includeEmoji, setIncludeEmoji] = React.useState(true);

  const [comment, setComment] = React.useState("Write any comment and see what happens 😊");

  const [bulkCount, setBulkCount] = React.useState(10);
  const [bulkOut, setBulkOut] = React.useState<string[]>([]);

  const avatar = React.useMemo(() => avatarDataUrl(username), [username]);

  const regenerateUser = () => {
    const next = generateUsername(gender);
    setUsername(next);
  };

  const generateOne = () => {
    setComment(buildInstagramComment({ topic, tone, includeEmoji }));
  };

  const generateBulk = () => {
    const safe = Math.max(3, Math.min(50, Number.isFinite(bulkCount) ? bulkCount : 10));
    setBulkOut(Array.from({ length: safe }, () => buildInstagramComment({ topic, tone, includeEmoji })));
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

  const previewComment = mode === "single" ? comment : bulkOut[0] || comment;

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
      <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold">Instagram comment generator</div>
            <div className="text-xs text-gray-400 mt-1">Generate unlimited Instagram comments for free.</div>
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
            <div className="flex-1 relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-200/70" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full h-11 rounded-xl border border-white/10 bg-white/5 text-white px-10 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <button
              type="button"
              onClick={() => exportInstagramCommentImage({ username, timeLabel, comment: previewComment, likes, replies: moreReplies })}
              className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center text-white/80 transition-colors"
              title="Export Image"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCertified((s) => !s)}
              className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center text-white/80 transition-colors"
              title="Certified badge"
            >
              <ShieldCheck className={["h-4 w-4", certified ? "text-purple-200" : "text-white/60"].join(" ")} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <SmallPill
              icon={<Clock3 className="h-4 w-4" />}
              rightSlot="▾"
              onClick={() => {
                const order: Array<typeof timeLabel> = ["1h", "1d", "3d", "1w", "2w", "1m"];
                setTimeLabel(order[(order.indexOf(timeLabel) + 1) % order.length]!);
              }}
            >
              {timeLabel === "1m" ? "1 mo" : timeLabel === "2w" ? "2 wks" : timeLabel}
            </SmallPill>

            <SmallPill
              icon={<Heart className="h-4 w-4" />}
              onClick={() => setLikes((n) => Math.max(0, n + 1))}
            >
              {likes}
            </SmallPill>

            <SmallPill
              icon={<MessageCircle className="h-4 w-4" />}
              onClick={() => setMoreReplies((n) => Math.max(0, n + 1))}
            >
              {moreReplies}
            </SmallPill>

            <SmallPill icon={<Wand2 className="h-4 w-4" />} onClick={generateOne}>
              Generate
            </SmallPill>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full bg-transparent text-white text-sm outline-none resize-none leading-relaxed"
            />
            <div className="mt-2 text-right text-[11px] text-white/35">{String(comment.length)} chars</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Topic (optional)</div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
                placeholder="example: skincare, fitness…"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-200 mb-2">Tone</div>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as typeof tone)}
                className="w-full h-11 rounded-xl border border-white/10 bg-black/30 text-white px-4 text-sm outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="supportive">Supportive</option>
                <option value="funny">Funny</option>
                <option value="curious">Curious</option>
                <option value="hype">Hype</option>
                <option value="professional">Professional</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
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
                className="h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold transition-colors"
                title="Generate username"
              >
                Random user
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIncludeEmoji((s) => !s)}
              className={[
                "h-11 rounded-xl border px-4 text-sm font-semibold transition-colors",
                includeEmoji ? "border-purple-500/35 bg-purple-500/10 text-purple-100" : "border-white/10 bg-black/20 text-gray-200 hover:bg-black/30",
              ].join(" ")}
            >
              Emojis {includeEmoji ? "ON" : "OFF"}
            </button>
          </div>

          {mode === "bulk" ? (
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={generateBulk}
                  className="flex-1 h-11 rounded-xl px-5 text-sm font-semibold transition-colors bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.22)]"
                >
                  Generate {bulkCount}
                </button>
                <button
                  type="button"
                  onClick={() => copyText(bulkOut.join("\n"))}
                  className="h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={generateOne}
                className="flex-1 h-11 rounded-xl px-5 text-sm font-semibold transition-colors bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 border border-[#9541e0]/60 text-white shadow-[0_10px_30px_rgba(149,65,224,0.22)]"
              >
                Generate comment
              </button>
              <button
                type="button"
                onClick={() => copyText(comment)}
                className="h-11 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="rounded-3xl border border-white/10 bg-gray-900/20 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Render preview</div>
              <div className="text-xs text-gray-400 mt-1">Designed to match the Instagram comment card style.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportInstagramCommentImage({ username, timeLabel, comment: previewComment, likes, replies: moreReplies })}
                className="h-10 rounded-xl border border-white/10 bg-black/30 hover:bg-black/40 text-white px-4 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                title="Export Image"
              >
                <Download className="h-4 w-4" />
                Export Image
              </button>
              <button type="button" className="h-10 w-10 rounded-full border border-white/10 bg-black/30 text-white/70 inline-flex items-center justify-center" title="Theme">
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-[radial-gradient(circle_at_top,#9541e0_0%,transparent_52%),radial-gradient(circle_at_bottom_right,#7c30c7_0%,transparent_55%)] p-[1px]">
            <div className="rounded-3xl bg-black/40 p-6 md:p-10 overflow-hidden">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl bg-white text-black px-7 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-gray-300/90 overflow-hidden">
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{username || "username"}</span>
                          <span className="text-sm text-gray-500">{timeLabel}</span>
                        </div>
                        <div className="mt-2 text-[15px] leading-[22px] text-gray-900">
                          {previewComment || "Write any comment and see what happens 😊"}
                        </div>
                        <div className="mt-3 text-[13px] text-gray-400">Reply</div>
                        <div className="mt-3 flex items-center gap-3 text-[13px] text-gray-400">
                          <div className="h-px w-12 bg-gray-200" />
                          <div>View {moreReplies} more replies</div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <Heart className="h-5 w-5 text-gray-500 ml-auto" />
                      <div className="mt-1 text-[13px] text-gray-500">{likes}</div>
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
            Tip: short comments + one clear emotion/question usually get more replies on Instagram.
          </div>
        </div>
      </div>
    </div>
  );
}

