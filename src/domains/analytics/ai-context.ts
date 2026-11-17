import type { PrismaClient } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate, calcSharpeRatio } from "@/lib/formulas"
import { calcSetupHealth } from "@/lib/formulas/setup"
import { fxFactor, parseFxRates, hasFxConversion } from "@/lib/fx"
import { VIOLATION_TAGS } from "@/types"
import { accountTypesForMode, type OperationalMode } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import { detectPatterns } from "./services/pattern-detector"
import type { DetectedPattern } from "./services/pattern-detector"
import type { MinimalTrade } from "./services/dashboard-analytics"
import { studyStreak, minutesThisWeek } from "@/domains/learning/services/study-session-service"

export type TraderContext = {
  scope: { mode: OperationalMode; from?: string; to?: string; includeArchived: true; sampleLimit: number; sampleSize: number; order: "date_desc"; statistics: "sample"; excludedCurrencies: string[] }
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
    // SP2 — richer accompaniment context
    activeResources: { title: string; type: string; progressPct: number | null }[]
    dueReviews: { count: number; nextTitles: string[] }
    studyMinutesWeek: number
    studyStreak: number
    sessionsLast7d: number
    weaknessResource: { setup: string; resource: string } | null
  }
  // HALLAZGO 3 — personal goals + this-week progress so AI can reference them
  goals: {
    weeklyPnlGoal:     number | null
    weeklyTradesGoal:  number | null
    disciplineGoal:    number | null
    weeklyGoalMinutes: number | null
    weekPnl:           number
    weekTrades:        number
  }
  recentTrades: {
    operationalMode: OperationalMode
    accountId: string
    accountName: string
    accountType: string
    currency: string
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
  // ── Global context (read-only; never includes credentials) ──────────────────
  baseCurrency: string
  accounts: {
    id: string
    operationalMode: OperationalMode
    name: string
    type: string
    currency: string
    phase: string | null
    status: string
    locked: boolean
    lockReason: string | null
    balance: number | null   // sample equity in baseCurrency (initial + closed P&L, FX-converted)
    ddDailyPct: number | null
    ddTotalPct: number | null
    targetPct: number | null
  }[]
  setups: {
    name: string
    abbreviation: string
    market: string
    direction: string
    status: string
    expectedWr: number | null
    expectedAvgR: number | null
    winRate: number
    avgR: number
    tradeCount: number
    health: string
  }[]
  withdrawals: Record<string, Record<string, { count: number; amount: number }>> // { currency: { status: {...} } }
  rules: { name: string; severity: string }[]
  psychology: { sessions: number; avgPreMood: number | null; avgEnergy: number | null }
  markets: { symbol: string; name: string }[]
}

// ── Explicit raw row types (avoid Prisma any-cascade in worktree) ─────────────

type RawTradeRow = {
  id: string
  accountId: string
  operationalMode: OperationalMode
  account: { name: string; type: string; currency: string }
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
  account: { currency: string }
  tags: unknown
  pnl: unknown
  date: unknown
}

type RawLearningRow = {
  status: string
  title: string
  type: string
  progressPct: number | null
  nextReviewAt: Date | null
  linkedSetups: { name: string }[]
}

type RawStudySessionRow = {
  startedAt: Date
  durationMin: number | null
}

type RawReviewRow = {
  id: string
  status: string
}

type RawSetupRow = {
  id: string
  name: string
  abbreviation: string
  market: string
  direction: string
  status: string
  expectedWr: unknown
  expectedAvgR: unknown
}

type RawAccountRow = {
  id: string
  name: string
  type: string
  currency: string
  phase: string | null
  status: string
  locked: boolean
  lockReason: string | null
  initialBalance: unknown
  ddDailyPct: unknown
  ddTotalPct: unknown
  targetPct: unknown
}

