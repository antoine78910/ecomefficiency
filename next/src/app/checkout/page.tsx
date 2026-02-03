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
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isInitializing = React.useRef(false);
  const promoAbortController = React.useRef<AbortController | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || promoLoading) return;
    
    // Cancel any existing promo request
    if (promoAbortController.current) {
      promoAbortController.current.abort();
    }
    
    setPromoError(null);
    setPromoLoading(true);
    
    // Create new abort controller for this request
    promoAbortController.current = new AbortController();
    const signal = promoAbortController.current.signal;
    
    try {
      // First validate the coupon
      const validateRes = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: promoCode.trim() }),
        signal
      });
      
      if (signal.aborted) return;
      
      const validateData = await validateRes.json();
      
      if (!validateRes.ok) {
        setPromoError(validateData.error || 'Invalid promo code');
        setAppliedPromo(null);
        return;
      }
      
      // Then recreate the subscription intent with coupon
      const { data } = await supabase.auth.getUser();
      
      if (signal.aborted) return;
      
      const email = data.user?.email;
      const userId = data.user?.id;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (email) headers['x-user-email'] = email;
      if (userId) headers['x-user-id'] = userId;

      const createRes = await fetch('/api/stripe/create-subscription-intent', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          tier, 
          billing, 
          currency, 
          customerId,
          couponCode: promoCode.trim()
        }),
        signal
      });

      if (signal.aborted) return;

      const createData = await createRes.json();
      if (!createRes.ok || !createData.clientSecret) {
        setPromoError('Failed to apply promo code');
        setAppliedPromo(null);
        return;
      }

      // Update client secret with discounted subscription
      setClientSecret(createData.clientSecret);
      setAppliedPromo(validateData.coupon);
      setPromoError(null);

    } catch (e: any) {
      // Ignore abort errors (expected when component unmounts or new request starts)
      if (e.name === 'AbortError') return;
      
      // console.error('[CHECKOUT] Failed to apply promo:', e);
      setPromoError('Failed to validate promo code');
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
      promoAbortController.current = null;
    }
  };

  useEffect(() => {
    // Prevent multiple simultaneous initializations (memory leak protection)
    if (isInitializing.current) return;
    
    // Check if redirect is already in progress (prevent CPU spikes from rapid navigation)
    const redirectKey = `checkout_redirect_${tier}_${billing}_${currency}`;
    if (sessionStorage.getItem(redirectKey)) {
      // Redirect already initiated, wait a bit and check if we're still on this page
      const checkRedirect = setTimeout(() => {
        if (window.location.hostname === 'checkout.stripe.com' || window.location.pathname !== '/checkout') {
          // Already redirected or navigated away
          return;
        }
        // Still here, clear the flag and retry
        sessionStorage.removeItem(redirectKey);
        isInitializing.current = false;
      }, 100);
      return () => clearTimeout(checkRedirect);
    }
    
    let cancelled = false;
    let abortController: AbortController | null = null;
    isInitializing.current = true;
    sessionStorage.setItem(redirectKey, '1');
    
    (async () => {
      try {
        // Check cancellation before async operations
        if (cancelled) return;
        
        // Get user info, then immediately create a Checkout Session and redirect
        const { data } = await supabase.auth.getUser();
        
        // Check cancellation after async operation
        if (cancelled) return;
        
        const email = data.user?.email;
        const userId = data.user?.id;
        const meta = (data.user?.user_metadata as any) || {};
        const existingCustomerId = meta.stripe_customer_id;

        if (email && !cancelled) setUserEmail(email);
        if (!email && !userId) throw new Error('You must be signed in to checkout. Please sign in or create an account first.');
        if (existingCustomerId && !cancelled) setCustomerId(existingCustomerId);

        // Check cancellation before fetch
        if (cancelled) return;

        // Create a Stripe Checkout Session (server handles single transaction semantics)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (email) headers['x-user-email'] = email;
        if (userId) headers['x-user-id'] = userId;

        // Create AbortController for fetch to prevent memory leaks
        abortController = new AbortController();
        
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers,
          body: JSON.stringify({ tier, billing, currency }),
          signal: abortController.signal
        });
        
        // Check cancellation after fetch
        if (cancelled) return;
        
        const json = await res.json();
        if (!res.ok || !json.url) {
          const errorMsg = json.message || json.error || 'Failed to start checkout';
          throw new Error(errorMsg);
        }
        if (!cancelled && json.url) {
          // Mark redirect as complete and redirect immediately
          sessionStorage.setItem(redirectKey, '2'); // 2 = redirect completed
          window.location.href = json.url;
          // Stop all further execution after redirect
          return;
        }
      } catch (e: any) {
        // Ignore abort errors (expected when component unmounts)
        if (e.name === 'AbortError') return;
        
        if (!cancelled) {
          setError(e.message || 'Failed to initialize checkout');
          sessionStorage.removeItem(redirectKey);
          isInitializing.current = false;
        }
      } finally {
        // Clean up abort controller
        abortController = null;
      }
    })();
    
    return () => { 
      cancelled = true;
      // Abort any in-flight fetch requests
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      // Don't reset isInitializing if redirect was successful (component will unmount anyway)
      if (sessionStorage.getItem(redirectKey) !== '2') {
        isInitializing.current = false;
        sessionStorage.removeItem(redirectKey);
      }
    };
  }, [tier, billing, currency]);

  // Cleanup promo abort controller on unmount
  React.useEffect(() => {
    return () => {
      if (promoAbortController.current) {
        promoAbortController.current.abort();
        promoAbortController.current = null;
      }
    };
  }, []);

  const startCheckout = async () => {
    try {
      setError(null);
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      const userId = data.user?.id;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (email) headers['x-user-email'] = email;
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/stripe/create-subscription-intent', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tier, billing, currency, customerId })
      });

      const json = await res.json();
      if (!res.ok || !json.clientSecret) {
        const errorMsg = json.message || json.error || 'Failed to create payment intent';
        throw new Error(errorMsg);
      }
      setClientSecret(json.clientSecret);
      if (json.customerId) setCustomerId(json.customerId);
    } catch (e: any) {
      setError(e.message || 'Failed to start checkout');
    }
  };

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

  const basePrice = prices[tier][billing];
  
  const starterToolHighlights = [
    'GPT',
    'Midjourney',
    'SendShort',
    'Capcut',
    'Helium 10',
    'Dropship.io',
    'Winning Hunter',
    'ShopHunter',
    '+30 SEO tools',
  ];
  const proToolHighlights = [
    'Pipiads',
    'ElevenLabs',
    'Higgsfield',
    'Vmake',
    'Atria',
    'Runway',
    'Heygen',
    'Flair.ai',
    'Kalodata',
    'Fotor',
    'ForePlay',
    'Exploding Topics',
    'Freepik',
    'TurboScribe',
  ];

  // Calculate discounted price if promo is applied
  const getDiscountedPrice = () => {
    if (!appliedPromo) return basePrice;

    if (appliedPromo.percent_off) {
      const discounted = basePrice * (1 - appliedPromo.percent_off / 100);
      return discounted;
    }

    if (appliedPromo.amount_off) {
      // amount_off is in cents, convert to currency
    const discountAmount = appliedPromo.amount_off / 100;
      const discounted = Math.max(0, basePrice - discountAmount);
      return discounted;
    }

    return basePrice;
  };

  const price = getDiscountedPrice();

  if (error) {
    // Check if it's an authentication error
    const isAuthError = error.includes('signed in') || error.includes('authenticate') || error.includes('credentials');
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-white text-xl font-bold mb-2">
            {isAuthError ? 'Sign In Required' : 'Error'}
          </h2>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          {isAuthError ? (
            <div className="space-y-2">
              <button 
                onClick={() => window.location.href = '/signin'}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
              >
                Sign In
              </button>
              <button 
                onClick={() => window.location.href = '/app'}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Back to App
              </button>
            </div>
          ) : (
            <button 
              onClick={() => window.location.href = '/app'}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
            >
              Back to App
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Redirecting to secure checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-5">
          <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-14 w-auto mx-auto mb-2 mix-blend-screen" />
          <h1 className="text-xl font-bold text-white">Complete Your Subscription</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Order Summary */}
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-4">
            {userEmail && (
              <div className="mb-3 pb-3 border-b border-white/10">
                <p className="text-xs text-gray-400">Logged in as</p>
                <p className="text-sm text-white font-medium">{userEmail}</p>
              </div>
            )}
            <h2 className="text-white font-semibold text-base mb-3">Order Summary</h2>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300 capitalize text-sm">{tier} Plan</span>
                <div className="text-right">
                  {appliedPromo && (
                    <div className="text-xs text-gray-500 line-through">
                      {formatPrice(basePrice, currency)}/mo
                    </div>
                  )}
                  <span className="text-white font-semibold text-sm">{formatPrice(price, currency)}/mo</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {billing === 'yearly' ? 'Billed annually (save 40%)' : 'Billed monthly'}
              </div>
            </div>

            {/* Promo Code - Collapsible */}
            <div className="mb-4">
              {!promoExpanded ? (
                <button 
                  onClick={() => setPromoExpanded(true)}
                  className="text-xs text-gray-500 hover:text-purple-400 underline transition-colors"
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Promo Code</label>
                    <button 
                      onClick={() => {
                        setPromoExpanded(false);
                        setPromoError(null);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Enter code"
                      disabled={!!appliedPromo}
                      className="flex-1 px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                      onClick={handleApplyPromo}
                      disabled={!promoCode.trim() || !!appliedPromo || promoLoading}
                      className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                    >
                      {promoLoading ? (
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                      ) : appliedPromo ? '✓' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-400">{promoError}</p>
                  )}
                  {appliedPromo && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400">✓ {appliedPromo.name || promoCode} applied</span>
                      <button 
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoCode('');
                        }}
                        className="text-gray-500 hover:text-gray-400"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-3 mb-4">
              {appliedPromo && (
                <div className="flex items-center justify-between mb-2 text-green-400 text-sm">
                  <span>Discount ({appliedPromo.percent_off}% off)</span>
                  <span>-{formatPrice(basePrice - price, currency)}</span>
                </div>
              )}
              {billing === 'yearly' ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-sm">Monthly price</span>
                    <span className="text-gray-400 text-sm">{formatPrice(price, currency)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-white font-semibold">Total billed today</span>
                    <span className="text-purple-400 font-bold">{formatPrice(price * 12, currency)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Then {formatPrice(price * 12, currency)} every year</p>
                </>
              ) : (
                <div className="flex items-center justify-between text-lg">
                  <span className="text-white font-semibold">Total billed today</span>
                  <span className="text-purple-400 font-bold">{formatPrice(price, currency)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-medium mb-2">What's included:</p>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>Trusted by 350+ ecom brands & agencies</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>Access {tier === 'pro' ? '50+' : '40+'} premium tools (AI, Spy, SEO & more)</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>
                  {tier === 'pro'
                    ? `Pro extras: ${proToolHighlights.slice(0, 7).join(', ')}…`
                    : `Starter tools: ${starterToolHighlights.slice(0, 7).join(', ')}…`}
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>$3,000+ worth of tools included</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>+30 Shopify themes & 300 Static canva templates</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>7/7 Discord support & 1,500+ member community</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <span>...and more inside!</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-4 text-center text-gray-400">
            Redirecting to Stripe Checkout...
          </div>
        </div>
      </div>
    </div>
  );
}

// noop: keep this file touched so editor diagnostics stay in sync

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
  const hasSubmitted = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Early return if already processing (prevent memory leaks from rapid clicks)
    if (hasSubmitted.current || isProcessing) {
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    // Prevent double submission (multi-layer protection)
    const sessionKey = `checkout_processing_${tier}_${billing}`;
    const alreadyProcessing = sessionStorage.getItem(sessionKey);
    
    if (alreadyProcessing) {
      return;
    }

    // Lock immediately to prevent any race conditions
    hasSubmitted.current = true;
    sessionStorage.setItem(sessionKey, 'true');
    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/checkout/success?tier=${tier}&billing=${billing}` },
        redirect: 'if_required',
      });

      if (error) {
        // Map Stripe errors to user-friendly messages
        const userMessage = (() => {
          const code = error.code;
          const errorMap: Record<string, string> = {
            'card_declined': 'Your card was declined. Please try another payment method.',
            'insufficient_funds': 'Insufficient funds. Please use another card.',
            'expired_card': 'Your card has expired. Please use another card.',
            'incorrect_cvc': 'Incorrect security code (CVC). Please check and try again.',
            'incorrect_number': 'Invalid card number. Please check and try again.',
            'invalid_expiry_month': 'Invalid expiration month.',
            'invalid_expiry_year': 'Invalid expiration year.',
            'processing_error': 'Payment processing error. Please try again in a moment.',
            'authentication_required': 'Additional authentication required. Please complete the verification.',
            'payment_intent_authentication_failure': 'Card authentication failed. Please try another card.',
          };
          return errorMap[code || ''] || error.message || 'Payment failed. Please try again.';
        })();
        setMessage(userMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded! Activate subscription and plan immediately
        let userEmail: string | undefined;
        
        try {
          const { data } = await supabase.auth.getUser();
          userEmail = data.user?.email;

          // CRITICAL: Mark invoice as paid and activate plan
          // This handles cases where Stripe disables automatic collection
          const activationRes = await fetch('/api/stripe/complete-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              email: userEmail,
              tier
            })
          });

          const activationData = await activationRes.json();
          if (!activationData.success) {
            // Safe logging to prevent DataCloneError
            console.error('[Checkout] ❌ Failed to complete payment:', activationData?.error || String(activationData));
          }
        } catch (e: any) {
          // Safe logging to prevent DataCloneError
          console.error('[Checkout] Failed to complete payment (non-fatal):', e?.message || String(e));
          // Continue anyway, user can retry
        }

        // Track DataFast goal: payment_complete (only primitives to prevent DataCloneError)
        try {
          const trackingData = {
            tier: String(tier),
            billing: String(billing),
            currency: String(currency),
            amount_cents: typeof paymentIntent.amount === 'number' ? paymentIntent.amount : 0,
            payment_intent_id: String(paymentIntent.id || ''),
            email: userEmail ? String(userEmail) : undefined
          };
          (window as any)?.datafast?.('payment_complete', trackingData);
        } catch (e: any) {
          // Safe logging to prevent DataCloneError
          console.error('[Checkout] Failed to track payment_complete (non-fatal):', e?.message || String(e));
        }

        // Track FirstPromoter conversion (best effort, only primitives)
        try {
          const amount = typeof paymentIntent.amount === 'number' ? (paymentIntent.amount / 100) : undefined;
          const fprData: Record<string, string | undefined> = {};
          if (userEmail) fprData.email = String(userEmail);
          if (amount !== undefined) fprData.amount = String(amount);
          if (currency) fprData.currency = String(currency);
          if (tier) fprData.plan = String(tier);
          (window as any)?.fpr && (window as any).fpr('conversion', fprData);
        } catch (e: any) {
          // Safe logging to prevent DataCloneError
          console.error('[Checkout] Failed to track FirstPromoter conversion (non-fatal):', e?.message || String(e));
        }

        // Redirect to success page
        sessionStorage.removeItem(sessionKey); // Clear lock on success
        window.location.href = `/checkout/success?tier=${tier}&billing=${billing}`;
      }
    } catch (err: any) {
      setMessage(err.message || 'An unexpected error occurred');
      sessionStorage.removeItem(sessionKey); // Clear lock on error to allow retry
      hasSubmitted.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ 
        layout: 'tabs',
        paymentMethodOrder: ['card', 'link'],
        wallets: {
          applePay: 'auto',
          googlePay: 'auto'
        }
      }} />
      
      {message && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || hasSubmitted.current}
        className="w-full bg-[linear-gradient(to_bottom,#9541e0,#7c30c7)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl border border-[#9541e0] shadow-[0_4px_24px_rgba(149,65,224,0.45)] transition-all"
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

      <div className="space-y-2">
        <p className="text-xs text-gray-500 text-center">
          By subscribing, you agree to our Terms of Service. Cancel anytime.
        </p>
        
        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-2.5 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            Secure SSL
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            Encrypted
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs text-gray-500">Secured by</span>
          <span className="text-xs font-semibold text-gray-200">Stripe</span>
        </div>
      </div>
    </form>
  );
}

