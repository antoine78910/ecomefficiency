import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
])

export async function GET(req: NextRequest) {
  try {
    // Try server-side headers first (Cloudflare, Vercel, etc.)
    const cfCountry = req.headers.get('cf-ipcountry') || ''
    const vercelCountry = req.headers.get('x-vercel-ip-country') || ''
    const fallbackCountry = req.headers.get('x-country') || ''
    let country = (cfCountry || vercelCountry || fallbackCountry || '').toUpperCase()
    
    // If no country from headers (e.g., localhost), try IP geolocation API
    if (!country) {
      try {
        const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                         req.headers.get('x-real-ip') || 
                         '0.0.0.0'
        
        // Only use ipapi.co if we have a real IP (not localhost)
        if (clientIP && clientIP !== '0.0.0.0' && !clientIP.startsWith('127.') && !clientIP.startsWith('::1')) {
          const geoRes = await fetch(`https://ipapi.co/${clientIP}/json/`, { 
            cache: 'no-store',
            signal: AbortSignal.timeout(3000) // 3s timeout
          })
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            country = (geoData?.country_code || '').toUpperCase()
            console.log('[ip-region] Detected country from IP geolocation:', country)
          }
        }
      } catch (e) {
        console.warn('[ip-region] IP geolocation failed:', e)
        // Fall through to default
      }
    }
    
    const isEU = EU_COUNTRIES.has(country)
    const currency = isEU ? 'EUR' : 'USD'
    return NextResponse.json({ country: country || null, isEU, currency }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ country: null, isEU: false, currency: 'USD' }, { status: 200 })
  }
}


