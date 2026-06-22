// Server-side loaders that gather a weekly/monthly review report from the DB and
// build the pure report model. Single source of truth shared by the tRPC `report`
// queries, the AI `generateAnalysis` mutations, and the review email/cron senders.

import type { PrismaClient, WeeklyReview, MonthlyReview } from "@/lib/generated/prisma/client"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { VIOLATION_TAGS } from "@/types"
import { buildWeeklyReport, type WeeklyReport, type ReportTrade } from "@/domains/analytics/services/weekly-report"
import { buildMonthlyReport, type MonthlyReport } from "@/domains/analytics/services/monthly-report"

export interface WeeklyReportBundle { report: WeeklyReport; saved: WeeklyReview | null }
export interface MonthlyReportBundle { report: MonthlyReport; saved: MonthlyReview | null }

const TRADE_SELECT = { accountId: true, pnl: true, rMultiple: true, date: true, setupId: true, tags: true, session: true } as const

export async function loadWeeklyReport(prisma: PrismaClient, userId: string, weekStartISO: string): Promise<WeeklyReportBundle> {
  const weekStart = new Date(weekStartISO + "T00:00:00")
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)   // exclusive
  const prevStart = new Date(weekStart); prevStart.setDate(weekStart.getDate() - 7)

  const [user, accounts, setups, weekRows, prevRows, saved, prevSaved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, name: true, currency: true } }),
    prisma.setup.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.trade.findMany({ where: { userId, status: "CLOSED", date: { gte: weekStart, lt: weekEnd } }, select: TRADE_SELECT }),
    prisma.trade.findMany({ where: { userId, status: "CLOSED", date: { gte: prevStart, lt: weekStart } }, select: TRADE_SELECT }),
    prisma.weeklyReview.findFirst({ where: { userId, weekStart } }),
    prisma.weeklyReview.findFirst({ where: { userId, weekStart: prevStart } }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates      = parseFxRates(user?.fxRates)
  const curById      = new Map(accounts.map(a => [a.id, a.currency]))
  const toReport = (rows: typeof weekRows): ReportTrade[] => rows.map(t => ({
    accountId: t.accountId,
    pnl:       (t.pnl != null ? Number(t.pnl) : 0) * fxFactor(curById.get(t.accountId) ?? baseCurrency, baseCurrency, fxRates),
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    tags:      t.tags as string[],
    session:   t.session ?? "Sin sesión",
  }))

  const isoStart = weekStart.toISOString().slice(0, 10)
  const weekLabel = saved?.weekLabel
    ?? `Semana del ${weekStart.toLocaleDateString("es", { day: "numeric", month: "short" })}`

  const report = buildWeeklyReport({
    weekStart: isoStart,
    weekLabel,
    baseCurrency,
    weekTrades: toReport(weekRows),
    prevTrades: toReport(prevRows),
    accountNames: Object.fromEntries(accounts.map(a => [a.id, a.name])),
    setupNames:   Object.fromEntries(setups.map(s => [s.id, s.name])),
    violationTags: VIOLATION_TAGS,
    weekScore: saved?.disciplineScore ?? null,
    prevScore: prevSaved?.disciplineScore ?? null,
    saved: saved ? { executiveSummary: saved.executiveSummary, whatWorked: saved.whatWorked, toImprove: saved.toImprove, status: saved.status } : null,
  })

  return { report, saved }
}

export async function loadMonthlyReport(prisma: PrismaClient, userId: string, year: number, month: number): Promise<MonthlyReportBundle> {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 1)       // exclusive
  const prevStart  = new Date(year, month - 2, 1)   // previous month start

  const [user, accounts, setups, monthRows, prevRows, weeklies, saved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, name: true, currency: true } }),
    prisma.setup.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.trade.findMany({ where: { userId, status: "CLOSED", date: { gte: monthStart, lt: monthEnd } }, select: TRADE_SELECT }),
    prisma.trade.findMany({ where: { userId, status: "CLOSED", date: { gte: prevStart, lt: monthStart } }, select: TRADE_SELECT }),
    prisma.weeklyReview.findMany({ where: { userId, weekStart: { gte: prevStart, lt: monthEnd } }, select: { weekStart: true, disciplineScore: true } }),
    prisma.monthlyReview.findFirst({ where: { userId, year, month } }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates      = parseFxRates(user?.fxRates)
  const curById      = new Map(accounts.map(a => [a.id, a.currency]))
  const toReport = (rows: typeof monthRows): ReportTrade[] => rows.map(t => ({
    accountId: t.accountId,
    pnl:       (t.pnl != null ? Number(t.pnl) : 0) * fxFactor(curById.get(t.accountId) ?? baseCurrency, baseCurrency, fxRates),
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    tags:      t.tags as string[],
    session:   t.session ?? "Sin sesión",
  }))

  const avgScore = (rows: { weekStart: Date; disciplineScore: number }[], from: Date, to: Date) => {
    const s = rows.filter(r => r.weekStart >= from && r.weekStart < to).map(r => r.disciplineScore).filter(n => n > 0)
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null
  }

  const report = buildMonthlyReport({
    year, month, baseCurrency,
    monthTrades: toReport(monthRows),
    prevTrades:  toReport(prevRows),
    accountNames: Object.fromEntries(accounts.map(a => [a.id, a.name])),
    setupNames:   Object.fromEntries(setups.map(s => [s.id, s.name])),
    violationTags: VIOLATION_TAGS,
    monthScore: saved?.overallScore ?? avgScore(weeklies, monthStart, monthEnd),
    prevScore:  avgScore(weeklies, prevStart, monthStart),
    saved: saved ? { summary: saved.summary, keyThemes: saved.keyThemes, goalsSet: saved.goalsSet, goalsMet: saved.goalsMet, overallScore: saved.overallScore } : null,
  })

  return { report, saved }
}

/** Build a compact AI meta object (analysis text + ISO timestamp) from a saved row. */
export function aiMetaOf(saved: { aiAnalysis: string | null; aiAnalysisAt: Date | null } | null): { analysis: string | null; at: string | null } {
  return { analysis: saved?.aiAnalysis ?? null, at: saved?.aiAnalysisAt?.toISOString() ?? null }
}
