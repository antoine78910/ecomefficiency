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
 * GET /api/elevenlabs/credits
 * Proxies the ElevenLabs API to return the shared account's credit state.
 * Returns character_count, character_limit, next_character_count_reset_unix.
 * The xi-api-key is stored server-side (env ELEVENLABS_API_KEY).
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

    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        "[API] ElevenLabs /v1/user/subscription error",
        res.status,
        text
      );
      return withCors(
        NextResponse.json(
          {
            ok: false,
            error: "elevenlabs_api_error",
            status: res.status,
          },
          { status: 502 }
        ),
        req
      );
    }

    const data = await res.json();

    return withCors(
      NextResponse.json({
        ok: true,
        character_count: data.character_count ?? 0,
        character_limit: data.character_limit ?? 0,
        next_character_count_reset_unix:
          data.next_character_count_reset_unix ?? null,
        tier: data.tier ?? null,
        status: data.status ?? null,
      }),
      req
    );
  } catch (e: any) {
    console.warn(
      "[API] /api/elevenlabs/credits exception",
      e?.message || e
    );
    return withCors(
      NextResponse.json(
        { ok: false, error: e?.message || "error" },
        { status: 500 }
      ),
      req
    );
  }
}
