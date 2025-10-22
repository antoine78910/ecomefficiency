import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Cette API utilise plusieurs sources pour obtenir la meilleure géolocalisation possible
export async function GET(req: NextRequest) {
  try {
    // Récupérer l'IP du client
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') ||
                     req.headers.get('x-real-ip') || 
                     '0.0.0.0'
    
    // Si c'est une IP locale, essayer d'obtenir l'IP publique
    const isLocal = !clientIP || 
                    clientIP === '0.0.0.0' || 
                    clientIP === '::1' || 
                    clientIP === '127.0.0.1' || 
                    clientIP.startsWith('192.168.') ||
                    clientIP.startsWith('10.') ||
                    clientIP.startsWith('172.16.')
    
    if (isLocal) {
      // Pour les tests locaux, retourner des données par défaut
      return NextResponse.json({
        ip: clientIP,
        country: 'France',
        country_code: 'FR',
        city: 'Paris',
        region: 'Île-de-France',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
        isp: 'Local Network'
      })
    }
    
    // Essayer plusieurs APIs de géolocalisation pour plus de fiabilité
    
    // 1. Essayer ipapi.co (gratuit, 1000 req/jour)
    try {
      const response = await fetch(`https://ipapi.co/${clientIP}/json/`, {
        headers: {
          'User-Agent': 'EcomEfficiency/1.0'
        },
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Vérifier qu'on n'a pas atteint la limite
        if (!data.error) {
          return NextResponse.json({
            ip: clientIP,
            country: data.country_name || data.country || null,
            country_code: data.country_code || null,
            city: data.city || null,
            region: data.region || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            timezone: data.timezone || null,
            isp: data.org || null
          })
        }
      }
    } catch (error) {
      console.warn('[geolocation] ipapi.co failed:', error)
    }
    
    // 2. Fallback: Essayer ip-api.com (gratuit, 45 req/min)
    try {
      const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp`, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.status === 'success') {
          return NextResponse.json({
            ip: clientIP,
            country: data.country || null,
            country_code: data.countryCode || null,
            city: data.city || null,
            region: data.regionName || null,
            latitude: data.lat || null,
            longitude: data.lon || null,
            timezone: data.timezone || null,
            isp: data.isp || null
          })
        }
      }
    } catch (error) {
      console.warn('[geolocation] ip-api.com failed:', error)
    }
    
    // 3. Dernier fallback: Utiliser les headers Cloudflare/Vercel si disponibles
    const cfCountry = req.headers.get('cf-ipcountry')
    const vercelCountry = req.headers.get('x-vercel-ip-country')
    const vercelCity = req.headers.get('x-vercel-ip-city')
    
    if (cfCountry || vercelCountry) {
      return NextResponse.json({
        ip: clientIP,
        country: cfCountry || vercelCountry || null,
        country_code: (cfCountry || vercelCountry || '').toUpperCase() || null,
        city: vercelCity ? decodeURIComponent(vercelCity) : null,
        region: null,
        latitude: null,
        longitude: null,
        timezone: null,
        isp: null
      })
    }
    
    // Aucune source n'a fonctionné
    return NextResponse.json({
      ip: clientIP,
      country: null,
      country_code: null,
      city: null,
      region: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null
    })
    
  } catch (error) {
    console.error('[geolocation] Error:', error)
    return NextResponse.json({
      ip: null,
      country: null,
      country_code: null,
      city: null,
      region: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null
    }, { status: 500 })
  }
}

