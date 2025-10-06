import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Check if user already has an A/B test variant assigned
    let variant = cookieStore.get('checkout_variant')?.value;
    
    if (!variant || (variant !== 'stripe' && variant !== 'custom')) {
      // Assign random variant (50/50 split)
      variant = Math.random() < 0.5 ? 'stripe' : 'custom';
      
      // Set cookie for 30 days to keep user in same variant
      const response = NextResponse.json({ variant });
      response.cookies.set('checkout_variant', variant, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax',
      });
      
      return response;
    }
    
    return NextResponse.json({ variant });
  } catch (e) {
    // Default to custom on error
    return NextResponse.json({ variant: 'custom' });
  }
}

// Allow forcing a specific variant via query param for testing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const variant = body.variant === 'stripe' ? 'stripe' : 'custom';
    
    const response = NextResponse.json({ variant });
    response.cookies.set('checkout_variant', variant, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  } catch (e) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}

