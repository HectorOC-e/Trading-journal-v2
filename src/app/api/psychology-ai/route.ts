import { NextRequest, NextResponse } from "next/server"
import { operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { streamPsychologyInsights, type PsychologyAiOptions } from "@/lib/ai/psychology-insights-service"
import { NoApiKeyError } from "@/lib/ai/resolve-provider"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const maxDuration = 300

const PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  let mode: OperationalMode = "REAL"
  let period: PsychologyAiOptions["period"] = "3M"
  try {
    const body = await req.json() as { period?: string; mode?: unknown; includePractice?: unknown }
    mode = operationalModeSchema.parse(body.mode === undefined ? "REAL" : body.mode)
    if (body.includePractice === true) throw new Error("mixed scope unsupported")
    if (body.period && (PERIODS as readonly string[]).includes(body.period)) {
      period = body.period as PsychologyAiOptions["period"]
    }
  } catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }) }

  try {
    const readable = await streamPsychologyInsights({ userId: user.id, prisma, period, mode })
    return new NextResponse(readable, {
      headers: { "X-Operational-Mode": mode,
        "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
    })
  } catch (err) {
    if (err instanceof NoApiKeyError) return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 })
    // El cliente sólo ve "STREAM_ERROR". Sin esta línea la causa se pierde: un
    // 500 aquí no dejaba rastro alguno en los logs y sólo podía diagnosticarse
    // sondeando el endpoint a mano.
    logger.error("psychology-ai stream failed", {
      period, message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 })
  }
}
