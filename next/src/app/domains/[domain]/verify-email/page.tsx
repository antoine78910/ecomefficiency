import { readPartnerForDomain } from "../_domain";
import DomainVerifyEmailClient from "./verify-email-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DomainVerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams?: Promise<{ email?: string }>;
}) {
  const { domain } = await params;
  const sp = (await searchParams) || {};
  const email = sp?.email ? String(sp.email) : "";

  const info = await readPartnerForDomain(domain);
  const cfg = info.cfg || {};
  const title = String(cfg?.saasName || info.slug || "Your SaaS");
  const logoUrl = cfg?.logoUrl ? String(cfg.logoUrl) : undefined;

  return <DomainVerifyEmailClient email={email} title={title} logoUrl={logoUrl} />;
}

