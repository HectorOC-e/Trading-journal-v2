import type { PrismaClient } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate, calcSharpeRatio } from "@/lib/formulas"
import { VIOLATION_TAGS } from "@/types"
import { detectPatterns } from "./services/pattern-detector"
import type { DetectedPattern } from "./services/pattern-detector"
import type { MinimalTrade } from "./services/dashboard-analytics"

export type TraderContext = {
  performance: {
    totalTrades: number
    winRate: number
    avgR: number
    netPnl: number
    pnlMonth: number
    sharpeRatio: number | null
    bestSetup: { name: string; winRate: number; trades: number } | null
    worstSetup: { name: string; winRate: number; trades: number } | null
  }
  behavior: {
    violationCount: number
    violationsByTag: Record<string, number>
    costoIndisciplina: number
    rachaDiasLimpios: number
    offPlanPct: number
  }
  learning: {
    pendingReviews: number
    reviewsDoneThisMonth: number
    masteredResources: number
  }
  recentTrades: {
    id: string
    date: string
    symbol: string
    direction: string
    pnl: number
    rMultiple: number | null
    tags: string[]
    session: string | null
  }[]
  patterns: DetectedPattern[]
}

// ── Explicit raw row types (avoid Prisma any-cascade in worktree) ─────────────

type RawTradeRow = {
  id: string
  accountId: string
  symbol: string
  direction: string
  session: unknown
  openTime: unknown
  closeTime: unknown
  pnl: unknown
  rMultiple: unknown
  tags: unknown
  date: unknown
  setupId: string | null
  entry: unknown
  stop: unknown
  target: unknown
  size: unknown
}

type RawViolationRow = {
  tags: unknown
  pnl: unknown
  date: unknown
}

type RawLearningRow = {
  status: string
}

type RawReviewRow = {
  id: string
  status: string
}

type RawSetupRow = {
  id: string
  name: string
}

