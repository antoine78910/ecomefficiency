import { readPartnerForDomain } from "../_domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEmail(v: any) {
  const s = String(v || "").trim();
  return s || "support@yourdomain.com";
}

export default async function DomainTermsOfSalePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const info = await readPartnerForDomain(domain);
  const cfg: any = info.cfg || {};

  const name = String(cfg?.saasName || info.slug || "Your SaaS");
  const email = safeEmail(cfg?.supportEmail);
  const updated = "2025-01-01";

  return (
    <main className="min-h-screen bg-black text-gray-200 px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">📜 Terms of Sale</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Scope</h2>
            <p>These Terms of Sale govern all subscriptions and payments for {name} memberships.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Subscription Plans & Payment</h2>
            <p className="mb-2">{name} offers recurring subscription plans.</p>
            <p className="mb-2">Payments are processed via third-party providers (e.g., Stripe).</p>
            <p>By subscribing, you authorize recurring charges until you cancel.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. Refund Policy</h2>
            <p className="font-semibold text-yellow-300 mb-1">⚠️ No Refund Policy</p>
            <p className="mb-2">All sales are final once access has been granted, except where required by law.</p>
            <p>Refunds will not be issued for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account bans due to misuse;</li>
              <li>Downtime, removal, or modification of third-party tools;</li>
              <li>User mistakes (e.g., failure to cancel before renewal).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Billing & Cancellations</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Subscriptions renew automatically until cancelled.</li>
              <li>Cancellations take effect at the end of the current billing cycle.</li>
              <li>To avoid renewal charges, you must cancel before the renewal date.</li>
            </ul>
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


