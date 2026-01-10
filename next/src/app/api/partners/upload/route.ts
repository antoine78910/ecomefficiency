import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const runtime = "nodejs";

function safeName(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "supabase_admin_missing" }, { status: 500 });

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "").trim(); // 'logo' | 'favicon'
    const slug = String(form.get("slug") || "").trim().toLowerCase();

    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
    if (!kind) return NextResponse.json({ ok: false, error: "missing_kind" }, { status: 400 });
    if (!slug) return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });

    // 10MB max as requested
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });

    const contentType = file.type || "application/octet-stream";
    const ext = (() => {
      const n = (file.name || "").toLowerCase();
      const m = n.match(/\.([a-z0-9]+)$/);
      return m ? m[1] : (contentType.includes("png") ? "png" : contentType.includes("svg") ? "svg" : "bin");
    })();

    const filename = safeName(file.name || `${kind}.${ext}`) || `${kind}.${ext}`;
    const path = `partners/${slug}/${kind}-${Date.now()}-${filename}`;

    const bucket = "partners-assets";

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "upload_failed",
          detail: error.message,
          hint: "Ensure Supabase Storage bucket 'partners-assets' exists and is configured.",
        },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ ok: true, path, publicUrl: data.publicUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "upload_exception", detail: e?.message || String(e) }, { status: 500 });
  }
}


