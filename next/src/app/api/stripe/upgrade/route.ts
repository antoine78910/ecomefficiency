import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const env = process.env as Record<string, string | undefined>
    const secret = env.STRIPE_SECRET_KEY
    if (!secret) return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 500 })

    const stripe = new Stripe(secret, { apiVersion: '2025-07-30.basil' })

    // Identify customer
    let customerId = req.headers.get('x-stripe-customer-id') || undefined
    const email = req.headers.get('x-user-email') || undefined
    if (!customerId && email) {
      try {
        const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 })
        const found = search.data?.[0]
        if (found) customerId = found.id
      } catch {}
    }
    if (!customerId) return NextResponse.json({ ok: false, error: 'missing_customer' }, { status: 400 })

    // Resolve priceId for Pro based on input
    const body = await req.json().catch(() => ({})) as { billing?: 'monthly'|'yearly'; currency?: 'EUR'|'USD' }
    const billing = (body.billing || 'monthly').toLowerCase() as 'monthly'|'yearly'
    const currency = (body.currency || 'EUR').toUpperCase() as 'EUR'|'USD'

    const key = `pro_${billing}_${currency}` // e.g. pro_monthly_EUR
    const map: Record<string, string | undefined> = {
      'pro_monthly_EUR': env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      'pro_yearly_EUR': env.STRIPE_PRICE_ID_PRO_YEARLY_EUR || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      'pro_monthly_USD': env.STRIPE_PRICE_ID_PRO_MONTHLY_USD || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      'pro_yearly_USD': env.STRIPE_PRICE_ID_PRO_YEARLY_USD || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_USD,
    }
    const priceId = map[key]
    if (!priceId) return NextResponse.json({ ok: false, error: 'missing_price_id', details: { key } }, { status: 400 })

    // Find active subscription
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
    const sub = subs.data?.[0]
    if (!sub) return NextResponse.json({ ok: false, error: 'no_active_subscription' }, { status: 400 })
    const item = sub.items.data?.[0]
    if (!item) return NextResponse.json({ ok: false, error: 'no_subscription_item' }, { status: 400 })

    // Update immediately without proration, re-anchor cycle now
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId }],
      billing_cycle_anchor: 'now',
      proration_behavior: 'none',
      cancel_at_period_end: false,
    })
    const u: any = updated as any
    return NextResponse.json({ ok: true, subscription: { id: u.id, status: u.status, current_period_end: u.current_period_end } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 })
  }
}


