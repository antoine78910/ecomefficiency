import type { Metadata } from "next";
import { readPartnerForDomain } from "./_domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg = info.cfg || {};
  const title = info.slug ? String(cfg?.saasName || info.slug) : "Domain not connected";
  const description = info.slug ? String(cfg?.tagline || "A modern SaaS built for your audience.") : "Finish connecting your domain.";
  const icon = cfg?.faviconUrl ? String(cfg.faviconUrl) : undefined;
  return {
    title,
    description,
    icons: icon ? { icon } : undefined,
  };
}

export default function DomainLayout({ children }: { children: React.ReactNode }) {
  return children;
}

