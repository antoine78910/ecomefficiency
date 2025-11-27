'use client'

import { useState, useEffect } from 'react'
import { parseUserAgent } from '@/lib/parseUserAgent'
import { supabase } from '@/integrations/supabase/client'

export default function DeviceNamePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [suggestedName, setSuggestedName] = useState('')
  const [userName, setUserName] = useState('')
  
  useEffect(() => {
    // Vérifier si un nom de device existe déjà
    const existingName = localStorage.getItem('device_name')
    
    if (!existingName) {
      // Pas de nom, récupérer le nom de l'utilisateur
      const getUserName = async () => {
        try {
          const { data } = await supabase.auth.getUser()
          if (data.user) {
            const meta = data.user.user_metadata || {}
            const firstName = meta.first_name || ''
            setUserName(firstName)
          }
        } catch (error: any) {
          // Safe logging to prevent DataCloneError
          console.error('Error getting user:', error?.message || String(error))
        }
      }
      
      getUserName()
      
      // Générer une suggestion basée sur le user agent
      const ua = navigator.userAgent
      const parsed = parseUserAgent(ua)
      
      let suggested = ''
      if (parsed.device === 'Mobile' && parsed.deviceModel) {
        suggested = `${parsed.deviceModel}`
      } else if (parsed.device === 'Tablet' && parsed.deviceModel) {
        suggested = `${parsed.deviceModel}`
      } else if (parsed.os === 'macOS') {
        suggested = 'MacBook'
      } else if (parsed.os === 'Windows') {
        suggested = 'PC Windows'
      } else if (parsed.os === 'Linux') {
        suggested = 'PC Linux'
      } else {
        suggested = `${parsed.os} ${parsed.device}`
      }
      
      setSuggestedName(suggested)
      setDeviceName(suggested)
      
      // Afficher le prompt après un court délai
      setTimeout(() => setShowPrompt(true), 1500)
    }
  }, [])
  
  const handleSave = async () => {
    let finalName = deviceName.trim() || suggestedName
    
    // Ajouter le prénom si disponible
    if (userName && !finalName.toLowerCase().includes(userName.toLowerCase())) {
      finalName = `${finalName} de ${userName}`
    }
    
    localStorage.setItem('device_name', finalName)
    
    // Mettre à jour la session en cours dans Supabase
    try {
      const sessionId = sessionStorage.getItem('current_session_id')
      if (sessionId) {
        await supabase
          .from('user_sessions')
          .update({ device_name: finalName } as any)
          .eq('id', sessionId)
        
        console.log('Device name updated in current session:', finalName)
      }
    } catch (error: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error updating device name:', error?.message || String(error))
    }
    
    setShowPrompt(false)
  }
  
  const handleSkip = async () => {
    let finalName = suggestedName
    
    // Ajouter le prénom si disponible
    if (userName && !finalName.toLowerCase().includes(userName.toLowerCase())) {
      finalName = `${finalName} de ${userName}`
    }
    
    localStorage.setItem('device_name', finalName)
    
    // Mettre à jour la session en cours dans Supabase
    try {
      const sessionId = sessionStorage.getItem('current_session_id')
      if (sessionId) {
        await supabase
          .from('user_sessions')
          .update({ device_name: finalName } as any)
          .eq('id', sessionId)
        
        console.log('Device name auto-set in current session:', finalName)
      }
    } catch (error: any) {
      // Safe logging to prevent DataCloneError
      console.error('Error updating device name:', error?.message || String(error))
    }
    
    setShowPrompt(false)
  }
  
  if (!showPrompt) return null
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💻</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Nommez cet appareil
          </h2>
          <p className="text-gray-400 text-sm">
            {userName 
              ? `Bonjour ${userName} ! Donnez un nom à cet appareil`
              : 'Donnez un nom à cet appareil pour le reconnaître facilement'
            }
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom de l'appareil
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={userName ? `${suggestedName} de ${userName}` : suggestedName}
              className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {userName 
                ? `Ex: "${suggestedName} de ${userName}", "iPhone de ${userName}"`
                : 'Exemples : "MacBook de Julien", "iPhone perso", "PC bureau"'
              }
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-colors text-sm"
            >
              {userName 
                ? `Utiliser "${suggestedName} de ${userName}"`
                : `Utiliser "${suggestedName}"`
              }
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
            >
              Enregistrer
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Vous pourrez changer ce nom plus tard dans les paramètres
          </p>
        </div>
      </div>
    </div>
  )
}

