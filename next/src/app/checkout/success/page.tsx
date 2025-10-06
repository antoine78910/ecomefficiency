"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Track conversion for A/B test
    const urlParams = new URLSearchParams(window.location.search);
    const abVariant = urlParams.get('ab_variant');
    if (abVariant === 'custom' || abVariant === 'stripe') {
      fetch('/api/ab-test/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: abVariant, eventType: 'conversion' })
      }).catch(console.error);
    }

    // Wait a moment then redirect to app
    const timer = setTimeout(() => {
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
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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

