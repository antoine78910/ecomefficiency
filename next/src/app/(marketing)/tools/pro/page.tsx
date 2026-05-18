import { Metadata } from 'next'
import { ExtensionCheckClient } from './ExtensionCheckClient'

export const metadata: Metadata = {
  title: 'Ecom Efficiency — Extension Check',
  robots: { index: false },
}

export default function ProPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <ExtensionCheckClient />
    </div>
  )
}
