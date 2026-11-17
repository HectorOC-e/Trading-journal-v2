import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import { accountTypesForMode, type OperationalMode } from "@/domains/trading/operational-mode"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import { openReviewSnapshot, refreshReviewSnapshot } from "./mode-snapshots"
import type { ReviewModeSnapshot } from "@/lib/generated/prisma/client"
// Server-side loaders that gather a weekly/monthly review report from the DB and
// build the pure report model. Single source of truth shared by the tRPC `report`
// queries, the AI `generateAnalysis` mutations, and the review email/cron senders.

import type { PrismaClient, WeeklyReview, MonthlyReview } from "@/lib/generated/prisma/client"
import { fxFactor, parseFxRates, hasFxConversion } from "@/lib/fx"
import { VIOLATION_TAGS } from "@/types"
import { buildWeeklyReport, type WeeklyReport, type ReportTrade } from "@/domains/analytics/services/weekly-report"
import { buildMonthlyReport, type MonthlyReport } from "@/domains/analytics/services/monthly-report"
import { isWithinEmotionWindow } from "@/domains/trading/services/emotion-provenance"

export interface ReviewScope { mode:OperationalMode;dateBasis:"TRADE_DATE";baseCurrency:string;excludedCurrencies:string[] }

export interface WeeklyReportBundle {
  report: WeeklyReport
  scope: ReviewScope
  evidenceHash:string
  snapshot:ReviewModeSnapshot
  saved: WeeklyReview | null
  /**
   * Trades cerrados de la semana sin emoción y **todavía dentro de la ventana**.
   *
   * La semana de la review NO es la ventana, aunque coincidan en tamaño: una
   * review se abre cuando el trader quiere, y el lunes de una semana ya pasada
   * está a más de 7 días de hoy. Sin este filtro la UI ofrecería un gesto que
   * el servidor rechaza con `EMOTION_WINDOW_CLOSED` — que es exactamente el
   * defecto que esta pieza vino a matar, reintroducido por la puerta de atrás.
   */
  pendingEmotion: { id: string; symbol: string; date: string }[]
}
export interface MonthlyReportBundle { report: MonthlyReport; saved: MonthlyReview | null; scope:ReviewScope; evidenceHash:string; snapshot:ReviewModeSnapshot }

const TRADE_SELECT = { id:true,updatedAt:true,accountId: true, pnl: true, rMultiple: true, date: true, setupId: true, tags: true, session: true } as const

