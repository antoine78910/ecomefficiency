'use client'

import { useEffect } from 'react'

export default function ElevenLabsPage() {
  useEffect(() => {
    // Direct access - no verification
    window.location.href = 'https://app.ecomefficiency.com/elevenlabs/app/sign-in'
  }, [])

  return null // No content, just redirect
}


