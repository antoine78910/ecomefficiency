import NextLink from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const elevenLabsToc: TocItem[] = [
  { id: "elevenlabs-definition", label: "What is ElevenLabs?" },
  { id: "elevenlabs-use-cases", label: "What it’s used for (practically)" },
  { id: "elevenlabs-features", label: "Key features" },
  { id: "elevenlabs-method", label: "Fast method (realistic ads)" },
  { id: "elevenlabs-why", label: "Why it’s powerful for ads" },
  { id: "elevenlabs-pricing", label: "Pricing & bundles" },
  { id: "elevenlabs-limits", label: "Limits & common mistakes" },
  { id: "elevenlabs-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const elevenLabsFaq = [
  { q: "Is ElevenLabs good for ads?", a: "Yes—it's one of the best tools for realistic ad voiceovers and fast script testing." },
  { q: "Does ElevenLabs sound human?", a: "Very—especially when you write natural scripts and control pacing and emotion." },
  { q: "Can I clone my own voice?", a: "Yes—when you have proper consent and rights to use that voice." },
  { q: "Is ElevenLabs beginner-friendly?", a: "Yes. The workflow is straightforward: script → voice → generate → iterate." },
  { q: "Is ElevenLabs worth it?", a: "If you produce ads or demos regularly, it usually pays for itself by saving time and enabling more tests." },
] as const;

export default function ElevenLabsChapters() {
  return (
    <div className="space-y-10">
      <section id="elevenlabs-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is ElevenLabs?</h2>
        <p className="text-gray-300">
          <strong>ElevenLabs</strong> is an AI voice generation and voice cloning platform that creates ultra‑realistic speech from text. It’s widely used for ad
          voiceovers, UGC‑style narrations, product demos, and explainer content—without hiring voice actors. The goal is to scale without shady shortcuts and
          without hurting your credibility.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Core idea</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Turn text into natural, believable speech (not robotic)</li>
              <li>Make voice production scalable for creative testing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>ElevenLabs review</li>
              <li>ElevenLabs pricing</li>
              <li>AI voice generator</li>
              <li>AI voiceover for ads</li>
              <li>Realistic text-to-speech</li>
              <li>AI voice cloning</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="elevenlabs-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is ElevenLabs used for (practically)?</h2>
        <p className="text-gray-300">
          ElevenLabs is used to replace or scale voice production. It helps you create more creatives, faster—without voice actor bottlenecks.
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Produce ads faster</strong> (voiceovers in minutes)
          </li>
          <li>
            <strong>Test more creatives</strong> (same visuals, different scripts)
          </li>
          <li>
            <strong>Localize ads</strong> (multiple languages and accents)
          </li>
          <li>
            <strong>Keep voice consistency</strong> across campaigns
          </li>
          <li>
            <strong>Reduce cost & friction</strong> vs repeated recordings
          </li>
        </ul>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">High-signal questions ElevenLabs answers</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>How can I create ads without hiring voice actors?</li>
            <li>How do I make AI voices sound human?</li>
            <li>How can I scale voiceovers fast?</li>
            <li>How do I localize ads into multiple languages?</li>
            <li>How do I keep the same “voice identity” across ads?</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Typical use cases</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>TikTok & Meta ads voiceovers</li>
            <li>UGC-style product videos (without creators)</li>
            <li>SaaS demos & walkthroughs</li>
            <li>Explainers and landing page videos</li>
            <li>International scaling</li>
          </ul>
        </div>
      </section>

      <section id="elevenlabs-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of ElevenLabs</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🗣️ Ultra‑realistic text‑to‑speech</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Natural intonation & pacing</li>
              <li>Emotional nuance (less “AI tone”)</li>
              <li>High audio quality</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧬 Voice cloning</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Clone a real voice (with consent)</li>
              <li>Consistent voice across creatives</li>
              <li>Brand voice identity</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🌍 Multilingual & accents</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Multiple languages</li>
              <li>Native‑sounding accents</li>
              <li>Same “voice identity” across locales</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">⚡ Fast iteration</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Generate audio in seconds</li>
              <li>Quick script tweaks (no re-recording)</li>
              <li>A/B test hooks and scripts easily</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            AI voice generator, text to speech, voice cloning, ad voiceover, UGC narration, product demo voice, multilingual ads, realistic AI voice, script testing.
          </p>
        </div>
      </section>

      <section id="elevenlabs-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: create realistic ads with ElevenLabs</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Write a natural script</strong>: conversational beats polished marketing copy.
            </li>
            <li>
              <strong>Pick or clone a voice</strong>: UGC-style voices often perform better than “radio” voices.
            </li>
            <li>
              <strong>Control pacing & emotion</strong>: short pauses + controlled emphasis feel more human.
            </li>
            <li>
              <strong>Pair with visuals</strong>: demo, screen recording, or UGC video.
            </li>
            <li>
              <strong>Test variations</strong>: same visual, different hooks & scripts.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick ad checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Conversational tone</li>
            <li>Short sentences</li>
            <li>Clear hook in first 3 seconds</li>
            <li>No over‑polished delivery</li>
            <li>Sync voice with on‑screen action</li>
            <li>Platform‑native format</li>
          </ul>
        </div>
      </section>

      <section id="elevenlabs-why" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 Why ElevenLabs is powerful for ads & product demos</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>UGC-style ads without creators</li>
          <li>Product demos without speaking on camera</li>
          <li>Fast A/B testing scripts</li>
          <li>International scaling</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          It removes one of the biggest creative bottlenecks: voice production.
        </div>
      </section>

      <section id="elevenlabs-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 ElevenLabs pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            ElevenLabs is subscription‑based, commonly ranging from <strong>$5 to $99/month</strong> depending on character limits, voice cloning access, and usage
            volume.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Included value in Ecom Efficiency</div>
            <p className="mt-2 text-gray-300">
              In the Ecom Efficiency bundle, ElevenLabs is listed at <strong>$220/month value</strong> (as shown in the landing page billing receipt).
            </p>
            <p className="mt-2 text-gray-300">
              You also get an <strong>additional credits account</strong> (extra credits for heavy usage), so you can iterate without constantly worrying about
              running out.
            </p>
          </div>
          <p className="mt-3">
            If you want ElevenLabs combined with spy tools, creative tools, SEO & AI, you can access it via{" "}
            <NextLink href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              Ecom Efficiency
            </NextLink>
            .
          </p>
        </div>
      </section>

      <section id="elevenlabs-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Voice only (no video)</li>
              <li>Script quality matters a lot</li>
              <li>Pacing is key for human feel</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Writing robotic scripts</li>
              <li>Overusing dramatic voices</li>
              <li>Using long paragraphs</li>
              <li>Not matching voice tone with visuals</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="elevenlabs-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 ElevenLabs alternatives (depending on your needs)</h2>
        <p className="text-gray-300">ElevenLabs stands out for realism and emotional tone. Alternatives/complements:</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>Play.ht: text-to-speech alternative</li>
          <li>WellSaid: corporate voiceovers</li>
          <li>Descript: editing + voice</li>
          <li>Murf.ai: business narration</li>
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {elevenLabsFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            ElevenLabs is a creative force multiplier. If you want to produce more ads, test faster, sound more human, and scale without creators, it’s one of the
            most valuable AI tools you can add to your stack.
          </p>
          <p className="mt-3 text-gray-300">
            To access it alongside other tools in one place, you can{" "}
            <NextLink href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create an account">
              create an account
            </NextLink>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

