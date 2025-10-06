"use client";
import React from 'react';

export default function ABTestAdminPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // In a real implementation, you'd fetch conversion stats from your database
    // For now, this is a placeholder for you to connect to your analytics
    setStats({
      stripe: { views: 0, conversions: 0, rate: 0 },
      custom: { views: 0, conversions: 0, rate: 0 }
    });
    setLoading(false);
  }, []);

  const forceVariant = async (variant: 'stripe' | 'custom') => {
    await fetch('/api/ab-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant })
    });
    alert(`Forced to ${variant} checkout for testing. Clear cookies to reset.`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Checkout A/B Test Dashboard</h1>
        <p className="text-gray-400 mb-8">Compare Stripe hosted vs custom checkout performance</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Stripe Hosted Checkout</h2>
            <p className="text-sm text-gray-400 mb-4">
              Traditional Stripe checkout with "Subscribe with obligation to pay" text (EU regulations)
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Views:</span>
                <span className="font-mono">{loading ? '...' : stats?.stripe?.views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conversions:</span>
                <span className="font-mono">{loading ? '...' : stats?.stripe?.conversions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rate:</span>
                <span className="font-mono font-semibold text-purple-400">
                  {loading ? '...' : `${stats?.stripe?.rate?.toFixed(2) || 0}%`}
                </span>
              </div>
            </div>
            <button
              onClick={() => forceVariant('stripe')}
              className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
            >
              Force this variant for testing
            </button>
          </div>

          <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Custom Checkout (Elements)</h2>
            <p className="text-sm text-gray-400 mb-4">
              Custom checkout with "Subscribe Now" button, trust badges, and your branding
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Views:</span>
                <span className="font-mono">{loading ? '...' : stats?.custom?.views || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conversions:</span>
                <span className="font-mono">{loading ? '...' : stats?.custom?.conversions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rate:</span>
                <span className="font-mono font-semibold text-purple-400">
                  {loading ? '...' : `${stats?.custom?.rate?.toFixed(2) || 0}%`}
                </span>
              </div>
            </div>
            <button
              onClick={() => forceVariant('custom')}
              className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
            >
              Force this variant for testing
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold mb-3">How it works:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Each user is randomly assigned to either Stripe or Custom checkout (50/50 split)</li>
            <li>• Assignment is stored in a cookie for 30 days to ensure consistency</li>
            <li>• Track conversions via Stripe webhooks or your analytics</li>
            <li>• Use "Force variant" buttons above to test each version manually</li>
            <li>• After collecting data, choose the winner and remove the losing variant</li>
          </ul>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-300">
              <strong>Note:</strong> To track conversions, you'll need to log checkout views and successful payments 
              in your database or analytics tool (e.g., track "checkout_viewed" and "subscription_created" events 
              with the variant name in metadata).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

