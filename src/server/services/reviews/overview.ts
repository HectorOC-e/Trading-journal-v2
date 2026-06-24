// Data for the Reviews "Trayectoria" panel (the unified index top card): a per-week
// grade/score series ("beads" + sparkline), three from→to trend stats, and up to two
// recurring-pattern cards (reusing the Analytics insights engine). The window is the
// whole history by default, or narrowed to a year / year+month when the index filter
// is active. All P&L is FX-normalized via loadWeeklyCardStats.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { getISOWeekKey } from "@/lib/formulas"
import { deriveGrade, type VerdictTone } from "@/server/services/reviews/verdict"
import { loadWeeklyCardStats } from "@/server/services/reviews/card-stats"
import { loadInsightsForWindow } from "@/server/services/reviews/review-insights"
import type { InsightCategory, InsightSeverity } from "@/domains/analytics/services/insights-engine"

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export interface OverviewBead {
  weekStart: string
  label: string        // "S26"
  grade: string        // "A−"
  tone: VerdictTone
  score: number        // 0–100, drives the sparkline
}

export interface OverviewStat {
  label: string        // "Disciplina"
  from: string         // "62"
  to: string           // "82"
  deltaText: string    // "+20"
  positive: boolean
}

export interface OverviewPattern {
  tag: string          // "Riesgo" / "Patrón" / …
  body: string
  tone: VerdictTone
}

export interface ReviewsOverview {
  weeksCount: number
  headline: string
  trendDeltaText: string | null
  trendPositive: boolean
  sub: string
  beads: OverviewBead[]
  scores: number[]
  months: string[]
  stats: OverviewStat[]
  patterns: OverviewPattern[]
}

export interface OverviewFilter { year?: number; month?: number }

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`
const moneyShort = (n: number) => {
  const a = Math.abs(n)
  const sign = n < 0 ? "−" : "+"
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${sign}$${Math.round(a)}`
}

const CATEGORY_TAG: Record<InsightCategory, string> = {
  pattern: "Patrón", correlation: "Correlación", anomaly: "Anomalía", risk: "Riesgo", opportunity: "Oportunidad",
}
const SEVERITY_TONE: Record<InsightSeverity, VerdictTone> = {
  critical: "bad", warning: "bad", info: "mid", positive: "good",
}
const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 }

/** [from, to) window for the panel: whole history, a year, or a single month. */
async function resolveWindow(prisma: PrismaClient, userId: string, filter?: OverviewFilter): Promise<{ from: Date; to: Date }> {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (filter?.year != null && filter.month != null) {
    return { from: new Date(filter.year, filter.month - 1, 1), to: new Date(filter.year, filter.month, 1) }
  }
  if (filter?.year != null) {
    const to = new Date(filter.year + 1, 0, 1)
    return { from: new Date(filter.year, 0, 1), to: to < tomorrow ? to : tomorrow }
  }
  // Whole history → start at the earliest reviewed week (fallback: earliest closed trade).
  const firstReview = await prisma.weeklyReview.findFirst({
    where: { userId }, orderBy: { weekStart: "asc" }, select: { weekStart: true },
  })
  let from = firstReview?.weekStart ?? null
  if (!from) {
    const firstTrade = await prisma.trade.findFirst({
      where: { userId, status: "CLOSED" }, orderBy: { date: "asc" }, select: { date: true },
    })
    from = firstTrade?.date ?? new Date(now.getFullYear(), 0, 1)
  }
  return { from, to: tomorrow }
}

