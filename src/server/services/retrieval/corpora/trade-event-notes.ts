// Adaptador del corpus de notas por evento (`trade_events.notes`).
//
// Captura lo que pasa DENTRO del trade —mover un stop, cerrar parcial, añadir—,
// que ni `trade_plans` (antes) ni `trade_notes` (después) recogen. La cita navega
// al trade padre: un evento no tiene pantalla propia.
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
  trade:     { symbol: string; direction: string } | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export const tradeEventNotesAdapter: CorpusAdapter<TradeEventRow> = {
  key:   "trade_events",
  label: "Notas dentro del trade",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trade_events
      WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM trade_events
      WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
      ORDER BY timestamp DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trade_events SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE notes <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL)::int AS embedded
      FROM trade_events WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<TradeEventRow[]> {
    return prisma.tradeEvent.findMany({
      where:  { id: { in: ids }, userId },
      select: {
        id: true, tradeId: true, type: true, price: true, contracts: true,
        notes: true, timestamp: true,
        trade: { select: { symbol: true, direction: true } },
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
      href:       `/trades?trade=${row.tradeId}`,
    }
  },
}