export async function buildTraderContext(
  userId: string,
  prisma: PrismaClient,
  window?: { from: Date; to: Date },
): Promise<TraderContext> {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const dateFilter = window
    ? { gte: window.from, lte: window.to }
    : undefined

  // ── 5 parallel sub-fetches ────────────────────────────────────────────────
  const [tradeRows, violationRows, learningRows, reviewRows, setupRows] = await Promise.all([
    // 1. Closed trades for performance & patterns
    prisma.trade.findMany({
      where: {
        userId,
        status: "CLOSED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true, accountId: true, symbol: true, direction: true,
        session: true, openTime: true, closeTime: true,
        pnl: true, rMultiple: true, tags: true, date: true,
        setupId: true, entry: true, stop: true, target: true, size: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 500,
    }) as Promise<RawTradeRow[]>,

    // 2. Violation trades
    prisma.trade.findMany({
      where: {
        userId,
        status: "CLOSED",
        tags: { hasSome: [...VIOLATION_TAGS] },
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: { tags: true, pnl: true, date: true },
    }) as Promise<RawViolationRow[]>,

    // 3. Learning resources
    prisma.learningResource.findMany({
      where: { userId },
      select: { status: true },
    }) as Promise<RawLearningRow[]>,

    // 4. Weekly reviews this month
    prisma.weeklyReview.findMany({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
      select: { id: true, status: true },
    }) as Promise<RawReviewRow[]>,

    // 5. Setup metadata for best/worst setup
    prisma.setup.findMany({
      where: { userId },
      select: { id: true, name: true },
    }) as Promise<RawSetupRow[]>,
  ]) as [RawTradeRow[], RawViolationRow[], RawLearningRow[], RawReviewRow[], RawSetupRow[]]

  // ── Normalize trades to MinimalTrade ──────────────────────────────────────
  const trades: MinimalTrade[] = tradeRows.map((t: RawTradeRow) => ({
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

  // ── Performance ───────────────────────────────────────────────────────────
  const total   = trades.length
  const wins    = trades.filter((t: MinimalTrade) => isWin({ pnl: t.pnl })).length
  const winRate = parseFloat(calcWinRate(wins, total).toFixed(2))
  const withR   = trades.filter((t: MinimalTrade) => t.rMultiple != null)
  const avgR    = withR.length > 0
    ? parseFloat((withR.reduce((s: number, t: MinimalTrade) => s + t.rMultiple!, 0) / withR.length).toFixed(4))
    : 0
  const netPnl  = parseFloat(trades.reduce((s: number, t: MinimalTrade) => s + t.pnl, 0).toFixed(2))

  const monthStartISO = monthStart.toISOString().slice(0, 10)
  const pnlMonth = parseFloat(
    trades.filter((t: MinimalTrade) => t.date >= monthStartISO)
      .reduce((s: number, t: MinimalTrade) => s + t.pnl, 0).toFixed(2),
  )

  // Sharpe (Bessel-corrected sample std dev — matches dashboard calculation)
  const rValues = withR.map((t: MinimalTrade) => t.rMultiple!)
  const sharpeRaw = rValues.length >= 5 ? calcSharpeRatio(rValues) : null
  const sharpeRatio = sharpeRaw != null ? parseFloat(sharpeRaw.toFixed(4)) : null

  // Best / worst setup
  const setupMap = new Map<string, string>(setupRows.map((s: RawSetupRow) => [s.id, s.name]))
  const setupStats = new Map<string, { wins: number; trades: number }>()
  for (const t of trades) {
    if (!t.setupId) continue
    const s = setupStats.get(t.setupId) ?? { wins: 0, trades: 0 }
    s.trades++
    if (isWin({ pnl: t.pnl })) s.wins++
    setupStats.set(t.setupId, s)
  }

  let bestSetup:  TraderContext["performance"]["bestSetup"]  = null
  let worstSetup: TraderContext["performance"]["worstSetup"] = null

  for (const [id, s] of setupStats) {
    if (s.trades < 3) continue
    const wr   = calcWinRate(s.wins, s.trades)
    const name: string = setupMap.get(id) ?? id
    if (!bestSetup  || wr > bestSetup.winRate)  bestSetup  = { name, winRate: parseFloat(wr.toFixed(1)), trades: s.trades }
    if (!worstSetup || wr < worstSetup.winRate) worstSetup = { name, winRate: parseFloat(wr.toFixed(1)), trades: s.trades }
  }

  // ── Behavior ──────────────────────────────────────────────────────────────
  const violationsByTag: Record<string, number> = {}
  for (const tag of VIOLATION_TAGS) {
    violationsByTag[tag] = violationRows.filter(
      (t: RawViolationRow) => (t.tags as string[]).includes(tag),
    ).length
  }
  const violationCount    = violationRows.length
  const costoIndisciplina = parseFloat(
    violationRows.reduce((s: number, t: RawViolationRow) => s + Number(t.pnl ?? 0), 0).toFixed(2),
  )

  // Racha días limpios
  const tradingDays = [...new Set(trades.map((t: MinimalTrade) => t.date))].sort((a: string, b: string) => b.localeCompare(a))
  let rachaDiasLimpios = 0
  for (const day of tradingDays) {
    if (trades.filter((t: MinimalTrade) => t.date === day).some(
      (t: MinimalTrade) => VIOLATION_TAGS.some((v: string) => (t.tags as string[]).includes(v)),
    )) break
    rachaDiasLimpios++
  }

  const offPlanCount = trades.filter(
    (t: MinimalTrade) => (t.tags as string[]).some(
      (tag: string) => VIOLATION_TAGS.includes(tag as typeof VIOLATION_TAGS[number]),
    ),
  ).length
  const offPlanPct   = total > 0 ? parseFloat(((offPlanCount / total) * 100).toFixed(2)) : 0

  // ── Learning ──────────────────────────────────────────────────────────────
  const pendingReviews = learningRows.filter(
    (r: RawLearningRow) => r.status === "IN_REVIEW" || r.status === "PENDING",
  ).length
  const masteredResources = learningRows.filter(
    (r: RawLearningRow) => r.status === "MASTERED",
  ).length
  const reviewsDoneThisMonth = reviewRows.filter(
    (r: RawReviewRow) => r.status === "submitted",
  ).length

  // ── Recent trades (last 10) ───────────────────────────────────────────────
  const recentTrades = [...trades]
    .sort((a: MinimalTrade, b: MinimalTrade) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 10)
    .map((t: MinimalTrade) => ({
      id:        t.id,
      date:      t.date,
      symbol:    t.symbol,
      direction: t.direction,
      pnl:       t.pnl,
      rMultiple: t.rMultiple,
      tags:      t.tags,
      session:   t.session,
    }))

  // ── Pattern detection ─────────────────────────────────────────────────────
  const patterns = detectPatterns(trades)

  return {
    performance: {
      totalTrades: total,
      winRate,
      avgR,
      netPnl,
      pnlMonth,
      sharpeRatio,
      bestSetup,
      worstSetup,
    },
    behavior: {
      violationCount,
      violationsByTag,
      costoIndisciplina,
      rachaDiasLimpios,
      offPlanPct,
    },
    learning: {
      pendingReviews,
      reviewsDoneThisMonth,
      masteredResources,
    },
    recentTrades,
    patterns,
  }
}
