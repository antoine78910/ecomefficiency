import { NextRequest, NextResponse } from 'next/server';
import { trackBrevoEvent } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, event, data } = body;

    if (!email || !event) {
      return NextResponse.json({ error: 'Missing email or event' }, { status: 400 });
    }

    await trackBrevoEvent({
      email,
      eventName: event,
      eventProps: data,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API] Brevo track error:', e);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

