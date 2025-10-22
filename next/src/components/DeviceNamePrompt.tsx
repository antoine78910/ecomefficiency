'use client'

import { useState, useEffect } from 'react'
import { parseUserAgent } from '@/lib/parseUserAgent'

interface DeviceNamePromptProps {
  onDeviceNameSet: (deviceName: string) => void
}

export default function DeviceNamePrompt({ onDeviceNameSet }: DeviceNamePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [suggestedName, setSuggestedName] = useState('')
  
  useEffect(() => {
    // Vérifier si un nom de device existe déjà
    const existingName = localStorage.getItem('device_name')
    
    if (existingName) {
      // Nom existant, l'envoyer immédiatement
      onDeviceNameSet(existingName)
    } else {
      // Pas de nom, générer une suggestion et afficher le prompt
      const ua = navigator.userAgent
      const parsed = parseUserAgent(ua)
      
      let suggested = ''
      if (parsed.device === 'Mobile' && parsed.deviceModel) {
        suggested = parsed.deviceModel
      } else if (parsed.device === 'Tablet' && parsed.deviceModel) {
        suggested = parsed.deviceModel
      } else {
        suggested = `${parsed.os} ${parsed.device}`
      }
      
      setSuggestedName(suggested)
      setDeviceName(suggested)
      
      // Afficher le prompt après un court délai
      setTimeout(() => setShowPrompt(true), 1000)
    }
  }, [onDeviceNameSet])
  
  const handleSave = () => {
    const finalName = deviceName.trim() || suggestedName
    localStorage.setItem('device_name', finalName)
    onDeviceNameSet(finalName)
    setShowPrompt(false)
  }
  
  const handleSkip = () => {
    const finalName = suggestedName
    localStorage.setItem('device_name', finalName)
    onDeviceNameSet(finalName)
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
            Donnez un nom à cet appareil pour le reconnaître facilement dans votre historique de connexions
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
              placeholder={suggestedName}
              className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Exemples : "MacBook de Julien", "iPhone perso", "PC bureau"
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Utiliser "{suggestedName}"
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

