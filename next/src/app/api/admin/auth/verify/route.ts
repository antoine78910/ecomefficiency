import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

function getAdminSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    'dev_insecure_admin_session_secret'
  )
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ 
        success: false,
        authenticated: false 
      }, { status: 401 })
    }
    
    const allowedEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()

    // Verify signed token payload
    try {
      const raw = String(sessionCookie.value || '')
      const [payloadB64, sig] = raw.split('.', 2)
      if (!payloadB64 || !sig) throw new Error('bad_token')
      const expected = createHmac('sha256', getAdminSessionSecret()).update(payloadB64).digest('base64url')
      if (sig !== expected) throw new Error('bad_sig')

      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8')
      const payload = JSON.parse(payloadStr || '{}') as { email?: string; exp?: number }
      const exp = Number(payload?.exp || 0)
      const email = String(payload?.email || '').toLowerCase().trim()
      if (!email || email !== allowedEmail) throw new Error('bad_email')
      if (!exp || Date.now() > exp) throw new Error('expired')
    } catch {
        return NextResponse.json({ 
          success: false,
          authenticated: false 
        }, { status: 401 })
    }
    
    return NextResponse.json({ 
      success: true,
      authenticated: true 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      authenticated: false 
    }, { status: 500 })
  }
}

