// ─────────────────────────────────────────────────────────────────────────────
// Analytics Bundle — consolidated cross-domain data for the Analytics platform.
// Consumes Trades, Accounts, Playbooks(Setups), Markets, Withdrawals, Psychology,
// Goals. Pure aggregation; the insights engine + AI layer sit on top of this.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate } from "@/lib/formulas"
import { computeSetupStats, type SetupStats } from "./setup-analytics"
import type { AnalyticsTrade } from "./insights-engine"

export interface AccountIntel {
  id: string; name: string; type: string
  balance: number; initialBalance: number; netPnl: number
  trades: number; winRate: number
  ddLimitPct: number | null; maxDrawdownPct: number; locked: boolean
}

export interface MarketIntel { symbol: string; trades: number; netPnl: number; winRate: number; avgR: number }

export interface EmotionIntel { emotion: string; trades: number; avgPnl: number; winRate: number }

export interface AnalyticsBundle {
  window: { from: string | null; to: string | null }
  performance: {
    totalTrades: number; wins: number; losses: number
    winRate: number; profitFactor: number | null; expectancy: number
    avgR: number; netPnl: number; avgWin: number; avgLoss: number
    avgHoldMinutes: number | null
  }
  risk: {
    worstDrawdownPct: number
    equityCurve: { date: string; balance: number }[]
    accounts: AccountIntel[]
  }
  setups: SetupStats[]
  markets: MarketIntel[]
  psychology: {
    byEmotion: EmotionIntel[]
    violationRate: number; fomoCount: number; revengeCount: number
    disciplineScore: number
  }
  goals: {
    weeklyPnlGoal: number | null; weeklyTradesGoal: number | null
    disciplineGoal: number | null; weeklyGoalMinutes: number | null
    weekPnl: number; weekTrades: number
  }
  withdrawals: { total: number; count: number; impactPct: number; byMonth: { month: string; amount: number }[] }
  // Raw enriched trades + light meta for the insights engine
  raw: {
    trades: AnalyticsTrade[]
    setupsMeta: { id: string; name: string }[]
    accountsMeta: { id: string; name: string; locked: boolean; ddTotalPct: number | null }[]
    withdrawals: { amount: number; date: string }[]
  }
}

const VIOLATION_TAGS = ["Off-plan", "Impulsivo", "Revanche"]

function holdMinutes(openTime: string | null, closeTime: string | null): number | null {
  if (!openTime || !closeTime) return null
  const [oh, om] = openTime.split(":").map(Number)
  const [ch, cm] = closeTime.split(":").map(Number)
  if ([oh, om, ch, cm].some(Number.isNaN)) return null
  let mins = (ch * 60 + cm) - (oh * 60 + om)
  if (mins < 0) mins += 24 * 60 // crossed midnight
  return mins
}

