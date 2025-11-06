export const metadata = {
  title: "Privacy Policy | Ecom Efficiency",
  description: "How Ecom Efficiency collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200 px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">📜 Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: 2025-01-01</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy explains how Ecom Efficiency ("we", "our", "us") collects, uses, and protects your personal
              data when you use our website and services. We are committed to protecting your privacy and handling your data
              in compliance with applicable data protection laws, including the EU General Data Protection Regulation (GDPR).
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
            <p className="mt-3">We do not collect unnecessary personal data.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">3. How We Use Your Data</h2>
            <p>Your personal data is used exclusively to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Create and manage your membership account;</li>
              <li>Process subscription payments and renewals;</li>
              <li>Communicate important updates regarding the service;</li>
              <li>Improve our services and user experience.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">4. Data Sharing</h2>
            <p>We do not sell or rent your personal data. We only share it with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Payment processors for subscription billing;</li>
              <li>Service providers necessary for the technical operation of Ecom Efficiency.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">5. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to provide our services and comply with legal obligations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">6. Data Security</h2>
            <p>
              We take reasonable technical and organizational measures to protect your personal data from unauthorized access,
              alteration, disclosure, or destruction.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access your data;</li>
              <li>Request correction or deletion;</li>
              <li>Object to processing;</li>
              <li>Request data portability.</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at: <a className="underline" href="mailto:support@ecomefficiency.com">support@ecomefficiency.com</a>
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">8. International Transfers</h2>
            <p>
              Some of our technical service providers may be located outside the European Economic Area. In such cases, we
              ensure adequate safeguards are in place to protect your data.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-2">9. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The updated version will be posted on our website with the
              revised “Last updated” date.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}


