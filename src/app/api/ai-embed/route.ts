// POST /api/ai-embed — embeds trade notes and stores the vector in the DB.
// Called server-side from trades.create / trades.update when notes change.
// Non-blocking: failures are silent (embedding is best-effort).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import { embedText } from "@/lib/ai/embeddings"
import { isEmbeddingAvailable } from "@/lib/ai/config"

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  if (!isEmbeddingAvailable()) {
    return NextResponse.json({ ok: false, reason: "NO_EMBEDDING_KEY" })
  }

  let tradeId: string
  try {
    const body = await req.json() as { tradeId?: string }
    if (!body.tradeId) throw new Error("missing tradeId")
    tradeId = body.tradeId
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Fetch trade (must belong to user)
  const trade = await prisma.trade.findUnique({
    where:  { id: tradeId, userId: user.id },
    select: { notes: true },
  })
  if (!trade) return NextResponse.json({ ok: false }, { status: 404 })

  const notes = trade.notes?.trim()
  if (!notes) return NextResponse.json({ ok: true, skipped: true })

  const vector = await embedText(notes)
  if (!vector) return NextResponse.json({ ok: false, reason: "EMBED_FAILED" })

  // Store via raw SQL since Prisma doesn't support vector type natively.
  // Prisma.sql ensures parameterized binding; the vector string is user-data-derived
  // and must be kept as a typed parameter, not interpolated into the query string.
  const vectorStr = `[${vector.join(",")}]`
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE trades
      SET notes_embedding = ${vectorStr}::vector
      WHERE id = ${tradeId}::uuid
        AND user_id = ${user.id}::uuid
    `,
  )

  return NextResponse.json({ ok: true })
}
