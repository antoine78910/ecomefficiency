'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Users, Activity, BarChart3 } from 'lucide-react'

const adminRoutes = [
  {
    href: '/admin/sessions',
    label: 'Sessions',
    icon: Users,
    description: 'Historique des connexions'
  },
  {
    href: '/admin/activity',
    label: 'Activité',
    icon: Activity,
    description: 'Utilisateurs en ligne'
  },
  {
    href: '/admin/security',
    label: 'Sécurité',
    icon: Shield,
    description: 'Blocages IP et pays'
  },
  {
    href: '/admin',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Statistiques générales'
  }
]

export default function AdminNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {adminRoutes.map((route) => {
          const Icon = route.icon
          const isActive = pathname === route.href
          
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{route.label}</span>
            </Link>
          )
        })}
      </div>
      <p className="text-gray-400 text-sm mt-2">
        {adminRoutes.find(route => pathname === route.href)?.description || 'Panel administrateur'}
      </p>
    </nav>
  )
}
