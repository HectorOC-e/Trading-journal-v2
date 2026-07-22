import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { streamAnalyticsInsights, type AnalyticsAiOptions } from "@/lib/ai/analytics-insights-service"
import { NoApiKeyError } from "@/lib/ai/resolve-provider"
import { logger } from "@/lib/logger"

// Streaming AI on a Node serverless function. Without a raised maxDuration the
// function is killed mid-stream (slow model + bundle build) → client "network error".
export const runtime = "nodejs"
export const maxDuration = 300

const PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  let period: AnalyticsAiOptions["period"] = "3M"
  try {
    const body = await req.json() as { period?: string }
    if (body.period && (PERIODS as readonly string[]).includes(body.period)) {
      period = body.period as AnalyticsAiOptions["period"]
    }
  } catch { /* default period */ }

  try {
    const readable = await streamAnalyticsInsights({ userId: user.id, prisma, period })
    return new NextResponse(readable, {
      headers: {
        "Content-Type":      "text/plain; charset=utf-8",
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    if (err instanceof NoApiKeyError) return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 })
    // El cliente sólo ve "STREAM_ERROR"; sin esta línea la causa se pierde.
    logger.error("analytics-ai stream failed", {
      period, message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 })
  }
}
