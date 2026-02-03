import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const sendShortToc: TocItem[] = [
  { id: "sendshort-definition", label: "What is SendShort?" },
  { id: "sendshort-use-cases", label: "What it’s for (practical)" },
  { id: "sendshort-features", label: "Key features" },
  { id: "sendshort-method", label: "Fast method (scale content)" },
  { id: "sendshort-stack", label: "Best workflow (stack)" },
  { id: "sendshort-pricing", label: "Pricing & how to pay less" },
  { id: "sendshort-limits", label: "Limits & common mistakes" },
  { id: "sendshort-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const sendShortFaq = [
  { q: "Is SendShort good for TikTok?", a: "Yes—SendShort is built for short-form platforms (TikTok, Reels, Shorts) with vertical exports and burned-in captions." },
  { q: "Does SendShort add subtitles automatically?", a: "Yes. It generates burned‑in captions with mobile-first readability, without manual syncing." },
  { q: "Is SendShort beginner-friendly?", a: "Very. Upload a long video, let the AI generate clips, tweak if needed, and export." },
  { q: "Can SendShort be used for ads?", a: "Yes—especially for UGC-style creatives and high-velocity testing where you need new hooks weekly." },
  { q: "Is SendShort worth it?", a: "If you publish regularly (organic or ads), it usually pays for itself by saving hours of editing and enabling more iterations." },
] as const;

export default function SendShortChapters() {
  return (
    <div className="space-y-10">
      <section id="sendshort-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is SendShort?</h2>
        <p className="text-gray-300">
          <strong>SendShort</strong> is a <strong>short-form video automation</strong> platform designed to turn long videos into viral-ready{" "}
          <strong>Shorts, Reels, and TikToks</strong> using AI. It focuses on speed, consistency, and scale for creators, brands, and advertisers who rely on
          short-form content to drive traffic and conversions.
        </p>
        <p className="mt-3 text-gray-300">
          The goal is to scale content on competitive platforms <strong>without shortcuts</strong>, without gimmicks, and without destroying credibility—by
          removing the editing bottleneck.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <p className="mt-2 text-gray-300">
              Repurpose long content into high-performing short videos automatically—without manual editing.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TikTok / Reels / Shorts clips</li>
              <li>Subtitled short-form videos</li>
              <li>Highlight clips from long videos</li>
              <li>Hook-focused variations</li>
              <li>Batches ready to post</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>SendShort review</li>
              <li>SendShort pricing</li>
              <li>Short-form video automation</li>
              <li>AI shorts generator</li>
              <li>Repurpose videos for TikTok</li>
              <li>Create short videos with AI</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="sendshort-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is SendShort used for (practically)?</h2>
        <p className="text-gray-300">SendShort is used to scale short-form output when editing becomes a bottleneck.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Post consistently on TikTok, Reels & Shorts</li>
              <li>Turn podcasts, interviews, demos into clips</li>
              <li>Increase organic reach and retention</li>
              <li>Feed paid ads with fresh creatives</li>
              <li>Save hours of manual editing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Content repurposing (YouTube/podcasts → Shorts)</li>
              <li>TikTok & Reels organic growth</li>
              <li>UGC-style ads (high iteration)</li>
              <li>Podcast & YouTube clipping</li>
              <li>Founder & SaaS content</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions SendShort answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How do I turn long videos into Shorts fast?</li>
            <li>How can I post daily without an editor?</li>
            <li>How do I scale content across platforms?</li>
            <li>How do I add subtitles automatically?</li>
            <li>How do I extract the best moments from videos?</li>
          </ul>
        </div>
      </section>

      <section id="sendshort-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of SendShort</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">✂️ AI video clipping</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Automatic highlight detection</li>
              <li>Short-form optimized cuts</li>
              <li>Context-aware clipping</li>
              <li>Batch processing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">💬 Auto subtitles</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Burned-in captions</li>
              <li>Mobile-first readability</li>
              <li>Clean subtitle styles</li>
              <li>No manual syncing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎯 Hook-first structure</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Focus on first seconds</li>
              <li>Retention-oriented clipping</li>
              <li>Scroll-stopping intros</li>
              <li>Hook variations</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔁 Content scaling workflow</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Multiple clips per video</li>
              <li>Ready-to-post exports</li>
              <li>Platform-native ratios</li>
              <li>Batch content production</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            short form video, video repurposing, TikTok Shorts, Instagram Reels, AI video clips, subtitles, content automation, UGC videos.
          </p>
        </div>
      </section>

      <section id="sendshort-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: scale content with SendShort</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Upload a long video</strong>: podcast, interview, demo, webinar, or YouTube content.
            </li>
            <li>
              <strong>Let AI find highlights</strong>: SendShort detects moments worth clipping.
            </li>
            <li>
              <strong>Auto-generate subtitles</strong>: captions optimized for mobile viewing.
            </li>
            <li>
              <strong>Export vertical videos</strong>: TikTok, Reels & Shorts-ready.
            </li>
            <li>
              <strong>Post consistently</strong>: daily content without editing fatigue.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick content checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Strong hook in first 2–3 seconds</li>
            <li>Clear spoken message</li>
            <li>Subtitles always on</li>
            <li>Vertical framing</li>
            <li>Native pacing</li>
            <li>Test multiple versions</li>
          </ul>
        </div>
      </section>

      <section id="sendshort-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How SendShort fits into a winning content & ads stack</h2>
        <p className="text-gray-300">
          SendShort is an <strong>execution and scaling tool</strong>. It doesn’t replace strategy—it removes the production bottleneck so you can publish and test
          consistently.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ol className="mt-2 list-decimal list-inside space-y-2 text-gray-300">
            <li>Record long-form content once (podcast, demo, interview, webinar).</li>
            <li>Use SendShort to generate multiple shorts (different hooks).</li>
            <li>Post organically and/or run ads on the best-performing clips.</li>
            <li>Reuse winners across platforms (TikTok → Reels → Shorts).</li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Tools it pairs perfectly with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>
              <Link href="/tools/elevenlabs" className="text-purple-200 hover:text-white underline underline-offset-4" title="ElevenLabs tool page">
                ElevenLabs
              </Link>{" "}
              (voiceovers)
            </li>
            <li>
              <Link href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
                Vmake
              </Link>{" "}
              /{" "}
              <Link href="/tools/heygen" className="text-purple-200 hover:text-white underline underline-offset-4" title="HeyGen tool page">
                HeyGen
              </Link>{" "}
              (UGC and talking-head videos)
            </li>
            <li>
              <Link href="/tools/foreplay" className="text-purple-200 hover:text-white underline underline-offset-4" title="Foreplay tool page">
                Foreplay
              </Link>{" "}
              (creative organization)
            </li>
            <li>
              <Link href="/tools/capcut" className="text-purple-200 hover:text-white underline underline-offset-4" title="CapCut tool page">
                CapCut
              </Link>{" "}
              (manual editing when you need deeper creative direction)
            </li>
          </ul>
        </div>
      </section>

      <section id="sendshort-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 SendShort pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            SendShort is subscription-based, usually around <strong>$19 to $79/month</strong>, depending on:
          </p>
          <ul className="mt-3 list-disc list-inside space-y-1 text-gray-300">
            <li>Video volume</li>
            <li>Export limits</li>
            <li>Processing speed</li>
          </ul>
          <p className="mt-3 text-gray-300">
            If you want SendShort combined with spy, creative, SEO & AI tools in one bundle, you can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency stack
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="sendshort-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Needs good source content</li>
              <li>AI won’t replace creative judgment</li>
              <li>Best results with spoken content</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Uploading low-energy videos</li>
              <li>Ignoring hook optimization</li>
              <li>Posting clips without context</li>
              <li>Not testing multiple variations</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="sendshort-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 SendShort alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Opus Clip → AI clipping + virality scoring</li>
            <li>Descript → editing + transcription</li>
            <li>
              <Link href="/tools/capcut" className="text-purple-400 hover:text-purple-300 underline">
                CapCut
              </Link>{" "}
              → manual editing
            </li>
            <li>Veed.io → hybrid editing</li>
          </ul>
          <p className="mt-3 text-gray-300">
            SendShort shines when <strong>speed + volume</strong> matter most.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {sendShortFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            SendShort is a content multiplier. If you record long-form content and need daily shorts for organic reach or ads, it’s one of the most practical tools
            to scale output without hiring editors.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create an account">
              create an account
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

