// ─────────────────────────────────────────────────────────────────────────────
// Edge service (S11) — prisma orchestration over the pure instrument/tag edge
// analytics (#24/#20). Reads the user's closed trades and computes per-symbol and
// per-tag edge with significance. Read-only; the surfaces (ANALIZAR) land in S12.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { computeInstrumentEdges, type InstrumentEdgeResult } from "@/domains/analytics/instrument/instrument-edge"
import { computeTagEdges, type TagEdgeResult } from "@/domains/analytics/tags/tag-edge"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))

export async function getInstrumentEdges(prisma: PrismaClient, userId: string): Promise<InstrumentEdgeResult> {
  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: { symbol: true, rMultiple: true, pnl: true },
  })
  return computeInstrumentEdges(
    trades.map((t) => ({ symbol: t.symbol, rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 })),
  )
}

export async function getTagEdges(prisma: PrismaClient, userId: string): Promise<TagEdgeResult> {
  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: { tags: true, rMultiple: true, pnl: true },
  })
  return computeTagEdges(
    trades.map((t) => ({ tags: t.tags, rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 })),
  )
}
