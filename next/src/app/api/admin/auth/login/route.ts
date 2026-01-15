import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

function getAdminSessionSecret() {
  // Use a server-only secret that exists in prod. This keeps the session token unforgeable.
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    // last resort (dev only)
    'dev_insecure_admin_session_secret'
  )
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const allowedEmail = (process.env.ADMIN_EMAIL || 'anto.delbos@gmail.com').toLowerCase().trim()

    const normalizedEmail = String(email || '').toLowerCase().trim()
    if (!normalizedEmail || normalizedEmail !== allowedEmail) {
      return NextResponse.json({
        success: false,
        message: 'Invalid admin email'
      }, { status: 401 })
    }

    // Email-only admin login (requested): create a signed session cookie valid 7 days.
    const exp = Date.now() + 1000 * 60 * 60 * 24 * 7
    const payload = { email: normalizedEmail, exp }
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', getAdminSessionSecret()).update(payloadB64).digest('base64url')
    const sessionToken = `${payloadB64}.${sig}`
    
    // Stocker le cookie avec une durée de 7 jours
    const cookieStore = await cookies()
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/'
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logged in successfully' 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred' 
    }, { status: 500 })
  }
}

