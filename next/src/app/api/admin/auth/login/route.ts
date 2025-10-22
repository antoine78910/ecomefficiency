import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    // Le mot de passe à définir dans .env: ADMIN_PASSWORD
    const correctPassword = process.env.ADMIN_PASSWORD || ''
    
    if (!correctPassword) {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin password not configured' 
      }, { status: 500 })
    }
    
    if (password !== correctPassword) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid password' 
      }, { status: 401 })
    }
    
    // Créer un token de session unique
    const sessionToken = Buffer.from(
      `${correctPassword}-${Date.now()}-${Math.random()}`
    ).toString('base64')
    
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