export async function loadReviewsOverview(prisma: PrismaClient, userId: string, filter?: OverviewFilter): Promise<ReviewsOverview> {
  const { from, to } = await resolveWindow(prisma, userId, filter)

  const rows = await prisma.weeklyReview.findMany({
    where: { userId, weekStart: { gte: from, lt: to } },
    orderBy: { weekStart: "asc" },
    select: { weekStart: true, disciplineScore: true },
  })
  const weekStarts = rows.map(r => r.weekStart.toISOString().slice(0, 10))
  const discByWeek = new Map(rows.map(r => [r.weekStart.toISOString().slice(0, 10), r.disciplineScore]))
  const cardStats = await loadWeeklyCardStats(prisma, userId, weekStarts)

  interface EnrichedWeek extends OverviewBead { ym: string; net: number; winRate: number }
  const weeks: EnrichedWeek[] = []
  for (const ws of weekStarts) {
    const s = cardStats.get(ws)
    if (!s || s.trades === 0) continue // trajectory tracks weeks that actually traded
    const storedDisc = discByWeek.get(ws) ?? 0
    const grade = deriveGrade({
      disciplineScore: storedDisc > 0 ? storedDisc : null,
      winRate: s.winRate, netPnl: s.netPnl, profitFactor: s.profitFactor, trades: s.trades,
    })
    const score = storedDisc > 0 ? storedDisc : grade.score
    const d = new Date(ws + "T00:00:00Z")
    const isoWeek = getISOWeekKey(d).split("W")[1] ?? ""
    weeks.push({
      weekStart: ws, label: "S" + isoWeek, grade: grade.letter, tone: grade.tone, score,
      ym: ws.slice(0, 7), net: s.netPnl, winRate: s.winRate,
    })
  }

  const patterns = await loadPatterns(prisma, userId, { from, to })

  if (weeks.length === 0) {
    return {
      weeksCount: 0, headline: "Aún sin datos", trendDeltaText: null, trendPositive: true,
      sub: "Cierra tu primera semana para empezar a ver tu trayectoria.",
      beads: [], scores: [], months: [], stats: [], patterns,
    }
  }

  // ── Month axis labels (downsampled to ≤6) ──
  const ymOrder: string[] = []
  for (const w of weeks) if (!ymOrder.includes(w.ym)) ymOrder.push(w.ym)
  const monthLabel = (ym: string) => MONTHS_SHORT[+ym.slice(5, 7) - 1]
  const months = downsample(ymOrder.map(monthLabel), 6)

  // ── from→to trend stats: first month vs last month of the window ──
  const firstYm = ymOrder[0], lastYm = ymOrder[ymOrder.length - 1]
  const firstWeeks = weeks.filter(w => w.ym === firstYm)
  const lastWeeks = weeks.filter(w => w.ym === lastYm)
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

  const discFrom = Math.round(avg(firstWeeks.map(w => w.score)))
  const discTo = Math.round(avg(lastWeeks.map(w => w.score)))
  const wrFrom = Math.round(avg(firstWeeks.map(w => w.winRate)))
  const wrTo = Math.round(avg(lastWeeks.map(w => w.winRate)))
  const pnlFrom = sum(firstWeeks.map(w => w.net))
  const pnlTo = sum(lastWeeks.map(w => w.net))

  const delta = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n)
  const trendStats: OverviewStat[] = [
    { label: "Disciplina", from: String(discFrom), to: String(discTo), deltaText: delta(discTo - discFrom), positive: discTo >= discFrom },
    { label: "Win rate", from: `${wrFrom}%`, to: `${wrTo}%`, deltaText: delta(wrTo - wrFrom) + " pts", positive: wrTo >= wrFrom },
    { label: "P&L mensual", from: moneyShort(pnlFrom), to: moneyShort(pnlTo), deltaText: (pnlTo >= pnlFrom ? "▲ " : "▼ ") + money(pnlTo - pnlFrom), positive: pnlTo >= pnlFrom },
  ]

  // ── Headline + green-week streak for the subtitle ──
  const discDelta = discTo - discFrom
  const headline = discDelta >= 4 ? "Vas mejorando" : discDelta <= -4 ? "Atención al control" : "Te mantienes firme"
  const trendPositive = discDelta >= 0
  const trendDeltaText = ymOrder.length > 1 ? delta(discDelta) + " pts" : null
  let greenStreak = 0
  for (let i = weeks.length - 1; i >= 0; i--) { if (weeks[i].net >= 0) greenStreak++; else break }
  const monthsSpan = ymOrder.length
  const sub = monthsSpan > 1
    ? `Disciplina media ${discFrom} → ${discTo} en ${monthsSpan} meses` + (greenStreak >= 2 ? ` · ${greenStreak} semanas verdes seguidas.` : ".")
    : `${weeks.length} semana${weeks.length === 1 ? "" : "s"} registrada${weeks.length === 1 ? "" : "s"}` + (greenStreak >= 2 ? ` · ${greenStreak} verdes seguidas.` : ".")

  return {
    weeksCount: weeks.length,
    headline, trendDeltaText, trendPositive, sub,
    beads: weeks.map(({ weekStart, label, grade, tone, score }) => ({ weekStart, label, grade, tone, score })),
    scores: weeks.map(w => w.score),
    months,
    stats: trendStats,
    patterns,
  }
}

async function loadPatterns(prisma: PrismaClient, userId: string, window: { from: Date; to: Date }): Promise<OverviewPattern[]> {
  const insights = await loadInsightsForWindow(prisma, userId, window)
  return [...insights]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 2)
    .map(i => ({ tag: CATEGORY_TAG[i.category], body: i.detail || i.title, tone: SEVERITY_TONE[i.severity] }))
}

/** Keep first & last, sample the middle, to at most `max` labels. */
function downsample(arr: string[], max: number): string[] {
  if (arr.length <= max) return arr
  const out: string[] = []
  const step = (arr.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)])
  return out
}
