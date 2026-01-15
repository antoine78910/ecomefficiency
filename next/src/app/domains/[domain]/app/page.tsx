import { readPartnerForDomain } from "../_domain";
import DomainAppClient from "./DomainAppClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DomainAppPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg = info.cfg || {};
  const title = String(cfg?.saasName || info.slug || "Your SaaS");
  const logoUrl = cfg?.logoUrl ? String(cfg.logoUrl) : undefined;
  const colors = cfg?.colors ? (cfg.colors as any) : {};
  const main = colors?.main ? String(colors.main) : undefined;
  const accent = colors?.accent ? String(colors.accent) : undefined;

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
            <a
              href="/signin"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <DomainAppClient title={title} logoUrl={logoUrl} slug={String(info.slug)} colors={{ main, accent }} />;
}

