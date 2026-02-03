import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const brainFmToc: TocItem[] = [
  { id: "brainfm-definition", label: "What is Brain.fm?" },
  { id: "brainfm-use-cases", label: "What it’s for (practical)" },
  { id: "brainfm-features", label: "Key features" },
  { id: "brainfm-method", label: "Fast method (productivity)" },
  { id: "brainfm-stack", label: "How it fits in your stack" },
  { id: "brainfm-pricing", label: "Pricing & bundles" },
  { id: "brainfm-limits", label: "Limits & common mistakes" },
  { id: "brainfm-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const brainFmFaq = [
  { q: "Does Brain.fm really help focus?", a: "Many users report improved concentration and deeper work sessions. Results vary by person and habits." },
  { q: "Is Brain.fm worth paying for?", a: "If you regularly do deep work (writing, coding, editing), yes — it can improve consistency and reduce distractions." },
  { q: "Can Brain.fm help with sleep?", a: "Yes — it includes a dedicated Sleep mode designed to support faster sleep onset and deeper rest." },
  { q: "Does Brain.fm require headphones?", a: "Best results are with headphones (ideally noise-cancelling), though speakers can work too." },
  { q: "Is Brain.fm beginner-friendly?", a: "Very — choose a mode, set a duration, press play." },
] as const;

export default function BrainFmChapters() {
  return (
    <div className="space-y-10">
      <section id="brainfm-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is Brain.fm?</h2>
        <p className="text-gray-300">
          <strong>Brain.fm</strong> is a <strong>science-backed audio platform</strong> that delivers functional music designed to improve focus, relaxation, and
          sleep.
        </p>
        <p className="mt-3 text-gray-300">
          It uses specially engineered sound patterns to help your brain enter optimal states of attention or rest, without distractions.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">
            Replace random background music with neuro-optimized audio that improves performance — whether you’re writing content, coding, editing videos, or
            strategizing.
          </p>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can achieve fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Deep focus for writing or editing</li>
              <li>Reduced distractions</li>
              <li>Faster work sessions</li>
              <li>Calmer relaxation or meditation</li>
              <li>Better sleep & recovery</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Brain.fm review</li>
              <li>Brain.fm pricing</li>
              <li>focus music tool</li>
              <li>concentration music AI</li>
              <li>productivity audio platform</li>
              <li>Brain.fm alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="brainfm-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is Brain.fm used for (practically)?</h2>
        <p className="text-gray-300">Brain.fm is used to improve mental states during work, study, rest, and recovery.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Stay focused</strong> during writing or editing.
          </li>
          <li>
            <strong>Power through</strong> long creative sessions.
          </li>
          <li>
            <strong>Reduce cognitive fatigue</strong> with structured sessions.
          </li>
          <li>
            <strong>Fall asleep faster</strong> at night.
          </li>
          <li>
            <strong>Calm stress</strong> with relaxation modes.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Deep writing (blogs, scripts, copy)</li>
              <li>Coding & technical work</li>
              <li>Editing videos or design work</li>
              <li>Meetings or strategizing</li>
              <li>Sleep & wind-down routines</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal questions it answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How do I stay focused without distractions?</li>
              <li>Can music really improve concentration?</li>
              <li>Which audio helps me get into flow state?</li>
              <li>Is Brain.fm better than playlists?</li>
              <li>How long does the effect last?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="brainfm-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of Brain.fm</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🎧 Functional focus music</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Audio engineered for concentration</li>
              <li>Beat patterns that reduce mind-wandering</li>
              <li>No lyrics to distract</li>
              <li>Instant engagement</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Modes for performance</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Focus: deep work, writing, editing</li>
              <li>Relax: calm & stress reduction</li>
              <li>Sleep: fall asleep faster & deeper</li>
              <li>Meditate: mindful breathing support</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🪩 Session timers</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Custom work sessions</li>
              <li>Pomodoro-style productivity</li>
              <li>Built-in timers for structured work</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📱 Cross-platform access</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Mobile apps (iOS & Android)</li>
              <li>Desktop / web app</li>
              <li>Anytime, anywhere use</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            focus music, productivity audio, concentration tool, functional music, brain stimulation, flow state, creative performance, deep work tool.
          </p>
        </div>
      </section>

      <section id="brainfm-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: use Brain.fm for productivity</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Choose your mode</strong>: Focus, Relax, Sleep, or Meditate.
            </li>
            <li>
              <strong>Set a duration</strong>: 25, 50, 90+ minutes.
            </li>
            <li>
              <strong>Put on headphones</strong>: noise-cancelling is ideal.
            </li>
            <li>
              <strong>Start work or rest</strong>: let the audio guide your state.
            </li>
            <li>
              <strong>Review performance</strong>: notice how long you stayed focused/relaxed.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick setup checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Use quality headphones</li>
            <li>Work in uninterrupted chunks</li>
            <li>Avoid notifications during sessions</li>
            <li>Pair with Pomodoro timing</li>
            <li>Notice your own peak durations</li>
          </ul>
        </div>
      </section>

      <section id="brainfm-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How Brain.fm fits into a winning work stack</h2>
        <p className="text-gray-300">
          Brain.fm is a <strong>performance support tool</strong>. It’s not a design or data tool — but it amplifies your productivity when using them.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Before deep work: choose Focus</li>
            <li>During content creation: use 25–50 minute sessions</li>
            <li>For sleep: switch to Sleep mode</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs well with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>ChatGPT (writing & ideation)</li>
            <li>TurboScribe (content repurposing)</li>
            <li>Vmake / CapCut (editing tasks)</li>
          </ul>
        </div>
      </section>

      <section id="brainfm-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Brain.fm pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>Brain.fm typically offers a free trial and subscription plans around <strong>$6–$9/month</strong> when billed annually.</p>
          <p className="mt-2">
            If you want Brain.fm with SEO, spy, AI & ecommerce tools, you can bundle through <strong>Ecom Efficiency</strong> or similar stacks.
          </p>
          <p className="mt-2">
            You can check{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              the Ecom Efficiency bundle
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="brainfm-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Music supports focus — it’s not magic</li>
              <li>Individual responses vary</li>
              <li>Best combined with good workflow habits</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Expecting instant results every time</li>
              <li>Using short sessions without patterns</li>
              <li>Mixing audio with distracting stimuli</li>
              <li>Relying solely on music for focus</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="brainfm-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Brain.fm alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Noisli: background sounds for focus</li>
          <li>Calm / Headspace: meditation & sleep</li>
          <li>Focus@Will: curated productivity music</li>
          <li>Pomodoro timers: structured work sessions</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          Brain.fm shines when <strong>deep focus</strong> and performance support are the priority.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {brainFmFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Brain.fm is a <strong>productivity accelerator</strong>. Used correctly, it turns sound into performance enhancement — not noise.
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

