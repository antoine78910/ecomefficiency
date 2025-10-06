"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Check } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutContent() {
  const searchParams = useSearchParams();
  const tier = (searchParams?.get('tier') || 'pro') as 'starter' | 'pro';
  const billing = (searchParams?.get('billing') || 'monthly') as 'monthly' | 'yearly';
  const currency = (searchParams?.get('currency') || 'EUR') as 'EUR' | 'USD';

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Get user info
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        const userId = data.user?.id;
        const meta = (data.user?.user_metadata as any) || {};
        const existingCustomerId = meta.stripe_customer_id;

        if (existingCustomerId) setCustomerId(existingCustomerId);

        // Create subscription intent
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (email) headers['x-user-email'] = email;
        if (userId) headers['x-user-id'] = userId;

        const res = await fetch('/api/stripe/create-subscription-intent', {
          method: 'POST',
          headers,
          body: JSON.stringify({ tier, billing, currency, customerId: existingCustomerId })
        });

        const json = await res.json();
        if (!res.ok || !json.clientSecret) {
          throw new Error(json.error || 'Failed to create payment intent');
        }

        if (!cancelled) {
          setClientSecret(json.clientSecret);
          if (json.customerId) setCustomerId(json.customerId);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to initialize checkout');
      }
    })();
    return () => { cancelled = true; };
  }, [tier, billing, currency]);

  const formatPrice = (amount: number, c: 'USD' | 'EUR') => {
    if (c === 'EUR') {
      return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + '€';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const prices = {
    starter: { monthly: 19.99, yearly: 11.99 },
    pro: { monthly: 29.99, yearly: 17.99 }
  };

  const price = prices[tier][billing];

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-white text-xl font-bold mb-2">Error</h2>
          <p className="text-red-300 text-sm">{error}</p>
          <button 
            onClick={() => window.location.href = '/pricing'}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Subscription</h1>
          <p className="text-gray-400">Secure checkout powered by Stripe</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Order Summary</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 capitalize">{tier} Plan</span>
                <span className="text-white font-semibold">{formatPrice(price, currency)}/mo</span>
              </div>
              <div className="text-xs text-gray-500">
                {billing === 'yearly' ? 'Billed annually (save 40%)' : 'Billed monthly'}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-6">
              <div className="flex items-center justify-between text-lg">
                <span className="text-white font-semibold">Total</span>
                <span className="text-purple-400 font-bold">{formatPrice(price, currency)}/mo</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-300 font-medium mb-3">What's included:</p>
              {tier === 'starter' ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Access to 40+ premium tools</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>ChatGPT, Midjourney, Helium10, and more</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>+30 SEO tools included</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Everything in Starter, plus:</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Pipiads, Runway, Heygen, ElevenLabs</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Access to 50+ premium tools</span>
                  </div>
                </>
              )}
              <div className="flex items-start gap-2 text-sm text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>Cancel anytime, no commitment</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Payment Details</h2>
            
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#9541e0',
                colorBackground: '#1f2937',
                colorText: '#ffffff',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '8px',
              }
            }}}>
              <CheckoutForm 
                tier={tier} 
                billing={billing} 
                currency={currency}
                customerId={customerId}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutForm({ tier, billing, currency, customerId }: { 
  tier: string; 
  billing: string; 
  currency: string;
  customerId: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?tier=${tier}&billing=${billing}`,
        },
      });

      if (error) {
        setMessage(error.message || 'Payment failed');
      }
    } catch (err: any) {
      setMessage(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {message && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] transition-all"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Processing...
          </span>
        ) : (
          `Subscribe Now`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By subscribing, you agree to our Terms of Service. Cancel anytime.
      </p>
    </form>
  );
}

