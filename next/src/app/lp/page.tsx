import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import RevenueSimulator from "./RevenueSimulator";
import AutoRedirectToApp from "./AutoRedirectToApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "White-Label — Launch your SaaS in days | Ecom Efficiency",
  description:
    "Launch your own SaaS in days. White-label a fully operational SaaS under your brand, your Stripe, your rules — without tech, support, or operational hell.",
};

function isPartnersHost(hostHeader: string) {
  const hostname = (hostHeader || "").toLowerCase().split(":")[0].replace(/^www\./, "");
  return hostname === "partners.localhost" || hostname.startsWith("partners.");
}

function AnimatedPrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)]",
        "shadow-[0_4px_32px_0_rgba(149,65,224,0.70)]",
        "px-6 py-3 rounded-xl border border-[#9541e0] text-white font-medium",
        "hover:brightness-110 group overflow-hidden",
        "inline-flex items-center justify-center h-12",
        className,
      ].join(" ")}
    >
      <div className="relative overflow-hidden w-full text-center">
        <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
          {children}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
          {children}
        </span>
      </div>
    </Link>
  );
}

function AnimatedSecondaryButton({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className={[
        "cursor-pointer bg-white/10 hover:bg-white/20",
        "px-5 py-3 rounded-xl border border-white/20 text-white font-medium",
        "group overflow-hidden inline-flex items-center justify-center h-12",
      ].join(" ")}
    >
      <div className="relative overflow-hidden w-full text-center">
        <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
          {children}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
          {children}
        </span>
      </div>
    </Link>
  );
}

function VideoBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-8">
      <div className="max-w-2xl">
        <h3 className="text-2xl md:text-3xl font-bold text-white">{title}</h3>
        <p className="mt-2 text-gray-400">{subtitle}</p>
      </div>

      <div className="mt-6 relative mx-auto w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/demo.mp4"
          poster="/ecomefficiency.png"
          loop
          playsInline
          muted
          autoPlay
          preload="auto"
          controls={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>
    </div>
  );
}

