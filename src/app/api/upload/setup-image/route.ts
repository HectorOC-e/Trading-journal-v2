// POST /api/upload/setup-image — validates and proxies image uploads to Supabase Storage.
// Enforces MIME type allowlist and 5 MB size limit server-side before touching storage.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, reason: "INVALID_FORM" }, { status: 400 })

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "MISSING_FILE" }, { status: 400 })
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, reason: "INVALID_MIME" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "FILE_TOO_LARGE" }, { status: 400 })
  }

  const ext  = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png"
  const path = `setups/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from("setup-images")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ ok: false, reason: "UPLOAD_FAILED" }, { status: 500 })

  const { data } = supabase.storage.from("setup-images").getPublicUrl(path)
  return NextResponse.json({ ok: true, url: data.publicUrl })
}
