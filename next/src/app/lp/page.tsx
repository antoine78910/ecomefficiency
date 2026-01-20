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

function VideoFrame({
  title,
  subtitle,
  src = "/demo.mp4",
  poster = "/ecomefficiency.png",
  showHeader = true,
}: {
  title: string;
  subtitle: string;
  src?: string;
  poster?: string;
  showHeader?: boolean;
}) {
  return (
    <div>
      {showHeader ? (
        <div className="max-w-2xl">
          <h3 className="text-2xl md:text-3xl font-bold text-white">{title}</h3>
          <p className="mt-2 text-gray-400">{subtitle}</p>
        </div>
      ) : null}

      <div className={(showHeader ? "mt-6 " : "") + "relative mx-auto w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-white/10 bg-black"}>
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={src}
          poster={poster}
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
      a: "You connect your own Stripe account. Revenue is split 50/50 with us with a 50% fees on every payment you receive on your stripe, no setup fees, no upfront costs.",
    },
    {
      q: "Can I use a custom domain and my own email sender?",
      a: "Yes — custom domain + sending emails from your own address are part of the setup.",
    },
    {
      q: "Can you build custom features or integrations if I need something specific?",
      a: "Yes. If you need a custom integration or feature, you can submit a request in our dedicated “Custom requests” section. We’ll review it with you and, when it makes sense, build what you need so the SaaS matches your vision.",
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
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-medium border border-white/15 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="cursor-pointer bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] shadow-[0_4px_24px_rgba(149,65,224,0.55)] px-4 py-2 rounded-xl border border-[#9541e0] text-white font-medium hover:brightness-110 group overflow-hidden inline-flex items-center justify-center h-10 text-sm"
            >
              <div className="relative overflow-hidden w-full text-center">
                <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Get started
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Get started
                </span>
              </div>
            </Link>
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
              <AnimatedPrimaryButton href="/signup">Launch your SaaS</AnimatedPrimaryButton>
              <a
                href="https://calendly.com/antod/partners-ecom-efficiency-demo"
                target="_blank"
                rel="noreferrer noopener"
                className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border border-white/20 text-white font-medium group overflow-hidden inline-flex items-center justify-center h-12"
              >
                <div className="relative overflow-hidden w-full text-center">
                  <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Book a demo
                  </span>
                  <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                    Book a demo
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION 1 — YOU OWN THE INFRA */}
      <section className="relative bg-black py-16 md:py-20" id="infrastructure">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/15 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">You Own the Infra</h2>
              <p className="mt-4 text-gray-300">
                Stripe, domain, email sender and data ownership — it’s your SaaS.
              </p>

              <ul className="mt-6 space-y-3 text-gray-200">
                {[
                  "Connect your own Stripe account",
                  "Use your custom domain",
                  "Send emails from your own email address",
                  "Own your data & export your full database anytime",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-purple-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:pt-2">
              <VideoFrame
                title="Video #1 — Infra ownership"
                subtitle="Stripe connection · Custom domain · Email sender · Data export"
                src="/partners-lp/infra.mp4"
                showHeader={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — PERSONALISE YOUR SAAS */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="order-2 lg:order-1 lg:pt-2">
              <VideoFrame
                title="Video #2 — Personalisation"
                subtitle="Colors · Title/subtitle · FAQ · Logo & favicon"
                src="/partners-lp/personalise.mp4"
                showHeader={false}
              />
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold text-white">Personalise Your SaaS</h2>
              <p className="mt-4 text-gray-300">Make it yours. Every detail, every color, every word.</p>

              <ul className="mt-6 space-y-3 text-gray-200">
                {[
                  "Colors & theme",
                  "Title & subtitle",
                  "FAQ",
                  "Logo & favicon",
                  "Landing content",
                  "Policies / support email",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-purple-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — YOUR SAAS YOUR RULES */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">Your SaaS. Your Rules.</h2>
              <p className="mt-4 text-gray-300">You decide how your SaaS looks, feels, and sells.</p>

              <ul className="mt-6 space-y-3 text-gray-200">
                {[
                  "Create promo codes",
                  "Choose your pricing (monthly/yearly)",
                  "Run discounts & limited offers",
                  "Control access & features",
                  "Manage subscriptions",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-purple-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:pt-2">
              <VideoFrame
                title="Video #3 — Your rules"
                subtitle="Promo codes · Pricing · Discounts · Access control"
                src="/partners-lp/rules.mp4"
                showHeader={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WE ONLY WIN IF YOU WIN */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">We Only Win If You Win.</h2>
            <p className="mt-4 text-gray-300">
              <span className="text-white font-semibold">50%</span> revenue share.
              <br />
              No setup fees. No upfront costs. No hidden charges.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-[#0d0e12] p-6 md:p-8">
            <div className="text-sm font-semibold text-white">What's included in the 50%</div>
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
        </div>
      </section>

      {/* SECTION 5 — REVENUE SIMULATOR */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              You Could Be Earning, By Doing Almost Nothing.
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

      {/* SECTION 6 — WHO IS THIS FOR */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-[1.2fr_.8fr] gap-8 md:gap-12 items-start">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-white">Who is this for?</h2>
                <p className="mt-4 text-gray-300 text-base max-w-2xl">
                  This white-label SaaS is designed for creators, communities, and agencies who want to sell a real product under their
                  brand, without building or supporting it, and help their communities with an all-in-one solution that adds value
                  without spending months building it.
                </p>
              </div>
              <div>
                <ul className="space-y-3 text-gray-100 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Launch fast, without a dev team
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Monetize your audience with recurring revenue
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-400">✓</span> Your brand, your Stripe, your users
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Creators / content businesses",
                  body: "Turn your audience into subscribers with a SaaS you fully brand and sell.",
                },
                {
                  title: "Discord & paid communities",
                  body: "Add a high-value offer to your community and grow MRR without extra ops.",
                },
                {
                  title: "Agencies",
                  body: "Bundle your services with software and keep clients longer with recurring plans.",
                },
                {
                  title: "Coaches & educators",
                  body: "Sell a real tool alongside your training — your students get results, you get recurring revenue.",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-white/10 bg-[#0d0f14] p-4">
                  <div className="text-white font-semibold mb-1 text-sm">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + FINAL CTA */}
      <section className="relative bg-black py-16 md:py-20">
        <div className="pointer-events-none absolute -bottom-16 left-1/2 -translate-x-1/2 h-80 w-[60rem] bg-gradient-to-t from-purple-600/20 to-transparent blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Launch Your SaaS This Week.</h2>
            <p className="mt-4 text-gray-300">
              Book a demo or request access. You bring distribution — we bring the SaaS.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <AnimatedPrimaryButton href="/signup">Get started</AnimatedPrimaryButton>
            <a
              href="https://calendly.com/antod/partners-ecom-efficiency-demo"
              target="_blank"
              rel="noreferrer noopener"
              className="cursor-pointer bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl border border-white/20 text-white font-medium group overflow-hidden inline-flex items-center justify-center h-12"
            >
              <div className="relative overflow-hidden w-full text-center">
                <span className="inline-block transition-transform group-hover:-translate-y-7 duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Book a Demo
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 top-7 group-hover:top-0 transition-all duration-[1.125s] ease-[cubic-bezier(0.19,1,0.22,1)] whitespace-nowrap">
                  Book a Demo
                </span>
              </div>
            </a>
          </div>

          <div className="mt-20 max-w-4xl mx-auto">
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
