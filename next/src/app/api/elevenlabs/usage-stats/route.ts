import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://elevenlabs.io",
  "https://www.elevenlabs.io",
  "https://app.elevenlabs.io",
];

function withCors(res: NextResponse, req?: Request) {
  try {
    const origin = req?.headers?.get("Origin") || "";
    const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  } catch {}
  return res;
}

export async function OPTIONS(req: Request) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

/**
 * GET /api/elevenlabs/usage-stats?start_unix=...&end_unix=...
 * Proxies the ElevenLabs character usage stats endpoint.
 * Returns breakdown of characters used in the given time range.
 */
export async function GET(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return withCors(
        NextResponse.json(
          { ok: false, error: "elevenlabs_api_key_not_configured" },
          { status: 500 }
        ),
        req
      );
    }

    const url = new URL(req.url);
    const startUnix = url.searchParams.get("start_unix");
    const endUnix = url.searchParams.get("end_unix");

    if (!startUnix || !endUnix) {
      return withCors(
        NextResponse.json(
          { ok: false, error: "start_unix and end_unix query params required" },
          { status: 400 }
        ),
        req
      );
    }

    const elUrl = `https://api.elevenlabs.io/v1/usage/character-stats?start_unix=${encodeURIComponent(startUnix)}&end_unix=${encodeURIComponent(endUnix)}`;

    const res = await fetch(elUrl, {
      method: "GET",
      headers: { "xi-api-key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[API] ElevenLabs /v1/usage/character-stats error", res.status, text);
      return withCors(
        NextResponse.json(
          { ok: false, error: "elevenlabs_api_error", status: res.status },
          { status: 502 }
        ),
        req
      );
    }

    const data = await res.json();

    return withCors(NextResponse.json({ ok: true, ...data }), req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[API] /api/elevenlabs/usage-stats exception", msg);
    return withCors(
      NextResponse.json({ ok: false, error: msg }, { status: 500 }),
      req
    );
  }
}
