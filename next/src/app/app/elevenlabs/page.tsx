'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export default function ElevenLabsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkAccess() {
      try {
        // supabase is already imported
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          setError('Erreur d\'authentification: ' + authError.message)
          setLoading(false)
          return
        }
        
        if (!user) {
          // Try to get session from URL or storage
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setError('Vous devez être connecté pour accéder à ElevenLabs')
            setLoading(false)
            return
          }
          setUser(session.user)
        } else {
          setUser(user)
        }

        // Check subscription status
        const response = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })

        if (!response.ok) {
          setError('Accès refusé - Plan Pro requis')
          setLoading(false)
          return
        }

        const data = await response.json()
        if (!data.active || data.plan !== 'pro') {
          setError('Accès refusé - Plan Pro requis')
          setLoading(false)
          return
        }

        // Access granted - redirect to ElevenLabs with app subdomain
        const currentHost = window.location.hostname
        const isLocalhost = currentHost.includes('localhost')
        const baseUrl = isLocalhost ? 'app.localhost:5000' : currentHost
        
        window.location.href = `https://ecomefficiency.com/elevenlabs/app/sign-in`
        
      } catch (err) {
        console.error('Error checking access:', err)
        setError('Erreur de vérification d\'accès')
        setLoading(false)
      }
    }

    checkAccess()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Vérification d'accès...</h2>
          <p className="text-gray-400">Vérification de votre abonnement Pro</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Accès refusé</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-3">
            <a 
              href="/subscription" 
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mettre à niveau vers Pro
            </a>
            <a 
              href="/app" 
              className="block w-full bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Retour à l'app
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null // Will redirect
}
