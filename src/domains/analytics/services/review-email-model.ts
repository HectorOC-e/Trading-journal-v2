// Pure builder for the review email model. Maps a computed report (weekly or
// monthly) + optional AI analysis into the flat shape the email template renders.

import type { WeeklyReport } from "./weekly-report"
import type { MonthlyReport } from "./monthly-report"

export interface ReviewEmailModel {
  isEmpty: boolean
  kind: "weekly" | "monthly"
  title: string
  baseCurrency: string
  kpis:   { netPnl: number; winRate: number; profitFactor: number; trades: number; disciplineScore: number | null }
  deltas: { netPnl: number; winRate: number }
  topSetup:   { name: string; pnl: number } | null
  worstSetup: { name: string; pnl: number } | null
  discipline: { violations: number; costo: number }
  aiAnalysis: string | null
  /** App-relative path to the live report (CTA target). */
  reportPath: string
}

export function buildReviewEmailModel(opts: {
  kind: "weekly" | "monthly"
  title: string
  reportPath: string
  report: WeeklyReport | MonthlyReport
  aiAnalysis: string | null
}): ReviewEmailModel {
  const { report } = opts
  const byPnl = [...report.setups].sort((a, b) => b.pnl - a.pnl)
  const topSetup   = byPnl.length ? { name: byPnl[0].name, pnl: byPnl[0].pnl } : null
  const worstSetup = byPnl.length > 1 ? { name: byPnl[byPnl.length - 1].name, pnl: byPnl[byPnl.length - 1].pnl } : null

  return {
    isEmpty:      report.kpis.trades === 0,
    kind:         opts.kind,
    title:        opts.title,
    baseCurrency: report.baseCurrency,
    kpis:         report.kpis,
    deltas:       { netPnl: report.deltas.netPnl, winRate: report.deltas.winRate },
    topSetup,
    worstSetup,
    discipline:   { violations: report.discipline.violations, costo: report.discipline.costo },
    aiAnalysis:   opts.aiAnalysis,
    reportPath:   opts.reportPath,
  }
}
