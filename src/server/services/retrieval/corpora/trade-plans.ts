// Adaptador del corpus de planes PRE-trade (`trades.plan_notes`).
//
// Separado de `trade_notes` a propósito: "qué me dije que iba a hacer" y "qué
// escribí después" responden preguntas distintas, y mezclarlas en un solo vector
// perdería justo el contraste entre intención y resultado.
import { OPERATIONAL_MODES, accountTypesForMode, type OperationalMode } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface TradePlanRow {
  id:        string
  operationalMode: OperationalMode
  accountId: string
  account: { name: string; type: string; currency: string }
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

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number, mode: OperationalMode = "REAL"): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (plan_notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trades
      WHERE user_id = ${userId}::uuid AND operational_mode = ${mode}
        AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${accountTypesForMode(mode)}::text[])) AND plan_notes_embedding IS NOT NULL AND BTRIM(plan_notes) <> ''
      ORDER BY plan_notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number, mode?: OperationalMode): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, plan_notes AS text FROM trades
      WHERE user_id = ${userId}::uuid AND operational_mode = ANY(${mode ? [mode] : [...OPERATIONAL_MODES]}::text[])
        AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${mode ? accountTypesForMode(mode) : OPERATIONAL_MODES.flatMap(accountTypesForMode)}::text[])) AND BTRIM(plan_notes) <> '' AND plan_notes IS NOT NULL
        AND plan_notes_embedding IS NULL
      ORDER BY date DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string, sourceText: string, userId: string): Promise<number> {
    return prisma.$executeRaw`
      UPDATE trades SET plan_notes_embedding = ${vec}::vector WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
        AND plan_notes = ${sourceText}`
  },

  async counts(prisma: PrismaClient, userId: string, mode?: OperationalMode): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE BTRIM(plan_notes) <> '' AND plan_notes IS NOT NULL)::int AS "withText",
             COUNT(*) FILTER (WHERE plan_notes_embedding IS NOT NULL AND BTRIM(plan_notes) <> '')::int AS embedded
      FROM trades WHERE user_id = ${userId}::uuid AND operational_mode = ANY(${mode ? [mode] : [...OPERATIONAL_MODES]}::text[])
        AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${mode ? accountTypesForMode(mode) : OPERATIONAL_MODES.flatMap(accountTypesForMode)}::text[]))`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[], mode: OperationalMode = "REAL"): Promise<TradePlanRow[]> {
    return prisma.trade.findMany({
      where: { ...await scopedTradeWhere(prisma, userId, { mode, includeArchived: true }), id: { in: ids } },
      select: { id: true, operationalMode: true, accountId: true, account: { select: { name: true, type: true, currency: true } }, date: true, symbol: true, direction: true, pnl: true, rMultiple: true, planNotes: true },
    }) as unknown as Promise<TradePlanRow[]>
  },

  rowId: (row: TradePlanRow) => row.id,

  toCitation(row: TradePlanRow, similarity: number): Citation {
    const pnl = num(row.pnl)
    const r   = num(row.rMultiple)
    const parts: string[] = []
    if (r !== null)   parts.push(`${r >= 0 ? "+" : ""}${r.toFixed(1)}R`)
    if (pnl !== null) parts.push(`${pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toLocaleString("es")} ${row.account?.currency ?? "divisa desconocida"}`)
    return {
      operationalMode: row.operationalMode,
      accountId: row.accountId, accountName: row.account?.name, accountType: row.account?.type, currency: row.account?.currency,
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
      href:       `/trades?trade=${row.id}&mode=${row.operationalMode}`,
    }
  },
}
