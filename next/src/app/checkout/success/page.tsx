"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

import { fireGoogleAdsConversion, GOOGLE_ADS_PURCHASE_SEND_TO } from '@/lib/googleAdsConversions';

const PLAN_VALUES_EUR: Record<string, number> = {
  starter_monthly: 19.99,
  starter_yearly: 143.88,
  pro_monthly: 29.99,
  pro_yearly: 215.88,
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const tier = searchParams?.get('tier') || 'pro';
  const billing = searchParams?.get('billing') || 'monthly';
  const currency = (searchParams?.get('currency') || 'EUR').toUpperCase();
  const transactionId = searchParams?.get('tx') || '';

  // Google Ads: "Chargement de page" – conversion Achat au chargement de la page de confirmation
  // (recommandé pour les achats: on compte uniquement quand l’utilisateur arrive après paiement)
  useEffect(() => {
    const planKey = `${tier}_${billing}`;
    const value = PLAN_VALUES_EUR[planKey] ?? PLAN_VALUES_EUR.pro_monthly;
    fireGoogleAdsConversion(
      GOOGLE_ADS_PURCHASE_SEND_TO,
      { value, currency, transaction_id: transactionId },
      "google_ads_purchase_conversion_sent",
      "session",
    );
  }, [tier, billing, currency, transactionId]);

  useEffect(() => {
    // Force plan activation immediately after payment
    let cancelled = false;
    (async () => {
      try {
        // Import supabase client
        const mod = await import("@/integrations/supabase/client");
        const { data } = await mod.supabase.auth.getUser();
        const email = data.user?.email;

        if (email) {
          console.log('[CheckoutSuccess] Forcing plan activation for:', email, 'tier:', tier);
          try {
            const { trackFirstPromoterReferral } = await import("@/lib/firstpromoterReferral");
            trackFirstPromoterReferral(email, data.user?.id);
          } catch {}

          // Try multiple times to ensure activation
          for (let attempt = 1; attempt <= 5 && !cancelled; attempt++) {
            try {
              const activationRes = await fetch('/api/admin/activate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email,
                  plan: tier // 'starter' or 'pro'
                })
              });

              const activationData = await activationRes.json();
              console.log(`[CheckoutSuccess] Activation attempt ${attempt}:`, activationData);

              if (activationData.success) {
                console.log('[CheckoutSuccess] ✓ Plan activated successfully!');
                break;
              }
            } catch (e) {
              console.error(`[CheckoutSuccess] Activation attempt ${attempt} failed:`, e);
            }

            // Wait 500ms before retry
            if (attempt < 5) {
              await new Promise(r => setTimeout(r, 500));
            }
          }
        }
      } catch (e) {
        console.error('[CheckoutSuccess] Failed to activate plan:', e);
      }
    })();

    // Wait a moment then redirect to app
    const timer = setTimeout(() => {
      if (cancelled) return;
      setRedirecting(true);
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';

      let appUrl;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        appUrl = `${protocol}//app.localhost${port}/`;
      } else if (hostname.startsWith('app.')) {
        appUrl = `${protocol}//${hostname}${port}/`;
      } else {
        const cleanHost = hostname.replace(/^www\./, '');
        appUrl = `${protocol}//app.${cleanHost}${port}/`;
      }

      const welcomeUrl = `/welcome?next=${encodeURIComponent(appUrl)}`;
      window.location.href = welcomeUrl;
    }, 4000); // Increased to 4 seconds to allow activation attempts

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tier]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome to Ecom Efficiency!
        </h1>
        
        <p className="text-gray-300 mb-6">
          Your subscription is now active. You have access to all premium tools.
        </p>

        <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2">
            {redirecting ? 'Redirecting to your dashboard...' : 'Redirecting in a moment...'}
          </p>
          {redirecting && (
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          If you're not redirected automatically,{' '}
          <a href="/" className="text-purple-400 hover:text-purple-300 underline">
            click here
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