export async function loadWeeklyReport(prisma: PrismaClient, userId: string, weekStartISO: string, mode:OperationalMode="REAL"): Promise<WeeklyReportBundle> {
  const scopeWhere=await scopedTradeWhere(prisma,userId,{mode,includeArchived:true,from:weekStartISO})
  const snapshot=await openReviewSnapshot(prisma,userId,"WEEKLY",weekStartISO,mode)
  const weekStart = new Date(weekStartISO + "T00:00:00Z")
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)   // exclusive
  const prevStart = new Date(weekStart); prevStart.setDate(weekStart.getDate() - 7)

  const [user, accounts, setups, weekRows, prevRows, saved, prevSaved, pendingEmotionRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId,type:{in:accountTypesForMode(mode)} }, select: { id: true, name: true, currency: true, type:true } }),
    prisma.setup.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.trade.findMany({ where: { ...scopeWhere, status: "CLOSED", date: { gte: weekStart, lt: weekEnd } }, select: TRADE_SELECT, orderBy:[{date:"asc"},{id:"asc"}] }),
    prisma.trade.findMany({ where: { ...scopeWhere, status: "CLOSED", date: { gte: prevStart, lt: weekStart } }, select: TRADE_SELECT, orderBy:[{date:"asc"},{id:"asc"}] }),
    prisma.weeklyReview.findFirst({ where: { userId, weekStart } }),
    prisma.weeklyReview.findFirst({ where: { userId, weekStart: prevStart } }),
    // Los trades de la semana a los que les falta la emoción. Consulta aparte:
    // TRADE_SELECT alimenta la matemática del report y no lleva id ni emoción.
    // El plazo se filtra abajo contra `isWithinEmotionWindow`, la MISMA función
    // que aplica el servidor al escribir — no una fecha recalculada aquí.
    prisma.trade.findMany({
      where:   { ...scopeWhere, status: "CLOSED", date: { gte: weekStart, lt: weekEnd }, emotionBefore: null },
      select:  { id: true, symbol: true, date: true },
      orderBy: { date: "asc" },
    }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates      = parseFxRates(user?.fxRates)
  const curById      = new Map(accounts.map(a => [a.id, a.currency]))
  const toReport = (rows: typeof weekRows): ReportTrade[] => rows.filter(t=>curById.has(t.accountId)&&hasFxConversion(curById.get(t.accountId)!,baseCurrency,fxRates)).map(t => ({
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

  const [weekDiscipline,prevDiscipline]=await Promise.all([
    computeDisciplineScore(prisma,userId,{from:weekStart,to:weekEnd},undefined,mode),
    computeDisciplineScore(prisma,userId,{from:prevStart,to:weekStart},undefined,mode),
  ])
  const report = buildWeeklyReport({
    weekStart: isoStart,
    weekLabel,
    baseCurrency,
    weekTrades: toReport(weekRows),
    prevTrades: toReport(prevRows),
    accountNames: Object.fromEntries(accounts.map(a => [a.id, a.name])),
    setupNames:   Object.fromEntries(setups.map(s => [s.id, s.name])),
    violationTags: VIOLATION_TAGS,
    weekScore: weekDiscipline.score ?? null,
    prevScore: prevDiscipline.score ?? null,
    saved: saved ? { executiveSummary: saved.executiveSummary, whatWorked: saved.whatWorked, toImprove: saved.toImprove, status: saved.status } : null,
  })

  const refreshed=await refreshReviewSnapshot(prisma,snapshot,{user,accounts,weekRows,prevRows,weekDiscipline,prevDiscipline,notes:{executiveSummary:saved?.executiveSummary??"",whatWorked:saved?.whatWorked??"",toImprove:saved?.toImprove??""},setups},report.kpis)
  void prevSaved
  return {
    report,
    scope:{mode,dateBasis:"TRADE_DATE",baseCurrency,excludedCurrencies:[...new Set([...weekRows,...prevRows].map(t=>curById.get(t.accountId)).filter((currency):currency is string=>!!currency&&!hasFxConversion(currency,baseCurrency,fxRates)))]},
    evidenceHash:refreshed.evidenceHash,
    snapshot:refreshed.snapshot,
    saved:saved?{...saved,disciplineScore:weekDiscipline.score??0,aiAnalysis:refreshed.ai.analysis,aiAnalysisAt:refreshed.ai.at}:null,
    pendingEmotion: pendingEmotionRows
      .filter(t => isWithinEmotionWindow(t.date as Date, new Date()))
      .map(t => ({
        id: t.id, symbol: t.symbol, date: (t.date as Date).toISOString().slice(0, 10),
      })),
  }
}

export async function loadMonthlyReport(prisma: PrismaClient, userId: string, year: number, month: number, mode:OperationalMode="REAL"): Promise<MonthlyReportBundle> {
  const scopeWhere=await scopedTradeWhere(prisma,userId,{mode,includeArchived:true})
  const periodKey=`${year}-${String(month).padStart(2,"0")}`
  const snapshot=await openReviewSnapshot(prisma,userId,"MONTHLY",periodKey,mode)
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd   = new Date(Date.UTC(year, month, 1))       // exclusive
  const prevStart  = new Date(Date.UTC(year, month - 2, 1))   // previous month start

  const [user, accounts, setups, monthRows, prevRows, weeklies, saved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId,type:{in:accountTypesForMode(mode)} }, select: { id: true, name: true, currency: true, type:true } }),
    prisma.setup.findMany({ where: { userId }, select: { id: true, name: true } }),
    prisma.trade.findMany({ where: { ...scopeWhere, status: "CLOSED", date: { gte: monthStart, lt: monthEnd } }, select: TRADE_SELECT, orderBy:[{date:"asc"},{id:"asc"}] }),
    prisma.trade.findMany({ where: { ...scopeWhere, status: "CLOSED", date: { gte: prevStart, lt: monthStart } }, select: TRADE_SELECT, orderBy:[{date:"asc"},{id:"asc"}] }),
    prisma.weeklyReview.findMany({ where: { userId, weekStart: { gte: prevStart, lt: monthEnd } }, select: { weekStart: true, disciplineScore: true } }),
    prisma.monthlyReview.findFirst({ where: { userId, year, month } }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates      = parseFxRates(user?.fxRates)
  const curById      = new Map(accounts.map(a => [a.id, a.currency]))
  const toReport = (rows: typeof monthRows): ReportTrade[] => rows.filter(t=>curById.has(t.accountId)&&hasFxConversion(curById.get(t.accountId)!,baseCurrency,fxRates)).map(t => ({
    accountId: t.accountId,
    pnl:       (t.pnl != null ? Number(t.pnl) : 0) * fxFactor(curById.get(t.accountId) ?? baseCurrency, baseCurrency, fxRates),
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    tags:      t.tags as string[],
    session:   t.session ?? "Sin sesión",
  }))

  const [monthDiscipline,prevDiscipline]=await Promise.all([
    computeDisciplineScore(prisma,userId,{from:monthStart,to:monthEnd},undefined,mode),
    computeDisciplineScore(prisma,userId,{from:prevStart,to:monthStart},undefined,mode),
  ])
  void weeklies

  const report = buildMonthlyReport({
    year, month, baseCurrency,
    monthTrades: toReport(monthRows),
    prevTrades:  toReport(prevRows),
    accountNames: Object.fromEntries(accounts.map(a => [a.id, a.name])),
    setupNames:   Object.fromEntries(setups.map(s => [s.id, s.name])),
    violationTags: VIOLATION_TAGS,
    monthScore: monthDiscipline.score ?? null,
    prevScore:  prevDiscipline.score ?? null,
    saved: saved ? { summary: saved.summary, keyThemes: saved.keyThemes, goalsSet: saved.goalsSet, goalsMet: saved.goalsMet, overallScore: null } : null,
  })

  const refreshed=await refreshReviewSnapshot(prisma,snapshot,{user,accounts,monthRows,prevRows,monthDiscipline,prevDiscipline,notes:{summary:saved?.summary??"",keyThemes:saved?.keyThemes??[],goalsSet:saved?.goalsSet??[],goalsMet:saved?.goalsMet??[]},setups},report.kpis)
  return { report, saved:saved?{...saved,aiAnalysis:refreshed.ai.analysis,aiAnalysisAt:refreshed.ai.at,overallScore:null,pillarDiscipline:monthDiscipline.score,pillarPerformance:null,pillarPsychology:null,letterTitle:null,keyThemesRich:null}:null,scope:{mode,dateBasis:"TRADE_DATE",baseCurrency,excludedCurrencies:[...new Set([...monthRows,...prevRows].map(t=>curById.get(t.accountId)).filter((currency):currency is string=>!!currency&&!hasFxConversion(currency,baseCurrency,fxRates)))]},evidenceHash:refreshed.evidenceHash,snapshot:refreshed.snapshot }
}

/** Build a compact AI meta object (analysis text + ISO timestamp) from a saved row. */
export function aiMetaOf(saved: { aiAnalysis: string | null; aiAnalysisAt: Date | null } | null): { analysis: string | null; at: string | null } {
  return { analysis: saved?.aiAnalysis ?? null, at: saved?.aiAnalysisAt?.toISOString() ?? null }
}
