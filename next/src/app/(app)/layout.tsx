'use client'

import { useEffect } from 'react'
import AppTopNav from "@/components/AppTopNav";
import ActivityTracker from "@/components/ActivityTracker";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set Pro plan cookie when user is on app
    async function setProCookie() {
      try {
        const response = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })

        if (response.ok) {
          const data = await response.json()
          const host = typeof window !== 'undefined' ? window.location.hostname : ''
          const isProd = /\.ecomefficiency\.com$/i.test(host) || host === 'ecomefficiency.com' || host === 'www.ecomefficiency.com'
          const domainAttr = isProd ? '; Domain=.ecomefficiency.com' : ''

          if (data.active && data.plan) {
            // Set cookie for 24 hours with cross-subdomain scope
            document.cookie = `user_plan=${encodeURIComponent(data.plan)}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax${domainAttr}`
          } else {
            // Remove cookie if not active
            document.cookie = `user_plan=; path=/; max-age=0; SameSite=Lax${domainAttr}`
          }
        }
      } catch (error: any) {
        console.error('Error setting Pro cookie:', error?.message || String(error))
      }
    }

    setProCookie()
  }, [])

  return (
    <div className="theme-app min-h-screen bg-black text-white flex">
      {/* Tracker d'activité en arrière-plan */}
      <ActivityTracker />
      
      <main className="flex-1 flex flex-col min-h-screen">
        <AppTopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}


