// POST /api/ai-embed — embeds trade notes and stores the vector in the DB.
//
// Accepts two payload formats:
//   1. Direct: { tradeId: string }  — called from scheduleEmbedding() in trades router
//   2. Supabase webhook: { type: "INSERT", record: { id: string } }
//      Requires X-Webhook-Secret header matching SUPABASE_WEBHOOK_SECRET env var.
//
// Non-blocking: failures are logged but do not break trade creation.
// Setup: configure a Supabase Database Webhook on the trades table INSERT event
// pointing at POST /api/ai-embed with the shared secret header.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import { embedText } from "@/lib/ai/embeddings"
import { isEmbeddingAvailable } from "@/lib/ai/config"
import { logger } from "@/lib/logger"

function extractTradeId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>

  // Format 1: direct call
  if (typeof b.tradeId === "string") return b.tradeId

  // Format 2: Supabase webhook — { type: "INSERT", record: { id: string } }
  if (b.type === "INSERT" && b.record && typeof (b.record as Record<string, unknown>).id === "string") {
    return (b.record as Record<string, unknown>).id as string
  }

  return null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Webhook secret validation (only required when the header is present)
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
  const receivedSecret = req.headers.get("x-webhook-secret")
  if (receivedSecret !== null) {
    // Header provided → must match (rejects tampered webhook calls)
    if (!webhookSecret || receivedSecret !== webhookSecret) {
      logger.warn("ai-embed: invalid webhook secret")
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    // Webhook path: no Supabase auth check (the secret IS the auth)
  } else {
    // Direct call path: require authenticated session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  }

  if (!isEmbeddingAvailable()) {
    return NextResponse.json({ ok: false, reason: "NO_EMBEDDING_KEY" })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const tradeId = extractTradeId(body)
  if (!tradeId) {
    return NextResponse.json({ ok: false, reason: "MISSING_TRADE_ID" }, { status: 400 })
  }

  // Fetch trade (no userId filter on webhook path — the webhook secret acts as auth)
  const trade = await prisma.trade.findUnique({
    where:  { id: tradeId },
    select: { notes: true },
  })
  if (!trade) return NextResponse.json({ ok: false }, { status: 404 })

  const notes = trade.notes?.trim()
  if (!notes) return NextResponse.json({ ok: true, skipped: true })

  const vector = await embedText(notes)
  if (!vector) {
    logger.warn("ai-embed: embedding failed", { tradeId })
    return NextResponse.json({ ok: false, reason: "EMBED_FAILED" })
  }

  // Store via raw SQL since Prisma doesn't support vector type natively.
  const vectorStr = `[${vector.join(",")}]`
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE trades
      SET notes_embedding = ${vectorStr}::vector
      WHERE id = ${tradeId}::uuid
    `,
  )

  return NextResponse.json({ ok: true })
}
