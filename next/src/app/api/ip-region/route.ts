import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
])

export function GET(req: NextRequest) {
  try {
    const cfCountry = req.headers.get('cf-ipcountry') || ''
    const vercelCountry = req.headers.get('x-vercel-ip-country') || ''
    const fallbackCountry = req.headers.get('x-country') || ''
    const country = (cfCountry || vercelCountry || fallbackCountry || '').toUpperCase()
    const isEU = EU_COUNTRIES.has(country)
    const currency = isEU ? 'EUR' : 'USD'
    return NextResponse.json({ country, isEU, currency }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ country: null, isEU: false, currency: 'USD' }, { status: 200 })
  }
}


