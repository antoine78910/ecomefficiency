import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const claudeToc: TocItem[] = [
  { id: "claude-definition", label: "What is Claude?" },
  { id: "claude-ecommerce", label: "Claude for ecommerce & ads" },
  { id: "claude-strengths", label: "Where Claude shines" },
  { id: "claude-workflow", label: "Operator workflow (step-by-step)" },
  { id: "claude-stack", label: "How it fits your stack" },
  { id: "claude-pricing", label: "Pricing & bundles" },
  { id: "claude-mistakes", label: "Mistakes & limits" },
  { id: "claude-vs-chatgpt", label: "Claude vs ChatGPT" },
  { id: "faq", label: "FAQ" },
];

export const claudeFaq = [
  {
    q: "Is Claude good for long product pages and policies?",
    a: "Yes — it handles long context well, which helps with structured pages, FAQs, and detailed briefs. Always fact-check anything customer-facing before publishing.",
  },
  {
    q: "Is Claude better than ChatGPT for ecommerce?",
    a: "It depends on the task. Many teams use Claude for nuanced writing and careful reasoning, and ChatGPT for speed and broad tooling. Testing both on your real prompts is the reliable answer.",
  },
  {
    q: "How much does Claude cost if I buy it directly?",
    a: "Anthropic offers multiple tiers; pricing changes by region and plan. Check Anthropic’s official pricing for current monthly rates, including higher tiers for heavy usage.",
  },
  {
    q: "Can Claude replace a copywriter?",
    a: "No — but it accelerates drafting and iteration. The best setup pairs AI output with brand guidelines and human review so quality and trust stay high.",
  },
  {
    q: "Is Claude safe for customer-facing content?",
    a: "Treat every draft as a first version: verify claims, compliance, and tone for your market. AI should support judgment, not replace it.",
  },
  {
    q: "Can I use Claude inside Ecom Efficiency?",
    a: "Yes — Claude is included on the Pro plan alongside other AI, spy, and SEO tools. See the pricing page for current plans and what’s included.",
  },
] as const;

