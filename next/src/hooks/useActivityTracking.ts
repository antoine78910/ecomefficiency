'use client'

import { useEffect, useRef } from 'react'

interface UseActivityTrackingProps {
  sessionId: string | null
  userId: string | null
  enabled?: boolean
}

export function useActivityTracking({ sessionId, userId, enabled = true }: UseActivityTrackingProps) {
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)
  const isUnloadingRef = useRef(false)
  
  useEffect(() => {
    if (!enabled || !sessionId || !userId) return
    
    // Fonction pour envoyer un heartbeat
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, user_id: userId }),
        })
      } catch (error) {
        console.error('[Activity] Heartbeat error:', error)
      }
    }
    
    // Fonction pour terminer la session
    const endSession = async () => {
      if (isUnloadingRef.current) return // Éviter les appels multiples
      isUnloadingRef.current = true
      
      try {
        // Utiliser sendBeacon pour garantir l'envoi même si la page se ferme
        const data = JSON.stringify({ session_id: sessionId, user_id: userId })
        const blob = new Blob([data], { type: 'application/json' })
        
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/activity/end-session', blob)
        } else {
          // Fallback pour les navigateurs qui ne supportent pas sendBeacon
          await fetch('/api/activity/end-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true,
          })
        }
      } catch (error) {
        console.error('[Activity] End session error:', error)
      }
    }
    
    // Envoyer un heartbeat initial
    sendHeartbeat()
    
    // Envoyer un heartbeat toutes les 30 secondes
    heartbeatInterval.current = setInterval(sendHeartbeat, 30000)
    
    // Détecter la fermeture de la page ou du navigateur
    const handleBeforeUnload = () => {
      endSession()
    }
    
    // Détecter le changement de visibilité (onglet masqué)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // L'utilisateur a changé d'onglet ou minimisé, on peut considérer ça comme une fin de session
        // Mais on ne le fait pas immédiatement, on laisse le timeout gérer ça
      } else {
        // L'utilisateur revient, on envoie un heartbeat
        sendHeartbeat()
      }
    }
    
    // Écouter les événements
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Terminer la session lors du unmount
      endSession()
    }
  }, [sessionId, userId, enabled])
}

