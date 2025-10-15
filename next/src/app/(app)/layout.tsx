'use client'

import { useEffect } from 'react'
import AppTopNav from "@/components/AppTopNav";

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
          if (data.active && data.plan === 'pro') {
            // Set cookie for 24 hours
            document.cookie = `user_plan=pro; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`
          } else {
            // Remove cookie if not Pro
            document.cookie = 'user_plan=; path=/; max-age=0'
          }
        }
      } catch (error) {
        console.error('Error setting Pro cookie:', error)
      }
    }

    setProCookie()
  }, [])

  return (
    <div className="theme-app min-h-screen bg-black text-white flex">
      <main className="flex-1 flex flex-col min-h-screen">
        <AppTopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}


