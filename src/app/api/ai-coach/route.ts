import { NextRequest, NextResponse } from "next/server"
import { operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { streamCoachReply, type MessageParam } from "@/lib/ai/coach-service"
import { NoApiKeyError } from "@/lib/ai/resolve-provider"
import { logger } from "@/lib/logger"
import { assembleCoachContext } from "@/server/services/coach/coach-memory-service"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let mode: OperationalMode = "REAL"
  let messages: MessageParam[]
  try {
    const body = await req.json() as { messages?: MessageParam[]; mode?: unknown; includePractice?: unknown }
    mode = operationalModeSchema.parse(body.mode === undefined ? "REAL" : body.mode)
    if (body.includePractice === true) throw new Error("mixed scope unsupported")
    messages = body.messages ?? []
    if (!Array.isArray(messages)) throw new Error("invalid messages")
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
  }

  // ── Stream via coach service ────────────────────────────────────────────────
  try {
    // S6: confirmed memory + active commitments injected so the coach "recuerda"
    // (best-effort — a memory failure must never break the chat).
    const memoryBlock = await assembleCoachContext(prisma, user.id, mode).catch(() => "")
    const readable = await streamCoachReply({ userId: user.id, messages, prisma, memoryBlock, mode })

    return new NextResponse(readable, {
      headers: {
        "X-Operational-Mode": mode,
        "Content-Type":      "text/plain; charset=utf-8",
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    // No usable key (neither persisted nor env) for the user's configured provider.
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 })
    }
    // El cliente sólo ve "STREAM_ERROR"; sin esta línea la causa se pierde.
    logger.error("ai-coach stream failed", {
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 })
  }
}
