// Adaptador del corpus de notas de trades. Sólo consultas LITERALES y forma:
// ninguna decisión vive aquí (spec §3).
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface TradeRow {
  id:        string
  date:      Date
  symbol:    string
  direction: string
  pnl:       unknown          // Prisma Decimal | null
  rMultiple: unknown          // Prisma Decimal | null
  notes:     string | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export const tradeNotesAdapter: CorpusAdapter<TradeRow> = {
  key:   "trade_notes",
  label: "Notas de trades",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trades
      WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM trades
      WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
      ORDER BY date DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trades SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE notes <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL)::int AS embedded
      FROM trades WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<TradeRow[]> {
    return prisma.trade.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, date: true, symbol: true, direction: true, pnl: true, rMultiple: true, notes: true },
    }) as unknown as Promise<TradeRow[]>
  },

  rowId: (row: TradeRow) => row.id,

  toCitation(row: TradeRow, similarity: number): Citation {
    const pnl = num(row.pnl)
    const r   = num(row.rMultiple)
    const parts: string[] = []
    if (r !== null)   parts.push(`${r >= 0 ? "+" : ""}${r.toFixed(1)}R`)
    if (pnl !== null) parts.push(`${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toLocaleString("es")}`)
    return {
      corpus:     "trade_notes",
      id:         row.id,
      label:      `${row.symbol} · ${row.direction}`,
      sublabel:   new Date(row.date).toISOString().slice(0, 10),
      outcome:    parts.join(" · "),
      positive:   pnl === null ? null : pnl >= 0,
      snippet:    truncate(row.notes ?? ""),
      similarity,
      href:       `/trades?trade=${row.id}`,
    }
  },
}
