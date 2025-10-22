'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useActivityTracking } from '@/hooks/useActivityTracking'

export default function ActivityTracker() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Activer le tracking d'activité
  useActivityTracking({ 
    sessionId, 
    userId, 
    enabled: !!sessionId && !!userId 
  })
  
  useEffect(() => {
    // Récupérer l'ID de session depuis sessionStorage
    const storedSessionId = sessionStorage.getItem('current_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
    
    // Récupérer l'utilisateur connecté
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUserId(data.user.id)
      }
    }
    
    getUser()
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
        setSessionId(null)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  // Ce composant ne rend rien, il track juste l'activité en arrière-plan
  return null
}

