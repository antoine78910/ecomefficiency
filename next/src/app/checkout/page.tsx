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

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoError(null);
    setPromoLoading(true);
    try {
      // First validate the coupon
      const validateRes = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: promoCode.trim() })
      });
      
      const validateData = await validateRes.json();
      
      if (!validateRes.ok) {
        setPromoError(validateData.error || 'Invalid promo code');
        setAppliedPromo(null);
        return;
      }
      
      // Then recreate the subscription intent with coupon
      const { data } = await supabase.auth.getUser();
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
          couponCode: promoCode.trim().toUpperCase()
        })
      });

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
    } catch (e) {
      setPromoError('Failed to validate promo code');
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Track checkout view for A/B test
        const urlParams = new URLSearchParams(window.location.search);
        const abVariant = urlParams.get('ab_variant');
        if (abVariant === 'custom' || abVariant === 'stripe') {
          fetch('/api/ab-test/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant: 'custom', eventType: 'view' })
          }).catch(console.error);
        }

        // Get user info
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        const userId = data.user?.id;
        const meta = (data.user?.user_metadata as any) || {};
        const existingCustomerId = meta.stripe_customer_id;
        
        if (email && !cancelled) {
          setUserEmail(email);
        }

        // Check if user is authenticated
        if (!email && !userId) {
          throw new Error('You must be signed in to checkout. Please sign in or create an account first.');
        }

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
          const errorMsg = json.message || json.error || 'Failed to create payment intent';
          throw new Error(errorMsg);
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

  const basePrice = prices[tier][billing];
  
  // Calculate discounted price if promo is applied
  const getDiscountedPrice = () => {
    if (!appliedPromo) return basePrice;
    
    if (appliedPromo.percent_off) {
      return basePrice * (1 - appliedPromo.percent_off / 100);
    }
    
    if (appliedPromo.amount_off) {
      const discountInCurrency = currency === 'EUR' ? appliedPromo.amount_off / 100 : appliedPromo.amount_off / 100;
      return Math.max(0, basePrice - discountInCurrency);
    }
    
    return basePrice;
  };
  
  const price = getDiscountedPrice();

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
    <div className="min-h-screen bg-black py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-5">
          <img src="/ecomefficiency.png" alt="Ecom Efficiency" className="h-12 w-auto mx-auto mb-2" />
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
              {tier === 'starter' ? (
                <>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Access to 40+ premium tools</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>ChatGPT, Midjourney, Helium10, and more</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>+30 SEO tools included</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Everything in Starter, plus:</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Pipiads, Runway, Heygen, ElevenLabs</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-300">
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
          <div className="bg-gray-900/50 border border-purple-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">Payment Details</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                256-bit encryption
              </div>
            </div>
            
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {message && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
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
        <div className="flex items-center justify-center gap-4 pt-1 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Secure SSL
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Encrypted
          </div>
        </div>
        
        {/* Powered by Stripe logo */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs text-gray-500">Secured by</span>
          <svg className="h-5" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z" fill="#635BFF"/>
          </svg>
        </div>
      </div>
    </form>
  );
}

