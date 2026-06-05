import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { streamPsychologyInsights, type PsychologyAiOptions } from "@/lib/ai/psychology-insights-service"
import { NoApiKeyError } from "@/lib/ai/resolve-provider"

const PERIODS = ["7d", "1M", "3M", "6M", "1Y", "ALL"] as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })

  let period: PsychologyAiOptions["period"] = "3M"
  try {
    const body = await req.json() as { period?: string }
    if (body.period && (PERIODS as readonly string[]).includes(body.period)) {
      period = body.period as PsychologyAiOptions["period"]
    }
  } catch { /* default */ }

  try {
    const readable = await streamPsychologyInsights({ userId: user.id, prisma, period })
    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
    })
  } catch (err) {
    if (err instanceof NoApiKeyError) return NextResponse.json({ error: "NO_API_KEY" }, { status: 503 })
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 })
  }
}
