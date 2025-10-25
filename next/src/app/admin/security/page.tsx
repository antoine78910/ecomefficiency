'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Plus, Shield, AlertTriangle, Globe, Network, Eye } from 'lucide-react'
import AdminNavigation from '@/components/AdminNavigation'
import AdminLogoutButton from '@/components/AdminLogoutButton'

interface BlockedIP {
  id: string
  ip_address: string
  reason: string
  created_at: string
  expires_at?: string
  is_active: boolean
  notes?: string
}

interface BlockedCountry {
  id: string
  country_code: string
  country_name: string
  reason: string
  created_at: string
  is_active: boolean
  notes?: string
}

interface BlockedRange {
  id: string
  ip_range: string
  reason: string
  created_at: string
  expires_at?: string
  is_active: boolean
  notes?: string
}

interface SecurityLog {
  id: string
  ip_address: string
  country_code?: string
  country_name?: string
  blocked_reason: string
  blocked_type: string
  created_at: string
  request_path?: string
}

export default function SecurityPage() {
  const router = useRouter()
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [blockedCountries, setBlockedCountries] = useState<BlockedCountry[]>([])
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  // États pour les formulaires
  const [newIP, setNewIP] = useState('')
  const [newIPReason, setNewIPReason] = useState('')
  const [newCountryCode, setNewCountryCode] = useState('')
  const [newCountryName, setNewCountryName] = useState('')
  const [newCountryReason, setNewCountryReason] = useState('')
  const [newRange, setNewRange] = useState('')
  const [newRangeReason, setNewRangeReason] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/verify')
      const data = await response.json()
      
      if (data.success) {
        setAuthenticated(true)
        loadData()
      } else {
        router.push('/admin/login')
      }
    } catch (err) {
      router.push('/admin/login')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [ipsRes, countriesRes, rangesRes, logsRes] = await Promise.all([
        fetch('/api/admin/security/blocked-ips'),
        fetch('/api/admin/security/blocked-countries'),
        fetch('/api/admin/security/blocked-ranges'),
        fetch('/api/admin/security/logs?limit=50')
      ])

      const [ipsData, countriesData, rangesData, logsData] = await Promise.all([
        ipsRes.json(),
        countriesRes.json(),
        rangesRes.json(),
        logsRes.json()
      ])

      console.log('📊 Données reçues:', { ipsData, countriesData, rangesData, logsData })

      setBlockedIPs(ipsData?.data || [])
      setBlockedCountries(countriesData?.data || [])
      setBlockedRanges(rangesData?.data || [])
      setSecurityLogs(logsData?.data || [])
    } catch (err) {
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const addBlockedIP = async () => {
    if (!newIP) return

    try {
      const response = await fetch('/api/admin/security/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: newIP,
          reason: newIPReason || 'Blocage manuel'
        })
      })

      if (response.ok) {
        setNewIP('')
        setNewIPReason('')
        loadData()
      }
    } catch (err) {
      setError('Erreur lors de l\'ajout de l\'IP')
    }
  }

  const addBlockedCountry = async () => {
    if (!newCountryCode || !newCountryName) return

    try {
      const response = await fetch('/api/admin/security/blocked-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country_code: newCountryCode,
          country_name: newCountryName,
          reason: newCountryReason || 'Blocage manuel'
        })
      })

      if (response.ok) {
        setNewCountryCode('')
        setNewCountryName('')
        setNewCountryReason('')
        loadData()
      }
    } catch (err) {
      setError('Erreur lors de l\'ajout du pays')
    }
  }

  const addBlockedRange = async () => {
    if (!newRange) return

    try {
      const response = await fetch('/api/admin/security/blocked-ranges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_range: newRange,
          reason: newRangeReason || 'Blocage manuel'
        })
      })

      if (response.ok) {
        setNewRange('')
        setNewRangeReason('')
        loadData()
      }
    } catch (err) {
      setError('Erreur lors de l\'ajout de la plage')
    }
  }

  const deleteItem = async (type: 'ip' | 'country' | 'range', id: string) => {
    try {
      const endpoint = type === 'ip' ? 'blocked-ips' : 
                     type === 'country' ? 'blocked-countries' : 'blocked-ranges'
      
      const response = await fetch(`/api/admin/security/${endpoint}?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadData()
      }
    } catch (err) {
      setError('Erreur lors de la suppression')
    }
  }

  const toggleActive = async (type: 'ip' | 'country' | 'range', id: string, isActive: boolean) => {
    try {
      const endpoint = type === 'ip' ? 'blocked-ips' : 
                     type === 'country' ? 'blocked-countries' : 'blocked-ranges'
      
      const response = await fetch(`/api/admin/security/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive })
      })

      if (response.ok) {
        loadData()
      }
    } catch (err) {
      setError('Erreur lors de la modification')
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <AdminNavigation />
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <AdminNavigation />
        
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-red-600" />
                Gestion de la Sécurité
              </h1>
              <p className="text-gray-400 mt-2">
                Gérez les blocages IP, pays et plages, et consultez les logs de sécurité
              </p>
            </div>
            <Button 
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Masquer' : 'Prévisualiser'} la page d'erreur
            </Button>
          </div>
        </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showPreview && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prévisualisation de la page d'erreur
            </CardTitle>
            <CardDescription>
              Voici à quoi ressemble la page affichée aux utilisateurs bloqués
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-black p-8 min-h-[300px] flex items-center justify-center">
                <div className="text-center max-w-lg w-full mx-4">
                  <div className="text-5xl mb-4">🚫</div>
                  <h1 className="text-2xl font-bold text-white mb-4">
                    Service indisponible
                  </h1>
                  <p className="text-gray-400 leading-relaxed">
                    Notre service est momentanément indisponible.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ips" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ips" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            IPs ({blockedIPs.length})
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Pays ({blockedCountries.length})
          </TabsTrigger>
          <TabsTrigger value="ranges" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Plages ({blockedRanges.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Logs ({securityLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Onglet IPs */}
        <TabsContent value="ips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une IP bloquée</CardTitle>
              <CardDescription>
                Bloquer une adresse IP spécifique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ip">Adresse IP</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.100"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ip-reason">Raison</Label>
                  <Input
                    id="ip-reason"
                    placeholder="Spam, attaque, etc."
                    value={newIPReason}
                    onChange={(e) => setNewIPReason(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={addBlockedIP} disabled={!newIP}>
                <Plus className="h-4 w-4 mr-2" />
                Bloquer cette IP
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {blockedIPs.map((ip) => (
              <Card key={ip.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {ip.ip_address}
                        </code>
                        <Badge variant={ip.is_active ? 'destructive' : 'secondary'}>
                          {ip.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{ip.reason}</p>
                      {ip.notes && <p className="text-xs text-gray-500">{ip.notes}</p>}
                      <p className="text-xs text-gray-400">
                        Ajouté le {new Date(ip.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive('ip', ip.id, ip.is_active)}
                      >
                        {ip.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('ip', ip.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Pays */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un pays bloqué</CardTitle>
              <CardDescription>
                Bloquer tous les accès depuis un pays
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="country-code">Code pays</Label>
                  <Input
                    id="country-code"
                    placeholder="CN, RU, IR"
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label htmlFor="country-name">Nom du pays</Label>
                  <Input
                    id="country-name"
                    placeholder="Chine, Russie, Iran"
                    value={newCountryName}
                    onChange={(e) => setNewCountryName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country-reason">Raison</Label>
                  <Input
                    id="country-reason"
                    placeholder="Région à risque"
                    value={newCountryReason}
                    onChange={(e) => setNewCountryReason(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={addBlockedCountry} disabled={!newCountryCode || !newCountryName}>
                <Plus className="h-4 w-4 mr-2" />
                Bloquer ce pays
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {blockedCountries.map((country) => (
              <Card key={country.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌍</span>
                        <span className="font-medium">{country.country_name}</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {country.country_code}
                        </code>
                        <Badge variant={country.is_active ? 'destructive' : 'secondary'}>
                          {country.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{country.reason}</p>
                      {country.notes && <p className="text-xs text-gray-500">{country.notes}</p>}
                      <p className="text-xs text-gray-400">
                        Ajouté le {new Date(country.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive('country', country.id, country.is_active)}
                      >
                        {country.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('country', country.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Plages */}
        <TabsContent value="ranges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une plage IP bloquée</CardTitle>
              <CardDescription>
                Bloquer une plage d'adresses IP (format CIDR)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="range">Plage IP (CIDR)</Label>
                  <Input
                    id="range"
                    placeholder="192.168.1.0/24"
                    value={newRange}
                    onChange={(e) => setNewRange(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="range-reason">Raison</Label>
                  <Input
                    id="range-reason"
                    placeholder="Réseau suspect"
                    value={newRangeReason}
                    onChange={(e) => setNewRangeReason(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={addBlockedRange} disabled={!newRange}>
                <Plus className="h-4 w-4 mr-2" />
                Bloquer cette plage
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {blockedRanges.map((range) => (
              <Card key={range.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {range.ip_range}
                        </code>
                        <Badge variant={range.is_active ? 'destructive' : 'secondary'}>
                          {range.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{range.reason}</p>
                      {range.notes && <p className="text-xs text-gray-500">{range.notes}</p>}
                      <p className="text-xs text-gray-400">
                        Ajouté le {new Date(range.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive('range', range.id, range.is_active)}
                      >
                        {range.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteItem('range', range.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de sécurité récents</CardTitle>
              <CardDescription>
                Dernières tentatives de connexion bloquées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                          {log.ip_address}
                        </code>
                        <Badge variant="destructive">{log.blocked_type}</Badge>
                        {log.country_code && (
                          <Badge variant="outline">
                            {log.country_code} {log.country_name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Raison:</strong> {log.blocked_reason}
                    </p>
                    {log.request_path && (
                      <p className="text-xs text-gray-500">
                        <strong>Chemin:</strong> {log.request_path}
                      </p>
                    )}
                  </div>
                ))}
                {securityLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Aucun log de sécurité récent
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex items-center justify-between">
        <p className="text-gray-500 text-xs">
          Système de sécurité actif • Protection IP et géolocalisation
        </p>
        <AdminLogoutButton />
      </div>
      </div>
    </div>
  )
}
