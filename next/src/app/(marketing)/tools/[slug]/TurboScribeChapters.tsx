import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const turboscribeToc: TocItem[] = [
  { id: "turboscribe-definition", label: "What is TurboScribe?" },
  { id: "turboscribe-use-cases", label: "What it’s for (practical)" },
  { id: "turboscribe-features", label: "Key features" },
  { id: "turboscribe-method", label: "Fast method (repurposing)" },
  { id: "turboscribe-stack", label: "How it fits in your stack" },
  { id: "turboscribe-pricing", label: "Pricing & bundles" },
  { id: "turboscribe-limits", label: "Limits & common mistakes" },
  { id: "turboscribe-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const turboscribeFaq = [
  { q: "Is TurboScribe accurate?", a: "Yes — it’s very solid for most content use cases (podcasts, interviews, YouTube, calls). Always review before publishing." },
  { q: "Can TurboScribe transcribe videos?", a: "Yes — audio & video files are supported, so you can transcribe long videos as well." },
  { q: "Is TurboScribe beginner-friendly?", a: "Yes — the workflow is simple: upload → transcribe → copy/export." },
  { q: "Is TurboScribe good for content creators?", a: "Absolutely — it’s built for repurposing: transcript → summary → captions → blog drafts." },
  { q: "Is TurboScribe worth it?", a: "If you work with audio or video regularly, yes. It saves time and turns spoken content into scalable written assets." },
] as const;

export default function TurboScribeChapters() {
  return (
    <div className="space-y-10">
      <section id="turboscribe-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is TurboScribe?</h2>
        <p className="text-gray-300">
          <strong>TurboScribe</strong> is an <strong>AI transcription + summarization tool</strong> that converts audio and video into accurate, readable text at
          scale. It’s built for speed, accuracy, and simplicity (not heavy editing workflows).
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">Turn long audio or video into usable text assets (transcripts, summaries, captions) in minutes.</p>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can create fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Full audio & video transcripts</li>
              <li>Clean summaries of long recordings</li>
              <li>Meeting notes & highlights</li>
              <li>Blog-ready text from videos</li>
              <li>Captions & subtitles source files</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>TurboScribe review</li>
              <li>TurboScribe pricing</li>
              <li>AI transcription tool</li>
              <li>audio to text AI</li>
              <li>video transcription software</li>
              <li>transcribe podcasts & videos</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="turboscribe-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is TurboScribe used for (practically)?</h2>
        <p className="text-gray-300">TurboScribe is used to repurpose spoken content into text.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Save hours</strong> of manual transcription.
          </li>
          <li>
            <strong>Turn videos into articles</strong> or scripts.
          </li>
          <li>
            <strong>Create captions</strong> and subtitles faster.
          </li>
          <li>
            <strong>Extract insights</strong> from meetings or calls.
          </li>
          <li>
            <strong>Feed content pipelines</strong> (SEO, ads, social) with text.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Podcast & YouTube transcription</li>
              <li>Content repurposing (blogs, posts, emails)</li>
              <li>Subtitles & captions generation</li>
              <li>Meetings & interviews summaries</li>
              <li>Research & documentation</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal questions it answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How do I transcribe long videos fast?</li>
              <li>How can I turn audio into usable text?</li>
              <li>How do I summarize long recordings?</li>
              <li>How do I create captions without typing?</li>
              <li>How do I repurpose spoken content?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="turboscribe-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of TurboScribe</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎧 AI transcription</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Audio & video to text</li>
              <li>High accuracy</li>
              <li>Multiple formats supported</li>
              <li>Clean, readable output</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 AI summaries</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Long content condensed</li>
              <li>Key points extraction</li>
              <li>Fast understanding</li>
              <li>Useful for briefs & notes</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🗣️ Speaker detection</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Multiple speaker separation</li>
              <li>Clear attribution</li>
              <li>Better readability</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📤 Export-ready text</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Copy/paste friendly</li>
              <li>Blog & doc ready</li>
              <li>Subtitle-friendly output</li>
              <li>Easy to integrate into workflows</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            AI transcription, audio to text, video transcription, content repurposing, meeting notes, subtitles, summaries, speech to text.
          </p>
        </div>
      </section>

      <section id="turboscribe-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: repurpose content with TurboScribe</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Upload</strong> audio or video (podcast, YouTube, call, demo).
            </li>
            <li>
              <strong>Generate transcript</strong> in minutes.
            </li>
            <li>
              <strong>Create a summary</strong> to extract key ideas & structure.
            </li>
            <li>
              <strong>Reuse the text</strong> for blogs, captions, scripts, emails.
            </li>
            <li>
              <strong>Pair with other tools</strong> for editing, shorts, voiceovers, and distribution.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick content checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear audio source</li>
            <li>Minimal background noise</li>
            <li>Speaker separation enabled</li>
            <li>Summary checked for accuracy</li>
            <li>Text adapted to final use</li>
          </ul>
        </div>
      </section>

      <section id="turboscribe-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How TurboScribe fits into a winning content & ads stack</h2>
        <p className="text-gray-300">
          TurboScribe is a <strong>foundation repurposing tool</strong>. Record once, then repurpose into multiple formats.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Record long-form content once</li>
            <li>Transcribe with TurboScribe</li>
            <li>Turn text into blogs, posts, scripts</li>
            <li>Create shorts & ads from the same source</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs perfectly with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>
              <Link href="/tools/sendshort" className="text-purple-200 hover:text-white underline underline-offset-4" title="SendShort tool page">
                SendShort
              </Link>{" "}
              (short-form clips)
            </li>
            <li>
              <Link href="/tools/capcut" className="text-purple-200 hover:text-white underline underline-offset-4" title="CapCut tool page">
                CapCut
              </Link>{" "}
              (video editing)
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
        </div>
      </section>

      <section id="turboscribe-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 TurboScribe pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            TurboScribe is known for <strong>affordable</strong> pricing and high-volume transcription. It’s typically around <strong>$10–$20/month</strong>{" "}
            depending on the plan.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-semibold">Included value (bundle)</div>
              <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
                <li>
                  <strong>TurboScribe</strong>: $20/month value
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-semibold">Bundle note</div>
              <p className="mt-2 text-gray-300">
                If you want TurboScribe combined with SPY, creative, SEO & AI tools, you can access it via <strong>Ecom Efficiency</strong>.
              </p>
            </div>
          </div>
          <p className="mt-2">
            You can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="turboscribe-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Transcription quality depends on audio quality</li>
              <li>It’s not a full video editor</li>
              <li>Publishing still needs human review</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Uploading noisy audio</li>
              <li>Publishing raw transcripts without editing</li>
              <li>Ignoring summaries (they save the most time)</li>
              <li>Not repurposing content fully</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="turboscribe-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 TurboScribe alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Descript: editing + transcription</li>
          <li>Otter.ai: meetings & calls</li>
          <li>Whisper: open-source transcription</li>
          <li>Sonix: professional transcription</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          TurboScribe shines when <strong>speed + volume + simplicity</strong> matter.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {turboscribeFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            TurboScribe is a <strong>content repurposing accelerator</strong>. Used correctly, it turns spoken content into scalable written assets—without friction.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Try Ecom Efficiency now">
              create an account
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

