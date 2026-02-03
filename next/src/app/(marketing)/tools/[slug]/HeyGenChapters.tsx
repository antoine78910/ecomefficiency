import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const heygenToc: TocItem[] = [
  { id: "heygen-definition", label: "What is HeyGen?" },
  { id: "heygen-use-cases", label: "What it’s for (practical)" },
  { id: "heygen-features", label: "Key features" },
  { id: "heygen-method", label: "Fast method (UGC ads)" },
  { id: "heygen-stack", label: "Best workflow (stack)" },
  { id: "heygen-pricing", label: "Pricing & how to pay less" },
  { id: "heygen-limits", label: "Limits & common mistakes" },
  { id: "heygen-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
] as const;

export const heygenFaq = [
  { q: "Is HeyGen good for ads?", a: "Yes—especially for UGC-style talking-head ads where clarity and speed matter." },
  { q: "Does HeyGen look realistic?", a: "Yes, especially in mobile-first formats. Results improve with natural scripts and pacing." },
  { q: "Can HeyGen replace creators?", a: "For many ad and demo use cases, yes—particularly when filming is a bottleneck." },
  { q: "Is HeyGen beginner-friendly?", a: "Very. You write a script, pick an avatar/voice, generate, then test variations." },
  { q: "Is HeyGen worth it?", a: "If video production slows you down and you need scalable talking-head output, yes." },
] as const;

export default function HeyGenChapters() {
  return (
    <div className="space-y-10">
      <section id="heygen-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is HeyGen?</h2>
        <p className="text-gray-300">
          <strong>HeyGen</strong> is an <strong>AI avatar video</strong> platform that generates realistic talking-head videos from text—without cameras, actors, or
          studios. It’s widely used for UGC-style ads, product demos, explainers, and localization at scale.
        </p>
        <p className="mt-3 text-gray-300">
          Core idea: turn scripts into human-like video presenters that feel native to social platforms. It’s especially powerful for ads, onboarding, and demos
          where <strong>clarity + speed</strong> matter more than cinematic visuals.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <p className="mt-2 text-gray-300">Turn scripts into human-like presenters that feel native to social platforms.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Talking-head UGC ads</li>
              <li>Product demo videos</li>
              <li>Explainers & walkthroughs</li>
              <li>Multilingual video ads</li>
              <li>Founder-style content without filming</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>HeyGen review</li>
              <li>HeyGen pricing</li>
              <li>AI avatar video</li>
              <li>Talking head AI video</li>
              <li>UGC ads with AI</li>
              <li>AI presenter video</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="heygen-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is HeyGen used for (practically)?</h2>
        <p className="text-gray-300">HeyGen is used to scale video production when filming is a bottleneck.</p>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">What it helps you do</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Create UGC-style ads without creators</li>
              <li>Launch product demos fast</li>
              <li>Localize videos into multiple languages</li>
              <li>Keep a consistent presenter</li>
              <li>Reduce production & coordination costs</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TikTok & Meta ads</li>
              <li>SaaS demos & explainers</li>
              <li>E-commerce product walkthroughs</li>
              <li>International scaling</li>
              <li>Onboarding & landing page videos</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions HeyGen answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How do I create talking-head videos without filming?</li>
            <li>How do I scale UGC ads without creators?</li>
            <li>How do I localize video ads easily?</li>
            <li>How do I keep a consistent presenter?</li>
            <li>How do I create demo videos fast?</li>
          </ul>
        </div>
      </section>

      <section id="heygen-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of HeyGen</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧍 AI avatars (talking heads)</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Realistic presenters</li>
              <li>Multiple avatar styles</li>
              <li>Natural facial expressions</li>
              <li>Camera-ready framing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🗣️ Text-to-speech & voice control</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Natural-sounding voices</li>
              <li>Multiple languages & accents</li>
              <li>Lip sync from script</li>
              <li>Fast script-driven workflow</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🌍 Multilingual & localization</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Translate videos into many languages</li>
              <li>Same avatar, different markets</li>
              <li>Ideal for global ad scaling</li>
              <li>No re-recording needed</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">⚡ Fast production</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>No filming or editing timelines</li>
              <li>Quick script updates</li>
              <li>Batch video creation</li>
              <li>Ads-ready outputs</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly, no stuffing)</div>
          <p className="mt-2 text-gray-300">
            AI avatar video, talking head video, UGC ads, product demo video, AI presenter, multilingual video ads, explainer videos, video automation.
          </p>
        </div>
      </section>

      <section id="heygen-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create UGC ads with HeyGen</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Write a conversational script</strong>: short sentences, natural tone.
            </li>
            <li>
              <strong>Choose an avatar</strong>: UGC-style avatars often perform best for ads.
            </li>
            <li>
              <strong>Select voice & language</strong>: match your target market.
            </li>
            <li>
              <strong>Generate multiple versions</strong>: different hooks, same avatar.
            </li>
            <li>
              <strong>Launch & test</strong>: perfect for creative A/B testing.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick ad checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Human-sounding script</li>
            <li>Clear hook in first 3s</li>
            <li>Simple message</li>
            <li>Subtitles recommended</li>
            <li>Vertical format</li>
            <li>Platform-native pacing</li>
          </ul>
        </div>
      </section>

      <section id="heygen-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How HeyGen fits into a winning ads stack</h2>
        <p className="text-gray-300">HeyGen is an execution tool, not a research tool. Best workflow:</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Validate product & angle.</li>
            <li>Write short UGC-style scripts.</li>
            <li>Generate talking-head videos with HeyGen.</li>
            <li>Add product visuals / screen recordings as needed.</li>
            <li>Test ads quickly, then iterate winners.</li>
          </ol>
        </div>
        <p className="mt-3 text-gray-300">
          It pairs well with{" "}
          <Link
            href="/tools/elevenlabs"
            className="text-purple-200 hover:text-white underline underline-offset-4"
            title="ElevenLabs tool page"
          >
            ElevenLabs
          </Link>{" "}
          (voice),{" "}
          <Link
            href="/tools/sendshort"
            className="text-purple-200 hover:text-white underline underline-offset-4"
            title="SendShort tool page"
          >
            SendShort
          </Link>{" "}
          (repurposing), and{" "}
          <Link
            href="/tools/foreplay"
            className="text-purple-200 hover:text-white underline underline-offset-4"
            title="Foreplay tool page"
          >
            Foreplay
          </Link>{" "}
          (creative workflow).
        </p>
      </section>

      <section id="heygen-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 HeyGen pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            HeyGen is subscription-based, typically around <strong>$29 to $99/month</strong>, depending on minutes, avatar access, export quality, and commercial usage.
          </p>
          <p className="mt-3">
            If you want HeyGen combined with spy, creative, SEO & AI tools, you can access it via{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing page">
              Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="heygen-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Realistic limits</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Avatar-based (not real UGC)</li>
              <li>Script quality is critical</li>
              <li>Less emotional range than humans</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Common mistakes</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Writing robotic scripts</li>
              <li>Using long paragraphs</li>
              <li>Overloading with features</li>
              <li>Not testing multiple hooks</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="heygen-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 HeyGen alternatives (depending on your needs)</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <Link href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
                Vmake
              </Link>{" "}
              → ecommerce-focused video ads
            </li>
            <li>
              <Link href="/tools/higgsfield" className="text-purple-200 hover:text-white underline underline-offset-4" title="Higgsfield tool page">
                Higgsfield
              </Link>{" "}
              → cinematic AI video
            </li>
            <li>Synthesia → corporate explainers</li>
            <li>D-ID → avatar & face animation</li>
          </ul>
          <p className="mt-3 text-gray-300">
            HeyGen shines when <strong>clarity, speed, and scale</strong> matter most.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {heygenFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            HeyGen is a video production multiplier. If you want to create UGC-style ads without creators, scale demos & explainers, localize videos globally, and
            test creatives faster, it’s one of the most efficient AI video tools available.
          </p>
        </div>
      </section>
    </div>
  );
}

