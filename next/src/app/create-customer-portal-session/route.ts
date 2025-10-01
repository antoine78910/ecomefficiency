import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  try {
    const env = process.env as Record<string, string | undefined>
    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.redirect(new URL('/subscription?err=stripe_not_configured', req.url), { status: 303 })
    }
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-07-30.basil" })

    const origin = `${new URL(req.url).origin}`

    const form = await req.formData()
    let customerId = (form.get('customerId') as string) || ''
    const email = (form.get('email') as string) || ''
    const action = (form.get('action') as string) || 'manage'

    // Resolve customer by email if id missing
    if (!customerId && email) {
      try {
        const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 })
        const found = (search.data || [])[0]
        if (found) customerId = found.id
      } catch {}
    }
    if (!customerId) {
      return NextResponse.redirect(new URL('/subscription?err=missing_customer', req.url), { status: 303 })
    }

    // Optional upgrade flow via flow_data
    let flow: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined
    if (action === 'upgrade') {
      // Detect currency (best-effort): prefer EU
      let currency: 'EUR'|'USD' = 'EUR'
      try {
        const r = await fetch(`${origin}/api/ip-region`, { cache: 'no-store' })
        const j = await r.json().catch(()=>({}))
        if (j?.currency === 'USD') currency = 'USD'
      } catch {}
      // Resolve Pro price from env map
      const priceId = (currency === 'EUR')
        ? (env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_EUR)
        : (env.STRIPE_PRICE_ID_PRO_MONTHLY_USD || env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY_USD || env.STRIPE_PRICE_ID_PRO_MONTHLY_EUR)
      if (priceId) {
        flow = {
          type: 'subscription_update',
          subscription_update: { default_items: [{ price: priceId }] }
        }
      }
    }

    let session: Stripe.BillingPortal.Session
    const args: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: `${origin}/subscription`,
      ...(flow ? { flow_data: flow } : {})
    }

    try {
      session = await stripe.billingPortal.sessions.create(args)
    } catch {
      // Fallback: create without flow (user can switch plan manually in portal)
      try {
        const fallback: Stripe.BillingPortal.SessionCreateParams = {
          customer: customerId,
          return_url: `${origin}/subscription`,
        }
        session = await stripe.billingPortal.sessions.create(fallback)
      } catch {
        return NextResponse.redirect(new URL('/subscription?err=portal', req.url), { status: 303 })
      }
    }

    return NextResponse.redirect(session.url, { status: 303 })
  } catch {
    return NextResponse.redirect(new URL('/subscription?err=portal', req.url), { status: 303 })
  }
}


