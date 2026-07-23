// Adaptador del corpus de planes PRE-trade (`trades.plan_notes`).
//
// Separado de `trade_notes` a propósito: "qué me dije que iba a hacer" y "qué
// escribí después" responden preguntas distintas, y mezclarlas en un solo vector
// perdería justo el contraste entre intención y resultado.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface TradePlanRow {
  id:        string
  date:      Date
  symbol:    string
  direction: string
  pnl:       unknown          // Prisma Decimal | null
  rMultiple: unknown          // Prisma Decimal | null
  planNotes: string | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export const tradePlansAdapter: CorpusAdapter<TradePlanRow> = {
  key:   "trade_plans",
  label: "Planes pre-trade",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (plan_notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trades
      WHERE user_id = ${userId}::uuid AND plan_notes_embedding IS NOT NULL
      ORDER BY plan_notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, plan_notes AS text FROM trades
      WHERE user_id = ${userId}::uuid AND plan_notes <> '' AND plan_notes IS NOT NULL
        AND plan_notes_embedding IS NULL
      ORDER BY date DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trades SET plan_notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE plan_notes <> '' AND plan_notes IS NOT NULL)::int AS "withText",
             COUNT(*) FILTER (WHERE plan_notes_embedding IS NOT NULL)::int AS embedded
      FROM trades WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<TradePlanRow[]> {
    return prisma.trade.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, date: true, symbol: true, direction: true, pnl: true, rMultiple: true, planNotes: true },
    }) as unknown as Promise<TradePlanRow[]>
  },

  rowId: (row: TradePlanRow) => row.id,

  toCitation(row: TradePlanRow, similarity: number): Citation {
    const pnl = num(row.pnl)
    const r   = num(row.rMultiple)
    const parts: string[] = []
    if (r !== null)   parts.push(`${r >= 0 ? "+" : ""}${r.toFixed(1)}R`)
    if (pnl !== null) parts.push(`${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toLocaleString("es")}`)
    return {
      corpus:     "trade_plans",
      id:         row.id,
      // "plan" en la etiqueta para que el trader distinga de un vistazo esta cita
      // de la del mismo trade en trade_notes.
      label:      `${row.symbol} · ${row.direction} · plan`,
      sublabel:   new Date(row.date).toISOString().slice(0, 10),
      outcome:    parts.join(" · "),
      positive:   pnl === null ? null : pnl >= 0,
      snippet:    truncate(row.planNotes ?? ""),
      similarity,
      href:       `/trades?trade=${row.id}`,
    }
  },
}
