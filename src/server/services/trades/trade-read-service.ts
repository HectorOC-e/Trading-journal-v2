// ─────────────────────────────────────────────────────────────────────────────
// Trade read service (TD-018) — query orchestration moved out of the trades
// router: cursor-paginated list, rule-violation aggregates, emotion incentive
// (D10) and behavioral pattern insights (T-VI-002). Pure computations stay in
// domains/ (feedbackForEmotion, detectPatterns).
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { MinimalTrade } from "@/domains/analytics/services/dashboard-analytics"
import { feedbackForEmotion } from "@/domains/trading/services/emotion-feedback"
import { detectPatterns } from "@/domains/analytics/services/pattern-detector"
import { VIOLATION_TAGS } from "@/types"
import { serializeTrade } from "./serializers"

/**
 * Un trade por id. Necesario para el deep-link de las citas del Coach: `listTrades`
 * pagina de 50 con cursor, así que el trade citado puede no estar en la página
 * cargada y la selección local no lo encontraría nunca.
 */
export async function getTradeById(prisma: PrismaClient, userId: string, id: string) {
  const trade = await prisma.trade.findFirst({
    where:   { id, userId },
    include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
  })
  return trade ? serializeTrade(trade) : null
}

export async function listTrades(
  prisma: PrismaClient,
  userId: string,
  input?: { accountId?: string; setupId?: string; from?: string; to?: string; limit?: number; cursor?: string },
) {
  const limit = input?.limit ?? 50

  let cursorDate: Date | null = null
  if (input?.cursor) {
    const cursorTrade = await prisma.trade.findUnique({
      where: { id: input.cursor },
      select: { date: true },
    })
    cursorDate = cursorTrade?.date ?? null
  }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      ...(input?.accountId && { accountId: input.accountId }),
      ...(input?.setupId   && { setupId:   input.setupId }),
      ...((input?.from || input?.to) ? {
        date: {
          ...(input?.from && { gte: new Date(input.from) }),
          ...(input?.to   && { lte: new Date(input.to)   }),
        },
      } : {}),
      ...(input?.cursor && cursorDate ? {
        OR: [
          { date: { lt: cursorDate } },
          { date: cursorDate, id: { lt: input.cursor } },
        ],
      } : {}),
    },
    include: {
      account: true,
      setup:   true,
      events:  { orderBy: { timestamp: "asc" } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit + 1,
  })

  const hasMore   = trades.length > limit
  const items     = hasMore ? trades.slice(0, limit) : trades
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return { items: items.map(serializeTrade), nextCursor }
}

export async function getRuleViolationStats(
  prisma: PrismaClient,
  userId: string,
  input?: { from?: string; to?: string },
) {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      tags: { hasSome: [...VIOLATION_TAGS] },
      ...((input?.from || input?.to) ? {
        date: {
          ...(input?.from && { gte: new Date(input.from) }),
          ...(input?.to   && { lte: new Date(input.to)   }),
        },
      } : {}),
    },
    select: { tags: true, date: true },
  })

  const byTag = VIOLATION_TAGS.reduce((acc, tag) => ({
    ...acc,
    [tag]: trades.filter(t => (t.tags as string[]).includes(tag)).length,
  }), {} as Record<string, number>)

  const byMonthMap: Record<string, number> = {}
  for (const t of trades) {
    const monthKey = (t.date as Date).toISOString().slice(0, 7)
    byMonthMap[monthKey] = (byMonthMap[monthKey] ?? 0) + 1
  }
  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  return { total: trades.length, byTag, byMonth }
}

// Emotion incentive (DELTA D10): the trader's historical WR/avgR for a given
// pre-trade emotion, so capturing it returns value in the moment. Null below the
// minimum sample (handled in feedbackForEmotion) — no misleading small-n claim.
export async function getEmotionFeedback(prisma: PrismaClient, userId: string, emotion: string) {
  const rows = await prisma.trade.findMany({
    where:  { userId, status: "CLOSED", emotionBefore: emotion },
    select: { emotionBefore: true, pnl: true, rMultiple: true },
  })
  const mapped = rows.map((t) => ({
    emotionBefore: t.emotionBefore,
    pnl:           t.pnl != null ? Number(t.pnl) : 0,
    rMultiple:     t.rMultiple != null ? Number(t.rMultiple) : null,
  }))
  return feedbackForEmotion(mapped, emotion)
}

// T-VI-002: Behavioral pattern insights
export async function getPatternInsights(prisma: PrismaClient, userId: string) {
  const tradeRows = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: {
      id: true, accountId: true, symbol: true, direction: true,
      session: true, openTime: true, closeTime: true,
      pnl: true, rMultiple: true, tags: true, date: true,
      setupId: true, entry: true, stop: true, target: true, size: true,
    },
    orderBy: [{ date: "asc" }],
    take: 500,
  })
  const trades: MinimalTrade[] = tradeRows.map(t => ({
    id:        t.id,
    accountId: t.accountId,
    symbol:    t.symbol,
    direction: t.direction,
    session:   t.session as string | null,
    openTime:  t.openTime as string | null,
    closeTime: t.closeTime as string | null,
    pnl:       t.pnl        != null ? Number(t.pnl)        : 0,
    rMultiple: t.rMultiple  != null ? Number(t.rMultiple)  : null,
    tags:      t.tags        as string[],
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    entry:     Number(t.entry),
    stop:      Number(t.stop),
    target:    Number(t.target),
    size:      Number(t.size),
  }))
  return detectPatterns(trades)
}
