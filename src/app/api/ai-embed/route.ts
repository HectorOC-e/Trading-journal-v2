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

import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import { embedText } from "@/lib/ai/embeddings"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { logger } from "@/lib/logger"

const MAX_BODY_BYTES = 16_384 // 16 KB — ample for any trade payload

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

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
  // Reject oversized payloads before any parsing
  const contentLength = req.headers.get("content-length")
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 })
  }

  // Auth: webhook path (x-webhook-secret present) or direct session path
  let userId: string | null = null
  const receivedSecret = req.headers.get("x-webhook-secret")

  if (receivedSecret !== null) {
    // Webhook path: secret must be configured and must match (constant-time compare)
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.warn("ai-embed: webhook secret not configured")
      return NextResponse.json({ ok: false, reason: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 })
    }
    if (!secretsMatch(receivedSecret, webhookSecret)) {
      logger.warn("ai-embed: invalid webhook secret")
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    logger.info("ai-embed: webhook auth accepted")
  } else {
    // Direct call path: require authenticated session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })
    userId = user.id
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

  // On direct path, enforce ownership (IDOR guard). Webhook path uses secret auth — no userId filter.
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, ...(userId ? { userId } : {}) },
    select: { notes: true, userId: true },
  })
  if (!trade) return NextResponse.json({ ok: false }, { status: 404 })

  const notes = trade.notes?.trim()
  if (!notes) return NextResponse.json({ ok: true, skipped: true })

  // Route through the trade owner's configured embeddings provider + key
  // (persisted user key first, then env fallback).
  const emb = await resolveEmbeddingCall(prisma, trade.userId)
  if (emb.source === "none") {
    return NextResponse.json({ ok: false, reason: "NO_EMBEDDING_KEY" })
  }
  const vector = await embedText(notes, { model: emb.model, apiKey: emb.apiKey })
  if (!vector) {
    logger.warn("ai-embed: embedding failed", { tradeId })
    return NextResponse.json({ ok: false, reason: "EMBED_FAILED" })
  }

  // Store via raw SQL since Prisma doesn't support vector type natively.
  // On direct path, include user_id in WHERE to prevent cross-user writes.
  const vectorStr = `[${vector.join(",")}]`
  if (userId) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE trades
        SET notes_embedding = ${vectorStr}::vector
        WHERE id = ${tradeId}::uuid AND user_id = ${userId}::uuid
      `,
    )
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE trades
        SET notes_embedding = ${vectorStr}::vector
        WHERE id = ${tradeId}::uuid
      `,
    )
  }

  return NextResponse.json({ ok: true })
}
