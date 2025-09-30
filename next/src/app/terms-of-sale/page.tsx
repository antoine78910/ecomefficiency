export const metadata = {
  title: "Terms of Sale | Ecom Efficiency",
  description: "Subscription and billing terms for Ecom Efficiency memberships.",
};

export default function TermsOfSalePage() {
  return (
    <main className="min-h-screen bg-black text-gray-200 px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">📜 Terms of Sale</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: 2025-01-01</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Scope</h2>
            <p>
              These Terms of Sale govern all subscriptions and payments for Ecom Efficiency memberships. They apply
              alongside our Terms of Service.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">2. Subscription Plans & Payment</h2>
            <p className="mb-2">Ecom Efficiency offers recurring subscription plans.</p>
            <p className="mb-2">Payments are processed via third-party providers (e.g., Stripe).</p>
            <p>By subscribing, you authorize us to automatically charge recurring fees until you cancel.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. Refund Policy</h2>
            <p className="font-semibold text-yellow-300 mb-1">⚠️ Strict No Refund Policy</p>
            <p className="mb-2">All sales are final.</p>
            <p className="mb-2">
              No refunds are provided under any circumstances once membership access is granted, since it includes
              immediate access to paid resources and invitation links to third-party tools.
            </p>
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
            <h2 className="text-xl font-semibold text-white mb-2">5. Right to Refuse Service</h2>
            <p>
              Ecom Efficiency may refuse or terminate service at its sole discretion, including in cases of abuse,
              fraud, account sharing, or violation of our Terms. No refund will be provided.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Ecom Efficiency shall not be held liable for any damages, losses,
              or claims resulting from the use or inability to use third-party tools. Users agree to indemnify and hold
              Ecom Efficiency harmless from any claims related to misuse.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">7. Governing Law</h2>
            <p>
              These Terms of Sale are governed by French law. Disputes shall be submitted exclusively to the competent
              courts in France after an attempt at amicable resolution.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">8. Conclusion</h2>
            <p>
              Ecom Efficiency is a facilitation platform that connects members with shared access to various third-party
              tools. We are neither resellers nor official providers. By subscribing, you unconditionally accept these
              Terms of Sale and Terms of Service.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


