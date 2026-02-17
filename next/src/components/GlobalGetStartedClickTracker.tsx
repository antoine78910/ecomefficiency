"use client"

import React from "react"
import { postGoal } from "@/lib/analytics"

function isTrackableHost(hostname: string) {
  const h = String(hostname || "").toLowerCase()
  return (
    h === "ecomefficiency.com" ||
    h === "www.ecomefficiency.com" ||
    h === "localhost" ||
    h === "127.0.0.1"
  )
}

function getPageType(pathname: string) {
  const p = String(pathname || "/")
  const seg = p.split("/").filter(Boolean)[0]
  return seg || "home"
}

function getUtmSource() {
  try {
    const sp = new URLSearchParams(window.location.search || "")
    return sp.get("utm_source") || ""
  } catch {
    return ""
  }
}

function normalizeText(s: string) {
  return String(s || "").replace(/\s+/g, " ").trim()
}

function findCtaTarget(start: Element | null) {
  let el: Element | null = start
  for (let i = 0; i < 6 && el; i++) {
    const cls = (el as any)?.classList
    if (cls && cls.contains("cta-get-started")) return el

    const tag = (el as any)?.tagName?.toLowerCase?.() || ""
    const role = (el as any)?.getAttribute?.("role") || ""
    const isClickable = tag === "a" || tag === "button" || role === "button"
    if (isClickable) {
      const txt = normalizeText((el as any)?.textContent || "")
      if (txt.toLowerCase().includes("get started")) return el
    }
    el = el.parentElement
  }
  return null
}

export default function GlobalGetStartedClickTracker() {
  const lastRef = React.useRef<{ key: string; at: number } | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!isTrackableHost(window.location.hostname)) return

    const handler = (e: MouseEvent) => {
      try {
        const target = e.target as Element | null
        const cta = findCtaTarget(target)
        if (!cta) return

        const pathname = window.location.pathname || "/"
        // Avoid tracking inside private/admin surfaces (marketing+SEO only)
        if (pathname.startsWith("/admin") || pathname.startsWith("/app")) return

        const href =
          ((cta as any)?.getAttribute?.("href") as string | null) ||
          ((cta as any)?.closest?.("a")?.getAttribute?.("href") as string | null) ||
          ""

        const key = `${pathname}::${href}::${normalizeText((cta as any)?.textContent || "").slice(0, 32)}`
        const now = Date.now()
        const last = lastRef.current
        if (last && last.key === key && now - last.at < 800) return
        lastRef.current = { key, at: now }

        const meta: Record<string, string> = {
          page_path: pathname,
          page_type: getPageType(pathname),
        }
        const ref = String(document.referrer || "")
        if (ref) meta.referrer = ref.slice(0, 255)
        const utm = getUtmSource()
        if (utm) meta.utm_source = utm.slice(0, 128)

        // Optional: include href when available (helps debugging)
        if (href) meta.href = String(href).slice(0, 255)

        postGoal("get_started_click", meta)
      } catch {
        // ignore
      }
    }

    // capture phase => catches clicks even if navigation happens immediately
    document.addEventListener("click", handler, { capture: true })
    return () => document.removeEventListener("click", handler, { capture: true } as any)
  }, [])

  return null
}

