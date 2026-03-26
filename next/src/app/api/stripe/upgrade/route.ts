import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function starterPriceIds(env: Record<string, string | undefined>): string[] {
  return [
    env.STRIPE_PRICE_ID_STARTER_MONTHLY_EUR,
    env.STRIPE_PRICE_ID_STARTER_YEARLY_EUR,
    env.STRIPE_PRICE_ID_STARTER_MONTHLY_USD,
    env.STRIPE_PRICE_ID_STARTER_YEARLY_USD,
    env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_MONTHLY,
    env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_YEARLY,
  ].filter(Boolean) as string[]
}

function proPriceIds(env: Record<string, string | undefined>): string[] {
  return [
    env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
    env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
    env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
    env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
    env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
    env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY,
  ].filter(Boolean) as string[]
}

export async function POST(req: NextRequest) {
  try {
    const env = process.env as Record<string, string | undefined>
    const secret = env.STRIPE_SECRET_KEY
    if (!secret) return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 500 })

    const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' })

    let customerId = req.headers.get('x-stripe-customer-id') || undefined
    const email = req.headers.get('x-user-email') || undefined
    if (!customerId && email) {
      try {
        const search = await stripe.customers.search({ query: `email:'${String(email).replace(/'/g, "\\'")}'`, limit: 1 })
        const found = search.data?.[0]
        if (found) customerId = found.id
      } catch {}
    }
    if (!customerId) return NextResponse.json({ ok: false, error: 'missing_customer' }, { status: 400 })

    const body = await req.json().catch(() => ({})) as { billing?: 'monthly' | 'yearly'; currency?: 'EUR' | 'USD' }
    const billingInput = (body.billing || 'monthly').toLowerCase() as 'monthly' | 'yearly'

    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 15 })
    const sub = subs.data.find((s) => s.status === 'active' || s.status === 'trialing')
    if (!sub) return NextResponse.json({ ok: false, error: 'no_active_subscription' }, { status: 400 })

    const item = sub.items.data?.[0]
    if (!item) return NextResponse.json({ ok: false, error: 'no_subscription_item' }, { status: 400 })

    const currentPriceId = typeof item.price === 'string' ? item.price : item.price?.id
    if (!currentPriceId) return NextResponse.json({ ok: false, error: 'no_price' }, { status: 400 })

    const priceObj =
      typeof item.price === 'object' && item.price && 'recurring' in item.price
        ? (item.price as Stripe.Price)
        : await stripe.prices.retrieve(currentPriceId)

    const starters = new Set(starterPriceIds(env))
    const pros = new Set(proPriceIds(env))

    if (pros.has(currentPriceId)) {
      return NextResponse.json({ ok: false, error: 'already_pro' }, { status: 400 })
    }

    if (!starters.has(currentPriceId)) {
      const lookup = ((priceObj.lookup_key || '') as string).toLowerCase()
      const nick = ((priceObj.nickname || '') as string).toLowerCase()
      const looksStarter = lookup.includes('starter') || nick.includes('starter')
      if (!looksStarter) {
        return NextResponse.json(
          { ok: false, error: 'not_starter_plan', message: 'Upgrade with proration is only set up for Starter → Pro.' },
          { status: 400 }
        )
      }
    }

    const interval = priceObj.recurring?.interval === 'year' ? 'yearly' : 'monthly'
    const currency = String(priceObj.currency || 'eur').toUpperCase() as 'EUR' | 'USD'
    const billing = billingInput === 'yearly' || billingInput === 'monthly' ? billingInput : interval

    const key = `pro_${billing}_${currency}` as const
    const serverPro: Record<string, string | undefined> = {
      pro_monthly_EUR: env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      pro_yearly_EUR: env.STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      pro_monthly_USD: env.STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      pro_yearly_USD: env.STRIPE_PRICE_ID_PRO_YEARLY_USD,
    }
    const publicPro: Record<string, string | undefined> = {
      pro_monthly_EUR: env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_EUR,
      pro_yearly_EUR: env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_EUR,
      pro_monthly_USD: env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_USD,
      pro_yearly_USD: env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY_USD,
    }
    const priceId = serverPro[key] || publicPro[key]
    if (!priceId) return NextResponse.json({ ok: false, error: 'missing_price_id', details: { key } }, { status: 400 })

    if (priceId === currentPriceId) {
      return NextResponse.json({ ok: false, error: 'already_on_target_price' }, { status: 400 })
    }

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })

    const u = updated as unknown as Stripe.Subscription

    const requestOrigin = req.headers.get('origin') || 'http://localhost:3000'
    let successOrigin = env.APP_URL || requestOrigin
    try {
      const ou = new URL(successOrigin)
      const bare = ou.hostname.toLowerCase().replace(/^www\./, '')
      if (bare === 'ecomefficiency.com' && !ou.hostname.toLowerCase().startsWith('app.')) {
        ou.protocol = 'https:'
        ou.hostname = 'app.ecomefficiency.com'
        ou.port = ''
        successOrigin = ou.origin
      }
    } catch {}
    const userId = req.headers.get('x-user-id') || undefined

    let checkoutUrl: string | null = null
    let invoiceUrl: string | null = null
    let amountDue: number | null = null
    const li = (u as any).latest_invoice
    const invId = typeof li === 'string' ? li : li?.id
    if (invId) {
      let invoice = await stripe.invoices.retrieve(invId)
      if (invoice.status === 'draft') {
        invoice = await stripe.invoices.finalizeInvoice(invId, { auto_advance: true })
      }
      invoiceUrl = invoice.hosted_invoice_url || null
      amountDue = typeof invoice.amount_due === 'number' ? invoice.amount_due : null

      const needsPayment =
        invoice.status === 'open' && typeof invoice.amount_due === 'number' && invoice.amount_due > 0

      if (needsPayment) {
        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: customerId,
            locale: 'en',
            success_url: `${successOrigin}/app?checkout=success&upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${requestOrigin}/`,
            ...(userId ? { client_reference_id: userId } : {}),
            // Pay existing subscription proration invoice via Checkout (checkout.stripe.com), not invoice.stripe.com
            invoice: invoice.id,
          } as Stripe.Checkout.SessionCreateParams & { invoice: string })
          checkoutUrl = session.url
        } catch (e) {
          console.error('[stripe/upgrade] checkout session for invoice failed', e)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      subscription: {
        id: u.id,
        status: u.status,
        current_period_end: (u as any).current_period_end ?? null,
      },
      proration: true,
      checkout_url: checkoutUrl,
      invoice_url: checkoutUrl ? null : invoiceUrl,
      amount_due: amountDue,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown_error' }, { status: 500 })
  }
}
