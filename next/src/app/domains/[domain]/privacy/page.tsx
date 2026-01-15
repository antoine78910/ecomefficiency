import { readPartnerForDomain } from "../_domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEmail(v: any) {
  const s = String(v || "").trim();
  return s || "support@yourdomain.com";
}

export default async function DomainPrivacyPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg: any = info.cfg || {};

  const name = String(cfg?.saasName || info.slug || "Your SaaS");
  const email = safeEmail(cfg?.supportEmail);
  const updated = "2025-01-01";

  return (
    <main className="min-h-screen bg-black text-gray-200 px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">📜 Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy explains how {name} ("we", "our", "us") collects, uses, and protects your personal data
              when you use our website and services.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Data We Collect</h2>
            <p>We only collect the data strictly necessary to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Manage your account and subscription;</li>
              <li>Process payments via secure third-party processors;</li>
              <li>Provide you access to our services.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. Data Sharing</h2>
            <p>We do not sell your personal data. We only share it with service providers required to operate the Service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Your Rights</h2>
            <p>
              To exercise your rights (access, deletion, correction, portability), contact{" "}
              <a className="underline" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">5. Contact</h2>
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


