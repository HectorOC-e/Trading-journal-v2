// Adaptador del corpus de notas por evento (`trade_events.notes`).
//
// Captura lo que pasa DENTRO del trade —mover un stop, cerrar parcial, añadir—,
// que ni `trade_plans` (antes) ni `trade_notes` (después) recogen. La cita navega
// al trade padre: un evento no tiene pantalla propia.
import { OPERATIONAL_MODES, accountTypesForMode, type OperationalMode } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

const EVENT_LABEL: Record<string, string> = {
  STOP_MOVE:     "movió el stop",
  PARTIAL_CLOSE: "cierre parcial",
  SCALE_IN:      "añadió posición",
  NOTE:          "nota",
}

export interface TradeEventRow {
  id:        string
  tradeId:   string
  type:      string
  price:     unknown          // Prisma Decimal | null
  contracts: unknown          // Prisma Decimal | null
  notes:     string | null
  timestamp: Date
  trade: { symbol: string; direction: string; operationalMode: OperationalMode; accountId: string; account: { name: string; type: string; currency: string } } | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export const tradeEventNotesAdapter: CorpusAdapter<TradeEventRow> = {
  key:   "trade_events",
  label: "Notas dentro del trade",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number, mode: OperationalMode = "REAL"): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trade_events
      WHERE user_id = ${userId}::uuid AND trade_id IN (
        SELECT id FROM trades WHERE user_id = ${userId}::uuid AND operational_mode = ${mode}
          AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${accountTypesForMode(mode)}::text[]))) AND notes_embedding IS NOT NULL AND BTRIM(notes) <> ''
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number, mode?: OperationalMode): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM trade_events
      WHERE user_id = ${userId}::uuid AND trade_id IN (
        SELECT id FROM trades WHERE user_id = ${userId}::uuid AND operational_mode = ANY(${mode ? [mode] : [...OPERATIONAL_MODES]}::text[])
          AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${mode ? accountTypesForMode(mode) : OPERATIONAL_MODES.flatMap(accountTypesForMode)}::text[]))) AND BTRIM(notes) <> '' AND notes_embedding IS NULL
      ORDER BY timestamp DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string, sourceText: string, userId: string): Promise<number> {
    return prisma.$executeRaw`
      UPDATE trade_events SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
        AND notes = ${sourceText}`
  },

  async counts(prisma: PrismaClient, userId: string, mode?: OperationalMode): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE BTRIM(notes) <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL AND BTRIM(notes) <> '')::int AS embedded
      FROM trade_events WHERE user_id = ${userId}::uuid AND trade_id IN (
        SELECT id FROM trades WHERE user_id = ${userId}::uuid AND operational_mode = ANY(${mode ? [mode] : [...OPERATIONAL_MODES]}::text[])
          AND account_id IN (SELECT id FROM accounts WHERE user_id = ${userId}::uuid AND type = ANY(${mode ? accountTypesForMode(mode) : OPERATIONAL_MODES.flatMap(accountTypesForMode)}::text[])))`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[], mode: OperationalMode = "REAL"): Promise<TradeEventRow[]> {
    return prisma.tradeEvent.findMany({
      where: { id: { in: ids }, userId, trade: await scopedTradeWhere(prisma, userId, { mode, includeArchived: true }) },
      select: {
        id: true, tradeId: true, type: true, price: true, contracts: true,
        notes: true, timestamp: true,
        trade: { select: { symbol: true, direction: true, operationalMode: true, accountId: true, account: { select: { name: true, type: true, currency: true } } } },
      },
    }) as unknown as Promise<TradeEventRow[]>
  },

  rowId: (row: TradeEventRow) => row.id,

  toCitation(row: TradeEventRow, similarity: number): Citation {
    const price     = num(row.price)
    const contracts = num(row.contracts)
    const detalle: string[] = []
    if (contracts !== null) detalle.push(`${contracts}`)
    if (price !== null)     detalle.push(`@ ${price}`)
    const symbol = row.trade?.symbol ?? "—"
    return {
      operationalMode: row.trade?.operationalMode,
      accountId: row.trade?.accountId, accountName: row.trade?.account.name, accountType: row.trade?.account.type, currency: row.trade?.account.currency,
      corpus:     "trade_events",
      id:         row.id,
      label:      `${symbol} · ${EVENT_LABEL[row.type] ?? row.type}`,
      sublabel:   new Date(row.timestamp).toISOString().slice(0, 10),
      outcome:    detalle.join(" "),
      // Un evento no es ganancia ni pérdida por sí mismo: neutro a propósito.
      positive:   null,
      snippet:    truncate(row.notes ?? ""),
      similarity,
      // Navega al trade padre; el evento no tiene pantalla propia.
      href:       `/trades?trade=${row.tradeId}&mode=${row.trade?.operationalMode}`,
    }
  },
}
