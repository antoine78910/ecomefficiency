import { supabaseAdmin } from '@/integrations/supabase/server'

export interface SecurityCheckResult {
  isBlocked: boolean
  reason?: string
  blockType?: 'ip' | 'country' | 'ip_range'
  countryCode?: string
  countryName?: string
}

export interface GeolocationData {
  country_code: string
  country_name: string
  city?: string
  region?: string
}

/**
 * Vérifie si une IP est bloquée
 */
export async function checkIPBlocked(ip: string): Promise<SecurityCheckResult> {
  try {
    if (!supabaseAdmin) {
      console.log('⚠️ Supabase admin non configuré, blocage désactivé')
      return { isBlocked: false }
    }
    
    // Vérifier les IPs exactes
    const { data: blockedIPs } = await supabaseAdmin
      .from('blocked_ips')
      .select('ip_address, reason')
      .eq('ip_address', ip)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .limit(1)

    if (blockedIPs && blockedIPs.length > 0) {
      return {
        isBlocked: true,
        reason: blockedIPs[0].reason || 'IP bloquée',
        blockType: 'ip'
      }
    }

    // Vérifier les plages IP (CIDR)
    const { data: blockedRanges } = await supabaseAdmin
      .from('blocked_ip_ranges')
      .select('ip_range, reason')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')

    if (blockedRanges && blockedRanges.length > 0) {
      for (const range of blockedRanges) {
        if (isIPInRange(ip, range.ip_range)) {
          return {
            isBlocked: true,
            reason: range.reason || 'IP dans une plage bloquée',
            blockType: 'ip_range'
          }
        }
      }
    }

    return { isBlocked: false }
  } catch (error) {
    console.error('Erreur lors de la vérification IP:', error)
    return { isBlocked: false }
  }
}

/**
 * Vérifie si un pays est bloqué
 */
export async function checkCountryBlocked(countryCode: string): Promise<SecurityCheckResult> {
  try {
    if (!supabaseAdmin) {
      return { isBlocked: false }
    }
    
    const { data: blockedCountries } = await supabaseAdmin
      .from('blocked_countries')
      .select('country_code, country_name, reason, is_active')
      .eq('country_code', countryCode.toUpperCase())
      .eq('is_active', true)
      .limit(1)

    if (blockedCountries && blockedCountries.length > 0) {
      return {
        isBlocked: true,
        reason: blockedCountries[0].reason || 'Pays bloqué',
        blockType: 'country',
        countryCode: blockedCountries[0].country_code,
        countryName: blockedCountries[0].country_name
      }
    }

    return { isBlocked: false }
  } catch (error) {
    console.error('Erreur vérification pays:', error)
    return { isBlocked: false }
  }
}

/**
 * Obtient la géolocalisation d'une IP
 */
export async function getIPGeolocation(ip: string): Promise<GeolocationData | null> {
  try {
    // MODE TEST : Simuler un pays si localhost
    if (isLocalIP(ip) && process.env.SIMULATE_COUNTRY) {
      const SIMULATE_COUNTRY = process.env.SIMULATE_COUNTRY
      const countries: Record<string, { code: string; name: string; city: string }> = {
        'TH': { code: 'TH', name: 'Thailand', city: 'Bangkok' },
        'US': { code: 'US', name: 'United States', city: 'New York' },
        'CN': { code: 'CN', name: 'China', city: 'Beijing' },
        'RU': { code: 'RU', name: 'Russia', city: 'Moscow' },
        'FR': { code: 'FR', name: 'France', city: 'Paris' },
        'DE': { code: 'DE', name: 'Germany', city: 'Berlin' }
      }
      
      const country = countries[SIMULATE_COUNTRY.toUpperCase()]
      if (country) {
        return {
          country_code: country.code,
          country_name: country.name,
          city: country.city,
          region: country.name
        }
      }
    }
    
    // Éviter les IPs locales (sauf en mode test)
    if (isLocalIP(ip) && !process.env.SIMULATE_COUNTRY) {
      return null
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.error) {
      return null
    }
    
    return {
      country_code: data.country_code,
      country_name: data.country_name,
      city: data.city,
      region: data.region
    }
  } catch (error) {
    console.error('Erreur géolocalisation:', error)
    return null
  }
}

