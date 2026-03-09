"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

const GOOGLE_ADS_SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO?.trim(); // e.g. "AW-123456789/AbCdEfGh"

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const tier = searchParams?.get('tier') || 'pro';
  const billing = searchParams?.get('billing') || 'monthly';

  // Google Ads: fire "Purchase" conversion once per visit (manual code setup in Google Ads)
  useEffect(() => {
    if (!GOOGLE_ADS_SEND_TO || typeof window === 'undefined') return;
    const sentKey = 'google_ads_purchase_conversion_sent';
    if (sessionStorage.getItem(sentKey) === '1') return;

    const scriptId = GOOGLE_ADS_SEND_TO.split('/')[0]; // AW-XXXXXXXX
    if (!scriptId) return;

    const loadAndFire = () => {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      function gtag(...args: any[]) {
        w.dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', scriptId);
      gtag('event', 'conversion', {
        send_to: GOOGLE_ADS_SEND_TO,
        value: tier === 'pro' ? (billing === 'yearly' ? 215.28 : 29.99) : billing === 'yearly' ? 143.88 : 19.99,
        currency: 'EUR',
      });
      sessionStorage.setItem(sentKey, '1');
    };

    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${scriptId}"]`)) {
      loadAndFire();
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${scriptId}`;
    script.onload = loadAndFire;
    document.head.appendChild(script);
  }, [tier, billing]);

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

      window.location.href = appUrl;
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

