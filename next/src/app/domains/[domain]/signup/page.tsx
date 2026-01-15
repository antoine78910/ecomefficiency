import { readPartnerForDomain } from "../_domain";
import DomainSignUpClient from "./DomainSignUpClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DomainSignUpPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg = info.cfg || {};
  const title = String(cfg?.saasName || info.slug || "Your SaaS");
  const subtitle = "Sign up";
  const logoUrl = cfg?.logoUrl ? String(cfg.logoUrl) : undefined;
  const colors = (cfg as any)?.colors || {};

  if (!info.slug) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-black/60 shadow-[0_20px_80px_rgba(149,65,224,0.10)] p-6">
          <div className="text-lg font-semibold">Domain not connected yet</div>
          <div className="mt-2 text-sm text-gray-300">
            <span className="font-mono text-gray-100">{info.domain || domain}</span> is not mapped to any slug yet.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://partners.ecomefficiency.com/dashboard?tab=settings"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] border border-[#9541e0] hover:brightness-110"
            >
              Open domain setup
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ["--wl-main" as any]: String(colors?.main || ""), ["--wl-accent" as any]: String(colors?.accent || "") } as any}>
      <DomainSignUpClient title={title} subtitle={subtitle} logoUrl={logoUrl} colors={colors} />
    </div>
  );
}

