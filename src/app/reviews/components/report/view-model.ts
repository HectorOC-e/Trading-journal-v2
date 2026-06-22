// Shared view-model for the weekly & monthly review report pages. Both report
// procedures return ~the same shape; we normalize them into one VM so a single
// component tree (`ReviewReportShell`) renders both. Pure — safe on client.

import type { WeeklyReport } from "@/domains/analytics/services/weekly-report"
import type { MonthlyReport } from "@/domains/analytics/services/monthly-report"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export type ReviewKind = "weekly" | "monthly"

export interface AiMeta { analysis: string | null; at: string | null }

export interface TrendPoint { label: string; pnl: number }

export type NarrativeVM =
  | { kind: "weekly";  executiveSummary: string; whatWorked: string; toImprove: string; status: string }
  | { kind: "monthly"; summary: string; keyThemes: string[]; goalsSet: string[]; goalsMet: string[] }

export interface ReviewReportVM {
  kind:        ReviewKind
  title:       string
  subtitle:    string
  baseCurrency: string
  backHref:    string
  /** Period key used by the PDF/download route (weekStart or "YYYY-MM"). */
  printPeriod: string
  kpis:   WeeklyReport["kpis"]
  deltas: WeeklyReport["deltas"]
  trend:  { eyebrow: string; points: TrendPoint[] }
  bestDay:  { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  discipline: WeeklyReport["discipline"]
  setups:    WeeklyReport["setups"]
  sessions:  WeeklyReport["sessions"]
  byAccount: WeeklyReport["byAccount"]
  narrative: NarrativeVM | null
  ai:        AiMeta
}

export function weeklyToVM(r: WeeklyReport & { ai: AiMeta }): ReviewReportVM {
  return {
    kind:         "weekly",
    title:        r.weekLabel,
    subtitle:     `Review semanal · ${r.kpis.trades} trades · moneda base ${r.baseCurrency}`,
    baseCurrency: r.baseCurrency,
    backHref:     "/reviews",
    printPeriod:  r.weekStart,
    kpis:         r.kpis,
    deltas:       r.deltas,
    trend:        { eyebrow: "Tendencia día a día", points: r.dayTrend.map(d => ({ label: d.day, pnl: d.pnl })) },
    bestDay:      r.bestDay,
    worstDay:     r.worstDay,
    discipline:   r.discipline,
    setups:       r.setups,
    sessions:     r.sessions,
    byAccount:    r.byAccount,
    narrative:    r.saved ? { kind: "weekly", ...r.saved } : null,
    ai:           r.ai,
  }
}

export function monthlyToVM(r: MonthlyReport & { ai: AiMeta }): ReviewReportVM {
  return {
    kind:         "monthly",
    title:        `${MONTHS[r.month - 1]} ${r.year}`,
    subtitle:     `Review mensual · ${r.kpis.trades} trades · moneda base ${r.baseCurrency}`,
    baseCurrency: r.baseCurrency,
    backHref:     "/reviews",
    printPeriod:  `${r.year}-${String(r.month).padStart(2, "0")}`,
    kpis:         r.kpis,
    deltas:       r.deltas,
    trend:        { eyebrow: "Tendencia semana a semana", points: r.weekTrend.map(w => ({ label: w.week, pnl: w.pnl })) },
    bestDay:      r.bestDay,
    worstDay:     r.worstDay,
    discipline:   r.discipline,
    setups:       r.setups,
    sessions:     r.sessions,
    byAccount:    r.byAccount,
    narrative:    r.saved
      ? { kind: "monthly", summary: r.saved.summary, keyThemes: r.saved.keyThemes, goalsSet: r.saved.goalsSet, goalsMet: r.saved.goalsMet }
      : null,
    ai:           r.ai,
  }
}
