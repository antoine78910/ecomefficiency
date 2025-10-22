import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ 
        authenticated: false 
      }, { status: 401 })
    }
    
    // Vérifier que le cookie est valide (contient le mot de passe encodé)
    const correctPassword = process.env.ADMIN_PASSWORD || ''
    if (!correctPassword) {
      return NextResponse.json({ 
        authenticated: false 
      }, { status: 500 })
    }
    
    // Vérifier que le token contient le bon mot de passe
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString()
      if (!decoded.startsWith(correctPassword + '-')) {
        return NextResponse.json({ 
          authenticated: false 
        }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ 
        authenticated: false 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      authenticated: true 
    })
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false 
    }, { status: 500 })
  }
}