export async function buildAnalyticsBundle(
  userId: string,
  prisma: PrismaClient,
  window?: { from: Date; to: Date },
): Promise<AnalyticsBundle> {
  const dateFilter = window ? { gte: window.from, lte: window.to } : undefined

  const [tradeRows, accountRows, setupRows, withdrawalRows, userRow] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, status: "CLOSED", ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true, accountId: true, symbol: true, direction: true, session: true,
        openTime: true, closeTime: true, pnl: true, rMultiple: true, tags: true, date: true,
        setupId: true, entry: true, stop: true, target: true, size: true,
        emotionBefore: true, fomoFlag: true, revengeFlag: true, confidenceRating: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 1000,
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, initialBalance: true, ddTotalPct: true, locked: true },
    }),
    prisma.setup.findMany({
      where: { userId },
      select: { id: true, name: true, abbreviation: true, color: true },
    }),
    prisma.withdrawal.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyPnlGoal: true, weeklyTradesGoal: true, disciplineGoal: true, weeklyGoalMinutes: true },
    }),
  ])

  // Normalize trades
  const trades: AnalyticsTrade[] = tradeRows.map((t) => ({
    id: t.id, accountId: t.accountId, symbol: t.symbol, direction: t.direction,
    session: t.session as string | null, openTime: t.openTime as string | null, closeTime: t.closeTime as string | null,
    pnl: t.pnl != null ? Number(t.pnl) : 0, rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    tags: (t.tags as string[]) ?? [], date: (t.date as Date).toISOString().slice(0, 10),
    setupId: t.setupId, entry: Number(t.entry), stop: Number(t.stop), target: Number(t.target), size: Number(t.size),
    emotionBefore: t.emotionBefore as string | null, fomoFlag: t.fomoFlag, revengeFlag: t.revengeFlag,
    confidenceRating: t.confidenceRating,
  }))

  // ── Performance ────────────────────────────────────────────────────────────
  const total  = trades.length
  const winsArr = trades.filter((t) => isWin({ pnl: t.pnl }))
  const lossArr = trades.filter((t) => t.pnl < 0)
  const wins = winsArr.length
  const losses = lossArr.length
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const grossProfit = winsArr.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(lossArr.reduce((s, t) => s + t.pnl, 0))
  const withR = trades.filter((t) => t.rMultiple != null)
  const avgR = withR.length ? withR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / withR.length : 0
  const holds = trades.map((t) => holdMinutes(t.openTime, t.closeTime)).filter((m): m is number => m != null)
  const performance = {
    totalTrades: total, wins, losses,
    winRate: round1(calcWinRate(wins, total)),
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : null,
    expectancy: total ? round2(netPnl / total) : 0,
    avgR: round2(avgR), netPnl: round2(netPnl),
    avgWin: wins ? round2(grossProfit / wins) : 0,
    avgLoss: losses ? round2(grossLoss / losses) : 0,
    avgHoldMinutes: holds.length ? Math.round(holds.reduce((s, m) => s + m, 0) / holds.length) : null,
  }

  // ── Risk: overall equity curve + per-account drawdown ────────────────────────
  const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const initialTotal = accountRows.reduce((s, a) => s + Number(a.initialBalance), 0)
  let runningBalance = initialTotal
  let peak = initialTotal
  let worstDrawdownPct = 0
  const equityCurve: { date: string; balance: number }[] = []
  for (const t of sortedTrades) {
    runningBalance += t.pnl
    peak = Math.max(peak, runningBalance)
    const dd = peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0
    worstDrawdownPct = Math.max(worstDrawdownPct, dd)
    equityCurve.push({ date: t.date, balance: round2(runningBalance) })
  }

  const accounts: AccountIntel[] = accountRows.map((a) => {
    const at = trades.filter((t) => t.accountId === a.id)
    const aWins = at.filter((t) => isWin({ pnl: t.pnl })).length
    const aPnl = at.reduce((s, t) => s + t.pnl, 0)
    // per-account drawdown
    let bal = Number(a.initialBalance), pk = bal, ddMax = 0
    for (const t of [...at].sort((x, y) => x.date.localeCompare(y.date))) {
      bal += t.pnl; pk = Math.max(pk, bal)
      if (pk > 0) ddMax = Math.max(ddMax, ((pk - bal) / pk) * 100)
    }
    return {
      id: a.id, name: a.name, type: a.type,
      balance: round2(Number(a.initialBalance) + aPnl), initialBalance: Number(a.initialBalance),
      netPnl: round2(aPnl), trades: at.length, winRate: round1(calcWinRate(aWins, at.length)),
      ddLimitPct: a.ddTotalPct != null ? Number(a.ddTotalPct) : null, maxDrawdownPct: round1(ddMax), locked: a.locked,
    }
  })

  // ── Setups intelligence ──────────────────────────────────────────────────────
  const setups: SetupStats[] = setupRows
    .map((s) => computeSetupStats(s.id, trades, { id: s.id, name: s.name, abbr: s.abbreviation, color: s.color }))
    .filter((s) => s.trades > 0)
    .sort((a, b) => b.netPnl - a.netPnl)

  // ── Markets intelligence ──────────────────────────────────────────────────────
  const bySymbol = new Map<string, AnalyticsTrade[]>()
  for (const t of trades) { const arr = bySymbol.get(t.symbol) ?? []; arr.push(t); bySymbol.set(t.symbol, arr) }
  const markets: MarketIntel[] = [...bySymbol.entries()].map(([symbol, ts]) => {
    const w = ts.filter((t) => isWin({ pnl: t.pnl })).length
    const r = ts.filter((t) => t.rMultiple != null)
    return {
      symbol, trades: ts.length, netPnl: round2(ts.reduce((s, t) => s + t.pnl, 0)),
      winRate: round1(calcWinRate(w, ts.length)),
      avgR: round2(r.length ? r.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / r.length : 0),
    }
  }).sort((a, b) => b.netPnl - a.netPnl)

  // ── Psychology ────────────────────────────────────────────────────────────────
  const emotions = new Map<string, AnalyticsTrade[]>()
  for (const t of trades) {
    const key = t.emotionBefore || "sin registro"
    const arr = emotions.get(key) ?? []; arr.push(t); emotions.set(key, arr)
  }
  const byEmotion: EmotionIntel[] = [...emotions.entries()].map(([emotion, ts]) => ({
    emotion, trades: ts.length,
    avgPnl: round2(ts.reduce((s, t) => s + t.pnl, 0) / ts.length),
    winRate: round1(calcWinRate(ts.filter((t) => isWin({ pnl: t.pnl })).length, ts.length)),
  })).sort((a, b) => b.trades - a.trades)
  const violationCount = trades.filter((t) => t.fomoFlag || t.revengeFlag || t.tags.some((x) => VIOLATION_TAGS.includes(x))).length
  const psychology = {
    byEmotion,
    violationRate: round1(total ? (violationCount / total) * 100 : 0),
    fomoCount: trades.filter((t) => t.fomoFlag).length,
    revengeCount: trades.filter((t) => t.revengeFlag).length,
    disciplineScore: Math.max(0, Math.round(100 - (total ? (violationCount / total) * 100 : 0))),
  }

  // ── Goals (with this-week progress) ────────────────────────────────────────────
  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekTrades = trades.filter((t) => t.date >= weekStartStr)
  const goals = {
    weeklyPnlGoal: userRow?.weeklyPnlGoal != null ? Number(userRow.weeklyPnlGoal) : null,
    weeklyTradesGoal: userRow?.weeklyTradesGoal ?? null,
    disciplineGoal: userRow?.disciplineGoal ?? null,
    weeklyGoalMinutes: userRow?.weeklyGoalMinutes ?? null,
    weekPnl: round2(weekTrades.reduce((s, t) => s + t.pnl, 0)),
    weekTrades: weekTrades.length,
  }

  // ── Withdrawals ────────────────────────────────────────────────────────────────
  const wAmounts = withdrawalRows.map((w) => ({ amount: Number(w.amount), date: (w.date as Date).toISOString().slice(0, 10) }))
  const totalWithdrawn = wAmounts.reduce((s, w) => s + Math.abs(w.amount), 0)
  const byMonthMap = new Map<string, number>()
  for (const w of wAmounts) { const m = w.date.slice(0, 7); byMonthMap.set(m, (byMonthMap.get(m) ?? 0) + Math.abs(w.amount)) }
  const withdrawals = {
    total: round2(totalWithdrawn), count: wAmounts.length,
    impactPct: netPnl > 0 ? round1((totalWithdrawn / netPnl) * 100) : 0,
    byMonth: [...byMonthMap.entries()].map(([month, amount]) => ({ month, amount: round2(amount) })).sort((a, b) => a.month.localeCompare(b.month)),
  }

  return {
    window: { from: window?.from.toISOString().slice(0, 10) ?? null, to: window?.to.toISOString().slice(0, 10) ?? null },
    performance, risk: { worstDrawdownPct: round1(worstDrawdownPct), equityCurve, accounts },
    setups, markets, psychology, goals, withdrawals,
    raw: {
      trades,
      setupsMeta: setupRows.map((s) => ({ id: s.id, name: s.name })),
      accountsMeta: accountRows.map((a) => ({ id: a.id, name: a.name, locked: a.locked, ddTotalPct: a.ddTotalPct != null ? Number(a.ddTotalPct) : null })),
      withdrawals: wAmounts,
    },
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
function round2(n: number): number { return Math.round(n * 100) / 100 }