export default async function PartnersLpPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";

  // Only serve this LP on partners.*
  if (!isPartnersHost(host)) redirect("/");

  const faq = [
    {
      q: "Is this an affiliate program?",
      a: "No. This is a real white-label SaaS. Your brand. Your Stripe. Your users.",
    },
    {
      q: "Do my users see Ecom Efficiency anywhere?",
      a: "No. We stay invisible. Your users never know we exist.",
    },
    {
      q: "How do payments work?",
      a: "You connect your own Stripe account. Revenue is split 50/50 with us — no setup fees, no upfront costs.",
    },
    {
      q: "Can I use a custom domain and my own email sender?",
      a: "Yes — custom domain + sending emails from your own address are part of the setup.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Auto-redirect authenticated users to /app */}
      <AutoRedirectToApp />
      
      {/* Top bar */}
      <nav className="bg-black/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
          <Link href="/lp" className="flex items-center gap-3">
            <Image
              src="/ecomefficiency.png"
              alt="Ecom Efficiency"
              width={160}
              height={64}
              className="h-12 w-auto mix-blend-screen"
              priority
            />
            <span className="hidden sm:inline text-sm text-white/70 border-l border-white/10 pl-3">White-Label</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-medium border border-white/15 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Sign in
            </Link>
            <a
              href="#request"
              className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.55)] px-4 py-2 rounded-xl border border-[#9541e0] text-white font-medium hover:brightness-110 group overflow-hidden inline-flex items-center justify-center h-10 text-sm"
            >
              <div className="relative overflow-hidden w-full text-center">
                <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Request White-Label Access
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Request White-Label Access
                </span>
              </div>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.35) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to bottom, white 0%, white 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, white 0%, white 55%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/25 to-transparent blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-4xl">
            <p className="text-sm text-purple-200/90">
              You focus on marketing & community. We handle everything painful.
            </p>

            <h1 className="mt-4 text-5xl md:text-7xl font-bold leading-[1.05] tracking-normal">
              Launch Your Own SaaS.
              <br />
              <span className="text-[#ab63ff] drop-shadow-[0_0_12px_rgba(171,99,255,0.35)]">Without Building One.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl">
              White-label a fully operational SaaS with 50+ premium e-commerce & AI tools, under your brand, your Stripe,
              your rules.
            </p>

            <p className="mt-4 text-sm text-gray-400">
              Used by communities, agencies & creators with thousands of users.
            </p>

            <div className="mt-8 flex flex-wrap gap-3" id="request">
              <AnimatedPrimaryButton href="/signup">Request White-Label Access</AnimatedPrimaryButton>
              <a
                href="#infrastructure"
                className="inline-flex items-center justify-center h-12 px-6 rounded-xl text-sm font-medium border border-white/15 bg-white/5 hover:bg-white/10 text-gray-200"
              >
                See the Infrastructure
              </a>
            </div>

            <VideoBlock
              title="Video #1 — “This is not a template. This is a real SaaS.”"
              subtitle="Dashboard · Tools library · User management · Billing section"
            />
          </div>
        </div>
      </header>

      {/* SECTION 2 — YOU OWN THE SAAS */}
      <section className="relative bg-black py-16 md:py-20" id="infrastructure">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/15 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">You Own the SaaS. We Stay Invisible.</h2>
            <p className="mt-4 text-gray-300">
              This is not an affiliate program. This is not co-branding.
              <br />
              <span className="text-white font-semibold">This is your SaaS.</span>
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6">
              <ul className="space-y-3 text-gray-200">
                {[
                  "Connect your own Stripe account",
                  "Use your custom domain",
                  "Send emails from your own email address",
                  "Your logo, your brand, your identity",
                  "No mention of us. Ever.",
                  "Your users never know we exist.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-purple-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <div className="text-sm font-semibold text-white">Why this matters</div>
              <div className="mt-2 text-sm text-gray-400 leading-relaxed">
                You sell under your brand and build long-term trust. We operate behind the scenes so you never end up in
                tech, support, or operational hell.
              </div>
            </div>
          </div>

          <VideoBlock
            title="Video #2 — Infra ownership"
            subtitle="Stripe connection · Custom domain · Email sender · Branding settings"
          />
        </div>
      </section>

      {/* SECTION 3 — FULLY CUSTOMISABLE */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Your SaaS. Your Rules.</h2>
            <p className="mt-4 text-gray-300">You decide how your SaaS looks, feels, and sells.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              "Edit pages & content",
              "Change colors, fonts & layout",
              "Set your own prices",
              "Create promo codes",
              "Run discounts & limited offers",
              "Decide who gets access to what",
            ].map((t) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6">
                <div className="text-white font-semibold">{t}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-gray-300">
            You are the CEO. <span className="text-white font-semibold">We are the backend.</span>
          </div>

          <VideoBlock
            title="Video #3 — Customisation"
            subtitle="Page builder · Content editing · Pricing change · Promo code creation"
          />
        </div>
      </section>

      {/* SECTION 4 — WE EARN WHEN YOU EARN */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">We Only Win If You Win.</h2>
            <p className="mt-4 text-gray-300">
              We take <span className="text-white font-semibold">50% of revenue</span>.
              <br />
              No setup fees. No upfront costs. No hidden charges.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-[#0d0e12] p-6 md:p-8">
            <div className="text-sm font-semibold text-white">What’s included in the 50%</div>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-200">
              {[
                "Customer support (tickets, issues, refunds)",
                "Tool licenses ($4,000+/month value)",
                "Infrastructure & servers",
                "Proxies & automation stack",
                "Adspower / browser environments",
                "Maintenance & updates",
                "New tools added monthly",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">✔️</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-gray-300">
              You sell. <span className="text-white font-semibold">We run everything else.</span>
            </div>
          </div>

          <VideoBlock
            title='Video #4 — “What happens behind the scenes”'
            subtitle="Support dashboard · Infra · Tools onboarding · Updates pipeline"
          />
        </div>
      </section>

      {/* SECTION 5 — YOU DO THE FUN PART */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">You Handle Marketing. We Handle the Pain.</h2>
            <p className="mt-4 text-gray-300">
              No dev team. No support headaches. No technical maintenance.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6">
              <div className="text-white font-semibold">You focus on</div>
              <ul className="mt-3 space-y-2 text-gray-300">
                {["Content", "Community", "Distribution", "Growth"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <div className="text-white font-semibold">We handle</div>
              <ul className="mt-3 space-y-2 text-gray-300">
                {["Bugs", "Uptime", "Angry users", "Billing issues", "Tools access"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — REVENUE SIMULATOR */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              You Could Be Earning — By Doing Almost Nothing.
            </h2>
            <p className="mt-4 text-gray-300">
              Plug your numbers. We split revenue 50/50. You keep the brand and the audience.
            </p>
          </div>

          <div className="mt-10">
            <RevenueSimulator />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <AnimatedPrimaryButton href="/signup">Launch Your SaaS</AnimatedPrimaryButton>
          </div>
        </div>
      </section>

      {/* SECTION 7 — PRICING */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Pricing (public plans you can resell)</h2>
            <p className="mt-4 text-gray-300">These are the plans your users will buy from you.</p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-7">
              <div className="text-2xl font-bold text-[#ab63ff]">Starter</div>
              <div className="mt-2 text-4xl font-bold text-white">$19.99</div>
              <div className="text-sm text-gray-400">/ month</div>
              <div className="mt-5 text-sm text-gray-300 font-semibold">Access to 40 e-commerce & AI tools</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {["Core tool library", "Standard access", "Great entry plan"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="text-green-400">✔️</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-2xl border border-purple-500/25 bg-[linear-gradient(180deg,#1c1826_0%,#121019_100%)] p-7 shadow-[0_0_0_1px_rgba(139,92,246,0.18)]">
              <div className="absolute -top-3 right-4 text-xs px-2 py-1 rounded-full bg-purple-500/80 text-white border border-white/10">
                Most Popular
              </div>
              <div className="text-2xl font-bold text-[#ab63ff]">Pro</div>
              <div className="mt-2 text-4xl font-bold text-white">$29.99</div>
              <div className="text-sm text-gray-400">/ month</div>
              <div className="mt-5 text-sm text-gray-300 font-semibold">Access to 50+ premium tools</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {["Everything in Starter", "Advanced tools & new releases", "Best value for most communities"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="text-green-400">✔️</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-6 max-w-4xl">
            <div className="text-white font-semibold">White-Label Partner Plan (private)</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {[
                "Custom onboarding",
                "Priority tool requests",
                "Early access to new features",
                "Dedicated Slack / Discord channel",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="text-green-400">✔️</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-gray-400">Pricing available on request.</div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — WHO IS THIS FOR */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Who is this for?</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {[
              "Creators with an audience",
              "Discord communities",
              "Agencies",
              "Educators / coaches",
              "SaaS founders who don’t want to build infra",
            ].map((t) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-[#0d0e12] p-6 text-gray-200">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + FINAL CTA */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Launch Your SaaS This Week.</h2>
            <p className="mt-4 text-gray-300">Request access or book a demo. You bring distribution — we bring the SaaS.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <AnimatedPrimaryButton href="/signup">Request White-Label Access</AnimatedPrimaryButton>
            <AnimatedSecondaryButton href="/signup">Book a Demo</AnimatedSecondaryButton>
          </div>

          <div className="mt-14 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center text-white">
              FAQ <span className="gradient-text">white-label</span>
            </h3>
            <div className="mt-8">
              <Accordion type="single" collapsible className="space-y-4">
                {faq.map((f, idx) => (
                  <AccordionItem
                    key={f.q}
                    value={`item-${idx}`}
                    className="bg-gray-900/50 border border-purple-500/20 rounded-lg px-6 backdrop-blur-sm"
                  >
                    <AccordionTrigger className="text-left text-white hover:text-purple-400 py-6 text-lg font-medium cursor-pointer">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300 pb-6 text-base leading-relaxed">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

