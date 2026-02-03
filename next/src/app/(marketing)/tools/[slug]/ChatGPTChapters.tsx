import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const chatgptToc: TocItem[] = [
  { id: "chatgpt-definition", label: "What is ChatGPT?" },
  { id: "chatgpt-use-cases", label: "What it’s for (practical)" },
  { id: "chatgpt-features", label: "Key features" },
  { id: "chatgpt-method", label: "Fast method (business use)" },
  { id: "chatgpt-stack", label: "How it fits in your stack" },
  { id: "chatgpt-pricing", label: "Pricing & bundles" },
  { id: "chatgpt-limits", label: "Limits & common mistakes" },
  { id: "chatgpt-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const chatgptFaq = [
  { q: "Is ChatGPT good for ads?", a: "Yes — especially for hooks, scripts, angles, and fast iteration. Always adapt to your brand voice and offer." },
  { q: "Is ChatGPT good for SEO?", a: "Yes, when you use structure (outline, intent, FAQs) and apply human review before publishing." },
  { q: "Can ChatGPT replace humans?", a: "No — but it multiplies human output. The best results come from strong inputs and good judgment." },
  { q: "Is ChatGPT beginner-friendly?", a: "Very — you don’t need technical skills. Start with clear context + a specific output format." },
  { q: "Is ChatGPT worth it?", a: "If you value speed and leverage, yes. It helps you think faster, write better, and systemize workflows." },
] as const;

export default function ChatGPTChapters() {
  return (
    <div className="space-y-10">
      <section id="chatgpt-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 What is ChatGPT?</h2>
        <p className="text-gray-300">
          <strong>ChatGPT</strong> is an <strong>AI-powered conversational assistant</strong> developed by OpenAI, designed to understand, generate, and structure
          text for a wide range of use cases.
        </p>
        <p className="mt-3 text-gray-300">
          It’s used daily by entrepreneurs, marketers, developers, creators, and teams to <strong>think faster</strong>, <strong>write better</strong>, and
          automate workflows.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Core idea</div>
          <p className="mt-2 text-gray-300">Turn ideas, questions, and raw inputs into clear, actionable outputs instantly.</p>
        </div>
        <p className="mt-3 text-gray-300">
          ChatGPT is not just a chatbot — it’s a <strong>thinking + execution layer</strong> across business, content, and tech.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">What you can do fast</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Write ads, scripts & UGC hooks</li>
              <li>Generate SEO articles & landing pages</li>
              <li>Brainstorm products & strategies</li>
              <li>Analyze data & ideas</li>
              <li>Assist with code & automation</li>
              <li>Summarize long documents</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>ChatGPT review</li>
              <li>ChatGPT pricing</li>
              <li>AI assistant for business</li>
              <li>AI writing tool</li>
              <li>ChatGPT for marketing</li>
              <li>ChatGPT alternatives</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="chatgpt-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 What is ChatGPT used for (practically)?</h2>
        <p className="text-gray-300">ChatGPT is used to accelerate thinking and execution.</p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Save time</strong> on writing & research.
          </li>
          <li>
            <strong>Structure</strong> messy ideas into a plan.
          </li>
          <li>
            <strong>Improve</strong> copy & messaging.
          </li>
          <li>
            <strong>Generate</strong> content at scale.
          </li>
          <li>
            <strong>Support</strong> technical & business decisions.
          </li>
        </ul>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">Typical use cases</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ads copy & creative angles</li>
              <li>SEO & content marketing</li>
              <li>Ecommerce product descriptions</li>
              <li>SaaS onboarding & documentation</li>
              <li>Code assistance & debugging</li>
              <li>Internal workflows & SOPs</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <div className="text-white font-semibold">High-signal questions it answers</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>How do I write better ads faster?</li>
              <li>How do I structure a landing page?</li>
              <li>How do I generate content ideas?</li>
              <li>How do I explain this simply?</li>
              <li>How do I automate or optimize this workflow?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="chatgpt-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Key features of ChatGPT</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧠 Natural language understanding</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Human-like conversations</li>
              <li>Context awareness</li>
              <li>Structured reasoning</li>
              <li>Clear explanations</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">✍️ Content generation</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Ads, emails, blogs, scripts</li>
              <li>SEO-optimized structure</li>
              <li>Multilingual content</li>
              <li>Tone & style control</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🧩 Problem solving & analysis</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Strategy breakdowns</li>
              <li>Pros/cons analysis</li>
              <li>Market & idea validation</li>
              <li>Logical reasoning</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">💻 Technical assistance</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Code generation & debugging</li>
              <li>API & automation help</li>
              <li>Data explanations</li>
              <li>Documentation support</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Vocabulary to cover (SEO-friendly)</div>
          <p className="mt-2 text-gray-300">
            AI assistant, AI writing tool, content generation, productivity AI, marketing automation, copywriting AI, business AI, conversational AI.
          </p>
        </div>
      </section>

      <section id="chatgpt-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Fast method: use ChatGPT effectively for business</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Give context</strong>: explain your goal, audience, and constraints.
            </li>
            <li>
              <strong>Ask structured questions</strong>: clear prompts = better outputs.
            </li>
            <li>
              <strong>Iterate</strong>: refine tone, format, and depth.
            </li>
            <li>
              <strong>Combine with execution tools</strong>: turn text into ads, pages, videos, or automations.
            </li>
            <li>
              <strong>Systemize</strong>: reuse prompts & workflows.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Quick productivity checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Clear objective</li>
            <li>Defined audience</li>
            <li>Specific output format</li>
            <li>Iterative refinement</li>
            <li>Human review before publishing</li>
          </ul>
        </div>
      </section>

      <section id="chatgpt-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 How ChatGPT fits into a winning ecommerce & ads stack</h2>
        <p className="text-gray-300">
          ChatGPT is a <strong>central brain tool</strong>. It helps you go from idea → structure → copy → execution faster.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <div className="text-white font-semibold">Best workflow</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Ideate products, offers & angles</li>
            <li>Write ads, scripts & SEO content</li>
            <li>Generate briefs for creatives & editors</li>
            <li>Support automation & scaling</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs perfectly with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Pipiads / Kalodata (data & demand)</li>
            <li>Atria / Foreplay (creative strategy)</li>
            <li>Vmake / HeyGen (video execution)</li>
            <li>SendShort (repurposing)</li>
          </ul>
        </div>
      </section>

      <section id="chatgpt-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 ChatGPT pricing (and how to pay less)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>ChatGPT offers a free plan (limited access) and paid plans (such as ChatGPT Plus) typically around <strong>$20/month</strong>.</p>
          <p className="mt-2">
            If you want ChatGPT alongside ecommerce, spy, SEO & AI tools, you can access it via <strong>Ecom Efficiency</strong>.
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

      <section id="chatgpt-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limits to know (and common mistakes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Realistic limits</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Outputs depend on prompt quality</li>
              <li>Not a source of guaranteed truth</li>
              <li>Needs human judgment</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Common mistakes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Asking vague questions</li>
              <li>Copy-pasting without adapting</li>
              <li>Using it as a single source of truth</li>
              <li>Not iterating prompts</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="chatgpt-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 ChatGPT alternatives (depending on your needs)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Claude: long-form reasoning & writing</li>
          <li>Gemini: Google ecosystem & research</li>
          <li>Perplexity: search-focused AI</li>
          <li>Copilot: code-first assistance</li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          ChatGPT stands out for <strong>versatility</strong> and ecosystem maturity.
        </div>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {chatgptFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            ChatGPT is a <strong>force multiplier</strong>. Used correctly, it turns questions into clarity and ideas into action — at scale.
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

