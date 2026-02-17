import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import Stripe from "stripe"
import { supabaseAdmin } from "@/integrations/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function expectedToken() {
  return process.env.ADMIN_PANEL_TOKEN || "Zjhfc82005ad"
}

async function isAuthorized(req: NextRequest) {
  const expected = expectedToken()
  if (!expected) return false

  const url = new URL(req.url)
  const queryToken = String(url.searchParams.get("token") || "")
  if (queryToken && queryToken === expected) return true

  const cookieStore = await cookies()
  const cookieToken = String(cookieStore.get("ee_admin_token")?.value || "")
  return cookieToken === expected
}

function normalizeSource(v: any): string {
  const s = String(v || "").trim().toLowerCase()
  if (!s) return "unknown"
  if (s === "x" || s === "x/twitter" || s === "x_twitter") return "twitter"
  if (s === "twitter/x") return "twitter"
  if (s === "ai" || s === "llm" || s === "chatgpt" || s === "gpt") return "ai_llm"
  if (s === "friend") return "friends"
  return s
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (true) {
      const idx = next++
      if (idx >= items.length) break
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "supabase_admin_not_configured" }, { status: 500 })
    }

    const url = new URL(req.url)
    const limit = Math.max(1, Math.min(2000, Number(url.searchParams.get("limit") || 200)))

    // Supabase Auth Admin list users is paginated.
    const perPage = Math.min(1000, limit)
    let page = 1
    let out: any[] = []
    while (out.length < limit) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      const users = data?.users || []
      if (!users.length) break
      out.push(...users)
      if (users.length < perPage) break
      page += 1
    }
    out = out.slice(0, limit)

    const stripeKey = process.env.STRIPE_SECRET_KEY || ""
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null

    const enriched = await mapWithLimit(out, 6, async (u: any) => {
      const meta = (u.user_metadata || {}) as any
      const source = normalizeSource(meta.acquisition_source)
      let customerId: string | null = meta.stripe_customer_id ? String(meta.stripe_customer_id) : null

      let paid: boolean | null = null
      let plan: string | null = meta.plan ? String(meta.plan).toLowerCase() : null
      let subStatus: string | null = null

      // Fallback snapshot captured at onboarding
      if (!stripe || !customerId) {
        if (typeof meta.acquisition_paid_at_answer === "boolean") paid = Boolean(meta.acquisition_paid_at_answer)
        if (!plan && meta.acquisition_plan_at_answer) plan = String(meta.acquisition_plan_at_answer)
      }

      if (stripe) {
        // If no customer id in metadata, try to find it by email (best effort)
        if (!customerId && u.email) {
          try {
            const search = await stripe.customers.search({ query: `email:'${String(u.email)}'`, limit: 1 })
            const found = (search.data || [])[0]
            if (found?.id) customerId = found.id
          } catch {}
        }

        if (customerId) {
          try {
            const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 3 })
            const latest = (subs.data || []).sort((a, b) => (b.created || 0) - (a.created || 0))[0]
            if (latest) {
              subStatus = latest.status || null
              paid = latest.status === "active" || latest.status === "trialing"
            } else {
              paid = false
            }
          } catch {
            paid = null
          }
        }
      }

      return {
        id: u.id,
        email: u.email || null,
        created_at: u.created_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
        source,
        stripe_customer_id: customerId,
        paid,
        plan,
        sub_status: subStatus,
      }
    })

    const bySource: Record<string, { total: number; paid: number; unknownPaid: number }> = {}
    for (const u2 of enriched) {
      const s = u2.source || "unknown"
      if (!bySource[s]) bySource[s] = { total: 0, paid: 0, unknownPaid: 0 }
      bySource[s].total += 1
      if (u2.paid === true) bySource[s].paid += 1
      if (u2.paid === null) bySource[s].unknownPaid += 1
    }

    const totals = enriched.reduce(
      (acc, u2) => {
        acc.total += 1
        if (u2.paid === true) acc.paid += 1
        if (u2.paid === false) acc.unpaid += 1
        if (u2.paid === null) acc.unknown += 1
        return acc
      },
      { total: 0, paid: 0, unpaid: 0, unknown: 0 },
    )

    return NextResponse.json({
      ok: true,
      totals,
      bySource,
      users: enriched,
      stripeEnabled: Boolean(stripe),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}

