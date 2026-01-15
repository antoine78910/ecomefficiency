import { readPartnerForDomain } from "../_domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEmail(v: any) {
  const s = String(v || "").trim();
  return s || "support@yourdomain.com";
}

export default async function DomainTermsPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg: any = info.cfg || {};

  const name = String(cfg?.saasName || info.slug || "Your SaaS");
  const email = safeEmail(cfg?.supportEmail);
  const updated = "2025-01-01";

  return (
    <main className="min-h-screen bg-black text-gray-200 px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">📜 Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Preamble</h2>
            <p>
              {name} ("the Platform", "we", "our") is an online membership service that facilitates access to a curated
              selection of premium digital tools provided by third-party service providers.
            </p>
            <p className="mt-2">
              We are not the owner, reseller, distributor, or official partner of these tools, nor do we provide them
              directly. We act solely as a facilitator of shared access for our members.
            </p>
            <p className="mt-2">By using {name}, you acknowledge that you have read, understood, and agree to these Terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Purpose</h2>
            <p>
              {name} provides members with access to a private VIP area, enabling them to benefit from shared access to
              selected premium digital tools. All tools and services accessible via the Platform are provided by third
              parties, over which {name} has no control.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. Available Tools</h2>
            <p>The list of tools may include AI, SEO, Spy, productivity, or automation software.</p>
            <p className="mt-2">The list is indicative and subject to change at any time.</p>
            <p className="mt-2">
              We do not guarantee uninterrupted or permanent availability of any tool. Access may be modified, restricted,
              or terminated without notice, particularly in response to changes made by third-party providers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Membership and Usage Rules</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access requires a valid paid membership subscription.</li>
              <li>Users agree to comply with the third-party providers’ own terms of service.</li>
              <li>
                Any attempt to bypass technical restrictions, share accounts, resell access, or misuse tools will result
                in immediate termination without refund.
              </li>
              <li>Abusive usage will lead to a permanent ban.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">5. Disclaimer of Liability & Non-Affiliation</h2>
            <p>
              {name} is not responsible for the operation, performance, or policies of third-party tools. All trademarks,
              service names, and logos remain the property of their respective owners.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">6. Privacy & Data Protection</h2>
            <p>See our Privacy Policy for details.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">7. Termination of Access</h2>
            <p>
              {name} reserves the right to suspend or terminate access at any time without refund in cases of breach,
              abuse, fraud, misuse of tools, or unauthorized account sharing.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">8. Modifications to the Terms</h2>
            <p>We may update these Terms at any time. Continued use constitutes acceptance of the revised Terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">9. Contact</h2>
            <p>
              Support:{" "}
              <a className="underline" href={`mailto:${email}`}>
                {email}
              </a>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {" "}
              <a className="underline text-purple-300 hover:text-purple-200" href="https://ecomefficiency.com" target="_blank" rel="noreferrer">
                Ecom Efficiency
              </a>
              . The Service is operated by {name} and is responsible for support and billing.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


