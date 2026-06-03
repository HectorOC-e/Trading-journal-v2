import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { isAnyKeyConfigured } from "@/lib/ai/config"
import { streamCoachReply, type MessageParam } from "@/lib/ai/coach-service"

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // ── API key check ───────────────────────────────────────────────────────────
  if (!isAnyKeyConfigured()) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let messages: MessageParam[]
  try {
    const body = await req.json() as { messages?: MessageParam[] }
    messages = body.messages ?? []
    if (!Array.isArray(messages)) throw new Error("invalid messages")
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
  }

  // ── Stream via coach service ────────────────────────────────────────────────
  try {
    const readable = await streamCoachReply({ userId: user.id, messages, prisma })

    return new NextResponse(readable, {
      headers: {
        "Content-Type":      "text/plain; charset=utf-8",
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  } catch {
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 })
  }
}
