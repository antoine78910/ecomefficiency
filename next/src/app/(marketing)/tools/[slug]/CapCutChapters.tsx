import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const capcutToc: TocItem[] = [
  { id: "capcut-definition", label: "What is CapCut?" },
  { id: "capcut-use-cases", label: "What it’s used for (practically)" },
  { id: "capcut-features", label: "Key features" },
  { id: "capcut-method", label: "Fast method (ads & shorts)" },
  { id: "capcut-stack", label: "Best workflow (stack)" },
  { id: "capcut-pricing", label: "Pricing & how to pay less" },
  { id: "capcut-limits", label: "Limits & common mistakes" },
  { id: "capcut-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const capcutFaq = [
  { q: "Is CapCut good for ads?", a: "Yes—especially for UGC-style and short-form ads where pacing, captions, and hooks matter." },
  { q: "Is CapCut beginner-friendly?", a: "Very. It’s one of the easiest editors for TikTok/Reels/Shorts workflows." },
  { q: "Does CapCut work on desktop & mobile?", a: "Yes. Both desktop and mobile versions are supported." },
  { q: "Is CapCut better than Premiere for TikTok?", a: "For speed and trend-driven editing, yes. Premiere is stronger for long-form, complex timelines." },
  { q: "Is CapCut worth it?", a: "Absolutely—especially at its price point. The free plan is already very usable." },
] as const;

export default function CapCutChapters() {
  return (
    <div className="space-y-10">
      <section id="capcut-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is CapCut?</h2>
        <p className="text-gray-300">
          <strong>CapCut</strong> is a video editing platform by ByteDance built for <strong>short-form</strong> content, social videos, and ads. It combines manual
          editing with AI-powered features, making it one of the most accessible editors for creators, brands, and advertisers.
        </p>
        <p className="mt-3 text-gray-300">
          Core idea: edit, enhance, and publish platform-native videos fast—without needing professional editing skills. CapCut is especially strong for{" "}
          <strong>TikTok</strong>, <strong>Reels</strong>, <strong>Shorts</strong>, and UGC-style ads.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TikTok / Reels / Shorts videos</li>
              <li>UGC-style ads</li>
              <li>Product demo videos</li>
              <li>Subtitled talking-head videos</li>
              <li>Trend-based social content</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>CapCut review</li>
              <li>CapCut pricing</li>
              <li>Video editor for TikTok</li>
              <li>Short-form video editor</li>
              <li>CapCut for ads</li>
              <li>CapCut alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="capcut-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is CapCut used for (practically)?</h2>
        <p className="text-gray-300">
          CapCut is used to edit and adapt videos for social platforms—both organic and paid. It’s the “fast execution” layer for creators and brands.
        </p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Edit videos quickly without complexity</li>
              <li>Follow platform trends & formats</li>
              <li>Add subtitles, effects, and transitions</li>
              <li>Create ads without hiring editors</li>
              <li>Iterate creatives faster</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TikTok & Instagram content</li>
              <li>UGC-style ads</li>
              <li>Dropshipping video ads</li>
              <li>Creator & personal brand videos</li>
              <li>Fast creative testing</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions CapCut answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How do I edit TikTok videos easily?</li>
            <li>How do I add subtitles fast?</li>
            <li>How do I follow editing trends?</li>
            <li>How do I create ads without Premiere?</li>
            <li>How do I edit vertical videos properly?</li>
          </ul>
        </div>
      </section>

      <section id="capcut-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of CapCut</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">✂️ Video editing (manual control)</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Timeline-based editor</li>
              <li>Cuts, transitions, effects</li>
              <li>Speed control & zooms</li>
              <li>Vertical-first workflow</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 AI-powered tools</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Auto captions</li>
              <li>Background removal</li>
              <li>Text-to-speech</li>
              <li>Smart effects & templates</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎨 Templates & trends</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ready-made TikTok templates</li>
              <li>Trend-based effects</li>
              <li>Fast remixing</li>
              <li>Creator-friendly formats</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📱 Platform-native export</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Vertical & square ratios</li>
              <li>TikTok-optimized exports</li>
              <li>Social-ready resolution</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            video editing, CapCut editor, TikTok video editing, short-form video, UGC ads, subtitles, social media video, content creation.
          </p>
        </div>
      </section>

      <section id="capcut-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create ads or shorts with CapCut</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Import raw footage</strong>: UGC clip, screen recording, or product video.
            </li>
            <li>
              <strong>Cut aggressively</strong>: remove pauses; keep fast pacing.
            </li>
            <li>
              <strong>Add captions</strong>: auto-captions often improve retention massively.
            </li>
            <li>
              <strong>Apply light effects</strong>: zooms, text highlights, transitions (keep it clean).
            </li>
            <li>
              <strong>Export vertical</strong>: ready for TikTok, Reels, Shorts—or ads.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick editing checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Hook in first 2–3 seconds</li>
            <li>No dead time</li>
            <li>Subtitles on</li>
            <li>Mobile-first framing</li>
            <li>Simple CTA</li>
            <li>Platform-native pacing</li>
          </ul>
        </div>
      </section>

      <section id="capcut-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How CapCut fits into a winning ads & content stack</h2>
        <p className="text-gray-300">CapCut is a core execution tool. A simple, high-velocity workflow:</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Create or generate raw videos (UGC, AI, demos).</li>
            <li>Edit & polish with CapCut (cuts, pacing, captions).</li>
            <li>Add effects & trend elements lightly.</li>
            <li>Publish organically or run paid ads.</li>
            <li>Iterate based on retention and performance.</li>
          </ol>
        </div>
        <p className="mt-3 text-gray-300">It pairs well with:</p>
        <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
          <li>
            <Link href="/tools/sendshort" className="text-purple-200 hover:text-white underline underline-offset-4" title="SendShort tool page">
              SendShort
            </Link>{" "}
            (repurposing)
          </li>
          <li>
            <Link href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
              Vmake
            </Link>{" "}
            /{" "}
            <Link href="/tools/heygen" className="text-purple-200 hover:text-white underline underline-offset-4" title="HeyGen tool page">
              HeyGen
            </Link>{" "}
            (UGC generation)
          </li>
          <li>
            <Link href="/tools/elevenlabs" className="text-purple-200 hover:text-white underline underline-offset-4" title="ElevenLabs tool page">
              ElevenLabs
            </Link>{" "}
            (voiceovers)
          </li>
          <li>
            <Link href="/tools/foreplay" className="text-purple-200 hover:text-white underline underline-offset-4" title="Foreplay tool page">
              Foreplay
            </Link>{" "}
            (creative organization)
          </li>
        </ul>
      </section>

      <section id="capcut-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 CapCut pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            CapCut offers a <strong>free plan</strong> that’s very usable. CapCut Pro is typically around <strong>$7 to $15/month</strong>, unlocking premium effects,
            templates, and assets.
          </p>
          <p className="mt-3">
            If you want CapCut combined with spy, creative, SEO & AI tools, you can access it via{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing page">
              Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="capcut-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Manual editing is still required</li>
              <li>Not built for long-form cinematic projects</li>
              <li>Heavy effects can reduce ad performance</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Overusing effects & transitions</li>
              <li>Ignoring hook quality</li>
              <li>Leaving dead time</li>
              <li>Editing like YouTube instead of TikTok</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="capcut-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 CapCut alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Veed.io → browser-based editor</li>
            <li>
              <Link href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
                Vmake
              </Link>{" "}
              → AI ecommerce video creation
            </li>
            <li>
              <Link href="/tools/higgsfield" className="text-purple-200 hover:text-white underline underline-offset-4" title="Higgsfield tool page">
                Higgsfield
              </Link>{" "}
              → cinematic AI video ads
            </li>
            <li>Premiere Pro → professional long-form editing</li>
          </ul>
          <p className="mt-3 text-gray-300">
            CapCut shines when <strong>speed + social-first editing</strong> matter.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {capcutFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            CapCut is a short-form video workhorse. If you want to edit TikToks & Reels fast, follow trends easily, create ads without complexity, and iterate
            creatives quickly, it’s one of the best tools you can use.
          </p>
        </div>
      </section>
    </div>
  );
}

