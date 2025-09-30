import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { name?: string; metadata?: Record<string,string> };
    const name = (body.name || '').toLowerCase();
    if (!name || !/^[a-z0-9_-]{1,32}$/.test(name)) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }

    const datafastVisitorId = req.cookies.get('datafast_visitor_id')?.value;
    if (!datafastVisitorId) {
      return NextResponse.json({ error: 'no_visitor_id' }, { status: 400 });
    }

    const apiKey = process.env.DATAFAST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'missing_datafast_key' }, { status: 500 });
    }

    const payload: any = {
      datafast_visitor_id: datafastVisitorId,
      name,
    };
    if (body.metadata && typeof body.metadata === 'object') {
      const meta: Record<string,string> = {};
      const entries = Object.entries(body.metadata).slice(0, 10);
      for (const [k,v] of entries) {
        const key = k.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0,32);
        const val = String(v).slice(0,255);
        if (key) meta[key] = val;
      }
      if (Object.keys(meta).length) payload.metadata = meta;
    }

    const resp = await fetch('https://datafa.st/api/v1/goals', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json({ error: 'datafast_error', status: resp.status, detail: json }, { status: 502 });
    }
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'unknown' }, { status: 500 });
  }
}