export default function ClaudeChapters() {
  return (
    <div className="space-y-10">
      <section id="claude-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">What is Claude?</h2>
        <p className="text-gray-300">
          <strong>Claude</strong> is an <strong>AI assistant from Anthropic</strong> built for natural conversation, careful reasoning, and high-quality text output.
          Teams use it to move from rough notes to clear briefs, scripts, and decisions—without racing into sloppy shortcuts that hurt credibility.
        </p>
        <p className="mt-3 text-gray-300">
          For ecommerce and growth work, the goal is to scale output and clarity{" "}
          <strong>without dubious shortcuts</strong> that undermine trust—Claude fits teams that want structured thinking plus strong writing.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">In one line</div>
          <p className="mt-2 text-gray-300">
            Claude helps you think in paragraphs: constraints, trade-offs, and customer-safe wording—especially when the topic is nuanced or high stakes.
          </p>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Queries this page targets</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Claude AI review</li>
              <li>Claude vs ChatGPT for business</li>
              <li>Anthropic Claude pricing context</li>
              <li>AI assistant for long-form writing</li>
              <li>Claude for marketing and SEO drafts</li>
              <li>Claude for ecommerce operators</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Best for (constraints)</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Founders and small teams under time pressure</li>
              <li>Operators who publish copy, briefs, or support content</li>
              <li>Anyone comparing AI assistants under ~$100/mo standalone tiers</li>
              <li>Workflows that mix research, writing, and structured decisions</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="claude-ecommerce" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Claude for ecommerce & paid ads</h2>
        <p className="text-gray-300">
          Claude is especially useful when you need <strong>clear positioning</strong>, <strong>consistent tone</strong>, and{" "}
          <strong>repeatable prompts</strong> across products, landing pages, and ad angles.
        </p>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Offer &amp; landing copy</strong>: turn specs into benefits, objections into FAQs, and vague ideas into outlines.
          </li>
          <li>
            <strong>Ad creative briefs</strong>: hooks, scripts, and variations with constraints (brand voice, compliance, character limits).
          </li>
          <li>
            <strong>Email &amp; lifecycle</strong>: sequences, subject-line batches, and segmentation notes—then you edit for voice.
          </li>
          <li>
            <strong>SEO drafts</strong>: outlines, headings, and entity-rich sections—always reviewed before publish.
          </li>
        </ul>
      </section>

      <section id="claude-strengths" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Where Claude shines</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <h3 className="text-white font-semibold">Reasoning &amp; structure</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Breaking down decisions with pros, cons, and assumptions</li>
              <li>Turning messy inputs into SOPs and checklists</li>
              <li>Explaining trade-offs in plain language</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <h3 className="text-white font-semibold">Writing quality</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Long-form drafts with coherent structure</li>
              <li>Tone control for brand-sensitive copy</li>
              <li>Editing passes: tighten, simplify, or formalize</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <h3 className="text-white font-semibold">Operational fit</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Pairs with spy/research tools for grounded prompts</li>
              <li>Works well alongside voice/video tools in the same stack</li>
              <li>Strong when prompts include audience, offer, and constraints</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
            <h3 className="text-white font-semibold">Vocabulary (SEO-friendly)</h3>
            <p className="mt-2 text-gray-300">
              Anthropic Claude, AI writing assistant, long-context AI, AI for ecommerce, AI copywriting, conversational AI, Claude vs ChatGPT,
              marketing AI assistant.
            </p>
          </div>
        </div>
      </section>

      <section id="claude-workflow" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Fast operator workflow</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>State the outcome</strong> (e.g., “landing section for product X for shoppers in the EU”).
            </li>
            <li>
              <strong>Add constraints</strong>: tone, forbidden claims, length, and proof you can legally use.
            </li>
            <li>
              <strong>Ask for structure first</strong> (outline), then draft sections.
            </li>
            <li>
              <strong>Iterate</strong> with “tighter”, “more specific”, or “more beginner-friendly”.
            </li>
            <li>
              <strong>Human review</strong> for facts, compliance, and brand fit—especially for ads and money pages.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pre-publish checklist</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Claims match your product reality</li>
            <li>No unverifiable superlatives</li>
            <li>Locale &amp; currency correct</li>
            <li>Refund/support policies consistent</li>
            <li>CTA matches the page promise</li>
          </ul>
        </div>
      </section>

      <section id="claude-stack" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">How Claude fits an ecommerce &amp; ads stack</h2>
        <p className="text-gray-300">
          Claude is strongest when it sits between <strong>data</strong> and <strong>execution</strong>: research signals → decisions → copy → creative briefs.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Pairs well with</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>
              <Link href="/tools/chatgpt" className="text-purple-200 hover:text-white underline underline-offset-4" title="ChatGPT tool page">
                ChatGPT
              </Link>{" "}
              when you want rapid iteration or a second model perspective
            </li>
            <li>
              <Link href="/tools/pipiads" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pipiads tool page">
                Pipiads
              </Link>{" "}
              /{" "}
              <Link href="/tools/kalodata" className="text-purple-200 hover:text-white underline underline-offset-4" title="Kalodata tool page">
                Kalodata
              </Link>{" "}
              for creative and demand signals
            </li>
            <li>
              <Link href="/tools/heygen" className="text-purple-200 hover:text-white underline underline-offset-4" title="HeyGen tool page">
                HeyGen
              </Link>{" "}
              /{" "}
              <Link href="/tools/vmake" className="text-purple-200 hover:text-white underline underline-offset-4" title="Vmake tool page">
                Vmake
              </Link>{" "}
              for turning scripts into video
            </li>
          </ul>
        </div>
      </section>

      <section id="claude-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Pricing context &amp; bundles</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Anthropic sells Claude through multiple plans; <strong>exact prices depend on region, tier, and usage</strong>. Higher monthly tiers exist for teams
            and power users—verify on Anthropic’s official pricing page before budgeting.
          </p>
          <p className="mt-2">
            On this site’s landing comparison, <strong>Claude is shown at $100/month</strong> as a standalone retail-style line item to illustrate bundle value
            (not a guaranteed public catalog price for every country).
          </p>
          <p className="mt-2">
            To use Claude alongside ChatGPT, spy tools, SEO tools, and more in one membership, see{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Ecom Efficiency pricing">
              Ecom Efficiency pricing
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="claude-mistakes" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Common mistakes &amp; real limits</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Mistakes that waste time</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Vague prompts with no audience or offer</li>
              <li>Publishing first drafts without fact-checking</li>
              <li>Asking for “perfect” copy without brand examples</li>
              <li>Skipping legal/compliance review on regulated claims</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Limits to respect</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>AI can be wrong or outdated—verify critical facts</li>
              <li>Outputs reflect your prompt quality and constraints</li>
              <li>Not a substitute for legal, medical, or financial advice</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="claude-vs-chatgpt" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">Claude vs ChatGPT (practical)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900/30">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead>
              <tr className="border-b border-white/10 text-white">
                <th className="px-4 py-3 font-semibold">Dimension</th>
                <th className="px-4 py-3 font-semibold">Claude</th>
                <th className="px-4 py-3 font-semibold">ChatGPT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="px-4 py-3 font-medium text-gray-200">Best for</td>
                <td className="px-4 py-3">Long-form structure, careful wording, nuanced reasoning</td>
                <td className="px-4 py-3">Broad versatility, fast drafts, huge ecosystem</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="px-4 py-3 font-medium text-gray-200">Operator tip</td>
                <td className="px-4 py-3" colSpan={2}>
                  Many teams use <strong>both</strong>: one model for depth, another for speed—pick per task, measure outputs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-gray-400 text-sm">
          When ChatGPT is stronger for your workflow, use it; when you need more conservative structure and long-form polish, test Claude on the same prompt set.
        </p>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">FAQ</h2>
        <div className="space-y-3">
          {claudeFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Bottom line</div>
          <p className="mt-2 text-gray-300">
            Claude is a strong choice when your bottleneck is <strong>clarity + quality writing</strong>, not just speed. Pair it with solid inputs, reviews, and
            the rest of your ecommerce stack.
          </p>
          <p className="mt-3 text-gray-300">
            Ready to try the full bundle?{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Create your Ecom Efficiency account">
              Create an account
            </Link>{" "}
            and explore Pro access.
          </p>
        </div>
      </section>
    </div>
  );
}