/**
 * Vérifie si une IP est dans une plage CIDR
 */
function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/')
    const ipNum = ipToNumber(ip)
    const rangeNum = ipToNumber(range)
    const mask = (0xffffffff << (32 - parseInt(bits))) >>> 0
    
    return (ipNum & mask) === (rangeNum & mask)
  } catch {
    return false
  }
}

/**
 * Convertit une IP en nombre
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}

/**
 * Vérifie si une IP est locale
 */
function isLocalIP(ip: string): boolean {
  const localRanges = [
    '127.0.0.0/8',     // localhost
    '10.0.0.0/8',      // private
    '172.16.0.0/12',   // private
    '192.168.0.0/16',  // private
    '::1',             // IPv6 localhost
    'fc00::/7',        // IPv6 private
    'fe80::/10'        // IPv6 link-local
  ]
  
  return localRanges.some(range => isIPInRange(ip, range))
}

/**
 * Effectue une vérification de sécurité complète
 */
export async function performSecurityCheck(
  ip: string, 
  userAgent?: string, 
  requestPath?: string
): Promise<SecurityCheckResult> {
  try {
    // 1. Vérifier l'IP directement
    const ipCheck = await checkIPBlocked(ip)
    
    if (ipCheck.isBlocked) {
      await logSecurityEvent(ip, ipCheck, userAgent, requestPath)
      return ipCheck
    }

    // 2. Obtenir UNE FOIS la géolocalisation de l'IP
    const geoData = await getIPGeolocation(ip)
    
    if (!geoData) {
      return { isBlocked: false }
    }

    // LOG SIMPLE : Afficher le pays détecté
    console.log(`🌍 Pays détecté pour IP ${ip}: ${geoData.country_name} (${geoData.country_code})`)

    // 3. Vérifier dans la table Supabase si ce country_code est bloqué
    const countryCheck = await checkCountryBlocked(geoData.country_code)
    
    if (countryCheck.isBlocked) {
      console.log(`🚫 Accès bloqué: ${geoData.country_name}`)
      await logSecurityEvent(ip, countryCheck, userAgent, requestPath, geoData)
      return countryCheck
    }

    return { isBlocked: false }
  } catch (error) {
    console.error('❌ Erreur sécurité:', error)
    return { isBlocked: false }
  }
}

/**
 * Enregistre un événement de sécurité
 */
async function logSecurityEvent(
  ip: string,
  result: SecurityCheckResult,
  userAgent?: string,
  requestPath?: string,
  geoData?: GeolocationData
) {
  try {
    if (!supabaseAdmin) {
      console.log('⚠️ Supabase admin non configuré, log non enregistré')
      return
    }
    
    await supabaseAdmin.from('security_logs').insert({
      ip_address: ip,
      country_code: geoData?.country_code,
      country_name: geoData?.country_name,
      user_agent: userAgent,
      blocked_reason: result.reason || 'Blocage inconnu',
      blocked_type: result.blockType || 'unknown',
      request_path: requestPath
    })
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log:', error)
  }
}

/**
 * Obtient l'IP réelle du client
 */
export function getClientIP(request: any): string {
  try {
    // Si NextRequest
    if (request.headers) {
      const headers = request.headers
      
      // Vérifier les headers de proxy
      const forwardedFor = headers.get('x-forwarded-for')
      const realIP = headers.get('x-real-ip')
      const cfConnectingIP = headers.get('cf-connecting-ip')
      
      if (cfConnectingIP) return cfConnectingIP
      if (realIP) return realIP
      if (forwardedFor) return forwardedFor.split(',')[0].trim()
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'IP:', error)
  }
  
  // Fallback pour le développement local
  return '127.0.0.1'
}