type RawWithdrawalRow = { currency: string; status: string; amount: unknown }
type RawRuleRow = { name: string; severity: string }
type RawSessionRow = { preMood: number | null; energyLevel: number | null }
type RawMarketRow = { symbol: string; name: string }

export async function buildTraderContext(
  userId: string,
  prisma: PrismaClient,
  window?: { from: Date; to: Date },
  mode: OperationalMode = "REAL",
): Promise<TraderContext> {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const dateFilter = window
    ? { gte: window.from, lte: window.to }
    : undefined

  const scope = { mode, includeArchived: true as const, ...(window ? { from: window.from.toISOString().slice(0, 10), to: window.to.toISOString().slice(0, 10) } : {}) }
  const tradeWhere = await scopedTradeWhere(prisma, userId, scope)
  const accountWhere = { userId, type: { in: accountTypesForMode(mode) } }

  // ── parallel sub-fetches ──────────────────────────────────────────────────
  const studySince = new Date(now); studySince.setDate(now.getDate() - 60)
  const [tradeRows, violationRows, learningRows, reviewRows, setupRows, goalRow,
         accountRows, withdrawalRows, ruleRows, sessionRows, marketRows, studyRows] = await Promise.all([
    // 1. Closed trades for performance & patterns
    prisma.trade.findMany({
      where: {
        ...tradeWhere,
        status: "CLOSED",
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true, accountId: true, operationalMode: true, account: { select: { name: true, type: true, currency: true } }, symbol: true, direction: true,
        session: true, openTime: true, closeTime: true,
        pnl: true, rMultiple: true, tags: true, date: true,
        setupId: true, entry: true, stop: true, target: true, size: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    }) as Promise<RawTradeRow[]>,

    // 2. Violation trades
    prisma.trade.findMany({
      where: {
        ...tradeWhere,
        status: "CLOSED",
        tags: { hasSome: [...VIOLATION_TAGS] },
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      select: { tags: true, pnl: true, date: true, account: { select: { currency: true } } },
    }) as Promise<RawViolationRow[]>,

    // 3. Learning resources (status + progress + reviews + linked setups)
    prisma.learningResource.findMany({
      where: { userId },
      select: { status: true, title: true, type: true, progressPct: true, nextReviewAt: true, linkedSetups: { select: { name: true } } },
    }) as Promise<RawLearningRow[]>,

    // 4. Weekly reviews this month
    prisma.weeklyReview.findMany({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
      select: { id: true, status: true },
    }) as Promise<RawReviewRow[]>,

    // 5. Setup catalog (name + edge + meta for per-setup stats)
    prisma.setup.findMany({
      where: { userId },
      select: { id: true, name: true, abbreviation: true, market: true, direction: true, status: true, expectedWr: true, expectedAvgR: true },
    }) as Promise<RawSetupRow[]>,

    // 6. Personal goals + base currency / FX overrides
    prisma.user.findUnique({
      where:  { id: userId },
      select: { weeklyPnlGoal: true, weeklyTradesGoal: true, disciplineGoal: true, weeklyGoalMinutes: true, baseCurrency: true, fxRates: true },
    }),

    // 7. Accounts (no credentials)
    prisma.account.findMany({
      where: accountWhere,
      select: { id: true, name: true, type: true, currency: true, phase: true, status: true, locked: true, lockReason: true, initialBalance: true, ddDailyPct: true, ddTotalPct: true, targetPct: true },
    }) as Promise<RawAccountRow[]>,

    // 8. Withdrawals (for aggregation)
    prisma.withdrawal.findMany({
      where: { userId, account: accountWhere },
      select: { currency: true, status: true, amount: true },
    }) as Promise<RawWithdrawalRow[]>,

    // 9. Active rules
    prisma.rule.findMany({
      where: { userId, enabled: true, OR: [{ operationalMode: mode }, { operationalMode: null, globalManual: true, sourceInsightId: null, sourceCommitmentId: null }] },
      select: { name: true, severity: true },
    }) as Promise<RawRuleRow[]>,

    // 10. Trading session logs (psychology)
    prisma.tradingSessionLog.findMany({
      where: { userId, operationalMode: mode, ...(dateFilter ? { date: dateFilter } : {}) },
      select: { preMood: true, energyLevel: true },
    }) as Promise<RawSessionRow[]>,

    // 11. Watchlisted markets
    prisma.market.findMany({
      where:  { userId, isWatchlisted: true },
      select: { symbol: true, name: true },
    }) as Promise<RawMarketRow[]>,

    // 12. Completed study sessions (last 60d) — streak / minutes (SP2)
    prisma.studySession.findMany({
      where:  { userId, status: "completed", startedAt: { gte: studySince } },
      select: { startedAt: true, durationMin: true },
    }) as Promise<RawStudySessionRow[]>,
  ]) as [RawTradeRow[], RawViolationRow[], RawLearningRow[], RawReviewRow[], RawSetupRow[], {
    weeklyPnlGoal: unknown; weeklyTradesGoal: number | null; disciplineGoal: number | null; weeklyGoalMinutes: number | null
    baseCurrency: string | null; fxRates: unknown
  } | null, RawAccountRow[], RawWithdrawalRow[], RawRuleRow[], RawSessionRow[], RawMarketRow[], RawStudySessionRow[]]

  const baseCurrency = goalRow?.baseCurrency ?? "USD"
  const fxRates = parseFxRates(goalRow?.fxRates)
  const excludedCurrencies = [...new Set(accountRows.filter(a => !hasFxConversion(a.currency, baseCurrency, fxRates)).map(a => a.currency))]
  const monetaryPnl = (pnl: unknown, currency: string) => hasFxConversion(currency, baseCurrency, fxRates)
    ? Number(pnl ?? 0) * fxFactor(currency, baseCurrency, fxRates) : 0
  const rawById = new Map(tradeRows.map(row => [row.id, row]))

  // ── Normalize trades to MinimalTrade ──────────────────────────────────────
  const trades: MinimalTrade[] = tradeRows.map((t: RawTradeRow) => ({
    id:        t.id,
    accountId: t.accountId,
    symbol:    t.symbol,
    direction: t.direction,
    session:   t.session as string | null,
    openTime:  t.openTime as string | null,
    closeTime: t.closeTime as string | null,
    pnl:       monetaryPnl(t.pnl, t.account.currency),
    rMultiple: t.rMultiple  != null ? Number(t.rMultiple)  : null,
    tags:      t.tags        as string[],
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    entry:     Number(t.entry),
    stop:      Number(t.stop),
    target:    Number(t.target),
    size:      Number(t.size),
  }))

  // All evidence is selected within the mode before the sample limit.
  const finTrades = trades.filter(t => !excludedCurrencies.includes(rawById.get(t.id)!.account.currency))

  const total   = finTrades.length
  const wins    = finTrades.filter((t: MinimalTrade) => isWin({ pnl: t.pnl })).length
  const winRate = parseFloat(calcWinRate(wins, total).toFixed(2))
  const withR   = finTrades.filter((t: MinimalTrade) => t.rMultiple != null)
  const avgR    = withR.length > 0
    ? parseFloat((withR.reduce((s: number, t: MinimalTrade) => s + t.rMultiple!, 0) / withR.length).toFixed(4))
    : 0
  const netPnl  = parseFloat(finTrades.reduce((s: number, t: MinimalTrade) => s + t.pnl, 0).toFixed(2))

  const monthStartISO = monthStart.toISOString().slice(0, 10)
  const pnlMonth = parseFloat(
    finTrades.filter((t: MinimalTrade) => t.date >= monthStartISO)
      .reduce((s: number, t: MinimalTrade) => s + t.pnl, 0).toFixed(2),
  )

  // Sharpe (Bessel-corrected sample std dev — matches dashboard calculation)
  const rValues = withR.map((t: MinimalTrade) => t.rMultiple!)
  const sharpeRaw = rValues.length >= 5 ? calcSharpeRatio(rValues) : null
  const sharpeRatio = sharpeRaw != null ? parseFloat(sharpeRaw.toFixed(4)) : null

  // Best / worst setup
  const setupMap = new Map<string, string>(setupRows.map((s: RawSetupRow) => [s.id, s.name]))
  const setupStats = new Map<string, { wins: number; trades: number }>()
  for (const t of finTrades) {
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
    violationRows.reduce((s: number, t: RawViolationRow) => s + monetaryPnl(t.pnl, t.account.currency), 0).toFixed(2),
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
  // Behaviour uses the same isolated sample.
  const allTotal     = trades.length
  const offPlanPct   = allTotal > 0 ? parseFloat(((offPlanCount / allTotal) * 100).toFixed(2)) : 0

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

  // SP2 — richer learning slice
  const activeResources = learningRows
    .filter(r => r.status === "IN_PROGRESS")
    .slice(0, 6)
    .map(r => ({ title: r.title, type: r.type, progressPct: r.progressPct }))
  const todayISO = now.toISOString().slice(0, 10)
  const dueRows = learningRows.filter(
    r => r.status !== "MASTERED" && r.nextReviewAt && r.nextReviewAt.toISOString().slice(0, 10) <= todayISO,
  )
  const dueReviews = { count: dueRows.length, nextTitles: dueRows.slice(0, 3).map(r => r.title) }
  const studyMinutesWeek = minutesThisWeek(studyRows, now)
  const studyStreakDays = studyStreak(studyRows.map(s => s.startedAt), now)
  const weekStartStudy = new Date(now); weekStartStudy.setDate(now.getDate() - 7)
  const sessionsLast7d = studyRows.filter(s => s.startedAt >= weekStartStudy).length
  // Weakness → resource: a non-mastered resource linked to the worst setup
  let weaknessResource: TraderContext["learning"]["weaknessResource"] = null
  if (worstSetup) {
    const linked = learningRows.find(
      r => r.status !== "MASTERED" && r.linkedSetups.some(ls => ls.name === worstSetup!.name),
    )
    if (linked) weaknessResource = { setup: worstSetup.name, resource: linked.title }
  }

  // ── Recent trades (last 10) ───────────────────────────────────────────────
  const recentTrades = [...trades]
    .sort((a: MinimalTrade, b: MinimalTrade) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 10)
    .map((t: MinimalTrade) => ({
      operationalMode: mode,
      accountId: t.accountId,
      accountName: rawById.get(t.id)!.account.name,
      accountType: rawById.get(t.id)!.account.type,
      currency: rawById.get(t.id)!.account.currency,
      id:        t.id,
      date:      t.date,
      symbol:    t.symbol,
      direction: t.direction,
      pnl:       Number(rawById.get(t.id)!.pnl ?? 0),
      rMultiple: t.rMultiple,
      tags:      t.tags,
      session:   t.session,
    }))

  // ── Pattern detection ─────────────────────────────────────────────────────
  const patterns = detectPatterns(trades)

  // ── Goals + this-week progress (HALLAZGO 3) ───────────────────────────────
  const weekStartD = new Date(now)
  weekStartD.setDate(now.getDate() - ((now.getDay() + 6) % 7)) // Monday
  const weekStartStr = weekStartD.toISOString().slice(0, 10)
  const weekTradesArr = finTrades.filter(t => t.date >= weekStartStr)
  const goals = {
    weeklyPnlGoal:     goalRow?.weeklyPnlGoal != null ? Number(goalRow.weeklyPnlGoal) : null,
    weeklyTradesGoal:  goalRow?.weeklyTradesGoal ?? null,
    disciplineGoal:    goalRow?.disciplineGoal ?? null,
    weeklyGoalMinutes: goalRow?.weeklyGoalMinutes ?? null,
    weekPnl:           parseFloat(weekTradesArr.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
    weekTrades:        weekTradesArr.length,
  }

  // ── Global context (read-only) ────────────────────────────────────────────

  // Per-account closed P&L (in the account's own currency)
  const netByAccount = new Map<string, number>()
  for (const t of tradeRows) netByAccount.set(t.accountId, (netByAccount.get(t.accountId) ?? 0) + Number(t.pnl ?? 0))

  const accounts: TraderContext["accounts"] = accountRows.map(a => {
    const initial = Number(a.initialBalance)
    const equity  = initial + (netByAccount.get(a.id) ?? 0)
    return {
      id: a.id,
      operationalMode: mode,
      name:       a.name,
      type:       a.type,
      currency:   a.currency,
      phase:      a.phase,
      status:     a.status,
      locked:     a.locked,
      lockReason: a.lockReason || null,
      balance: hasFxConversion(a.currency, baseCurrency, fxRates) ? parseFloat((equity * fxFactor(a.currency, baseCurrency, fxRates)).toFixed(2)) : null,
      ddDailyPct: a.ddDailyPct != null ? Number(a.ddDailyPct) : null,
      ddTotalPct: a.ddTotalPct != null ? Number(a.ddTotalPct) : null,
      targetPct:  a.targetPct  != null ? Number(a.targetPct)  : null,
    }
  })

  // Per-setup stats + health
  const setups: TraderContext["setups"] = setupRows.map(s => {
    const st = finTrades.filter(t => t.setupId === s.id)
    const wins = st.filter(t => isWin({ pnl: t.pnl })).length
    const withRs = st.filter(t => t.rMultiple != null)
    const winRate = parseFloat(calcWinRate(wins, st.length).toFixed(2))
    const avgRs   = withRs.length > 0 ? parseFloat((withRs.reduce((a, t) => a + t.rMultiple!, 0) / withRs.length).toFixed(4)) : 0
    const expWr   = s.expectedWr   != null ? Number(s.expectedWr)   : null
    const expR    = s.expectedAvgR != null ? Number(s.expectedAvgR) : null
    return {
      name: s.name, abbreviation: s.abbreviation, market: s.market, direction: s.direction, status: s.status,
      expectedWr: expWr, expectedAvgR: expR, winRate, avgR: avgRs, tradeCount: st.length,
      health: calcSetupHealth({ winRate, avgR: avgRs, expectedWr: expWr, expectedAvgR: expR, tradeCount: st.length }),
    }
  })

  // Withdrawals aggregated by currency → status
  const withdrawals: TraderContext["withdrawals"] = {}
  for (const w of withdrawalRows) {
    const cur = (withdrawals[w.currency] ??= {})
    const cell = (cur[w.status] ??= { count: 0, amount: 0 })
    cell.count += 1
    cell.amount = parseFloat((cell.amount + Number(w.amount)).toFixed(2))
  }

  const rules = ruleRows.map(r => ({ name: r.name, severity: r.severity }))

  const moods   = sessionRows.map(s => s.preMood).filter((n): n is number => n != null)
  const energies = sessionRows.map(s => s.energyLevel).filter((n): n is number => n != null)
  const avg = (xs: number[]) => xs.length ? parseFloat((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)) : null
  const psychology = { sessions: sessionRows.length, avgPreMood: avg(moods), avgEnergy: avg(energies) }

  const markets = marketRows.map(m => ({ symbol: m.symbol, name: m.name }))

  return {
    scope: { ...scope, sampleLimit: 500, sampleSize: trades.length, order: "date_desc", statistics: "sample", excludedCurrencies },
    baseCurrency,
    accounts,
    setups,
    withdrawals,
    rules,
    psychology,
    markets,
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
      activeResources,
      dueReviews,
      studyMinutesWeek,
      studyStreak: studyStreakDays,
      sessionsLast7d,
      weaknessResource,
    },
    goals,
    recentTrades,
    patterns,
  }
}
