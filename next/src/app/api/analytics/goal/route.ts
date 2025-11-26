import { NextRequest, NextResponse } from 'next/server'

// Run on Edge to avoid Serverless Function invocations (cheaper, lower latency)
export const runtime = 'edge';
export const preferredRegion = 'iad1'; // optional hint

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { name?: string; metadata?: Record<string,string> };
    const name = (body.name || '').toLowerCase();
    if (!name || !/^[a-z0-9_-]{1,32}$/.test(name)) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 200 });
    }

    const datafastVisitorId = req.cookies.get('datafast_visitor_id')?.value;
    
    // ON ACCEPTE si visitor_id est là OU si on a des infos d'identification dans metadata
    const metaAny = (body.metadata || {}) as any;
    const hasIdentity = metaAny.email || metaAny.user_id;

    if (!datafastVisitorId && !hasIdentity) {
      // Si on n'a NI cookie NI identité, on ne peut rien faire
      return NextResponse.json({ error: 'no_visitor_id_or_identity' }, { status: 200 });
    }

    const apiKey = process.env.DATAFAST_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'missing_datafast_key' }, { status: 200 });
    }

    const payload: any = {
      name,
    };

    // Ajout conditionnel des identifiants
    if (datafastVisitorId) {
        payload.datafast_visitor_id = datafastVisitorId;
    } else if (hasIdentity) {
        // Si pas de cookie, on envoie l'identité pour que DataFast fasse le lien
        // NOTE: Vérifie la doc exacte pour les champs, mais souvent c'est user_id ou identity
        if (metaAny.user_id) payload.user_id = metaAny.user_id;
        if (metaAny.email) payload.email = metaAny.email;
    }
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
      return NextResponse.json({ error: 'datafast_error', status: resp.status, detail: json }, { status: 200 });
    }
    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'unknown' }, { status: 200 });
  }
}


