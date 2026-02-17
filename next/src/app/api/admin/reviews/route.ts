import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/integrations/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function expectedToken() {
  return process.env.ADMIN_PANEL_TOKEN || "Zjhfc82005ad"
}

async function isAuthorized(req: NextRequest) {
  const expected = expectedToken()
  const url = new URL(req.url)
  const q = String(url.searchParams.get("token") || "")
  if (q && q === expected) return true
  const cookieStore = await cookies()
  const c = String(cookieStore.get("ee_admin_token")?.value || "")
  return c === expected
}

function pick(meta: any) {
  const m = (meta || {}) as any
  return {
    review_prompt_shown_at: typeof m.review_prompt_shown_at === "string" ? m.review_prompt_shown_at : null,
    review_prompt_dismissed_at: typeof m.review_prompt_dismissed_at === "string" ? m.review_prompt_dismissed_at : null,
    review_prompt_submitted_at: typeof m.review_prompt_submitted_at === "string" ? m.review_prompt_submitted_at : null,
    review_rating: typeof m.review_rating === "number" ? m.review_rating : m.review_rating ? Number(m.review_rating) : null,
    review_feedback: typeof m.review_feedback === "string" ? m.review_feedback : null,
    review_trustpilot_clicked_at: typeof m.review_trustpilot_clicked_at === "string" ? m.review_trustpilot_clicked_at : null,
    review_trustpilot_redirected_at: typeof m.review_trustpilot_redirected_at === "string" ? m.review_trustpilot_redirected_at : null,
    review_promo_step_reached_at: typeof m.review_promo_step_reached_at === "string" ? m.review_promo_step_reached_at : null,
  }
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
    const limit = Math.max(1, Math.min(2000, Number(url.searchParams.get("limit") || 800)))
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

    const rows = out
      .map((u: any) => {
        const meta = pick(u.user_metadata)
        return {
          id: u.id,
          email: u.email || null,
          created_at: u.created_at || null,
          last_sign_in_at: u.last_sign_in_at || null,
          ...meta,
        }
      })
      .filter((u: any) => Boolean(u.review_prompt_shown_at || u.review_prompt_submitted_at || u.review_prompt_dismissed_at))
      .sort((a: any, b: any) => String(b.review_prompt_shown_at || "").localeCompare(String(a.review_prompt_shown_at || "")))

    const totals = {
      shown: 0,
      submitted: 0,
      dismissed: 0,
      no_response: 0,
      trustpilot_clicked: 0,
      trustpilot_redirected: 0,
      promo_step: 0,
      ratings: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as Record<string, number>,
    }

    for (const r of rows) {
      totals.shown += r.review_prompt_shown_at ? 1 : 0
      totals.submitted += r.review_prompt_submitted_at ? 1 : 0
      totals.dismissed += r.review_prompt_dismissed_at ? 1 : 0
      totals.trustpilot_clicked += r.review_trustpilot_clicked_at ? 1 : 0
      totals.trustpilot_redirected += (r as any).review_trustpilot_redirected_at ? 1 : 0
      totals.promo_step += r.review_promo_step_reached_at ? 1 : 0
      const hasResponse = Boolean(r.review_prompt_submitted_at || r.review_prompt_dismissed_at)
      if (r.review_prompt_shown_at && !hasResponse) totals.no_response += 1
      const rr = Number(r.review_rating || 0)
      if (rr >= 1 && rr <= 5) totals.ratings[String(rr)] = (totals.ratings[String(rr)] || 0) + 1
    }

    return NextResponse.json({ ok: true, totals, rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}

