// ─────────────────────────────────────────────────────────────────────────────
// Analytics Insights Engine (Analytics Intelligence Platform)
//
// Deterministic, dependency-light cross-domain analysis. Answers "WHY is this
// happening?" with evidence + an actionable recommendation — WITHOUT requiring an
// LLM (the AI narrative layer sits on top of this, see /api/analytics-ai).
//
// Pure functions only → fully unit-testable. Every detector returns null below a
// minimum-sample threshold so we never surface noise as signal.
// ─────────────────────────────────────────────────────────────────────────────

import { isWin, calcWinRate } from "@/lib/formulas"
import { isViolationTag } from "@/types"
import type { MinimalTrade } from "./dashboard-analytics"

export type InsightCategory = "pattern" | "correlation" | "anomaly" | "risk" | "opportunity"
export type InsightSeverity = "critical" | "warning" | "info" | "positive"

/**
 * Statistical basis of an insight (ADR-002 / S3). When a detector exposes the
 * raw counts/values behind its claim, the persistence layer runs the Bayesian
 * estimator to attach a credible interval + directional confidence. Detectors
 * that cannot ground their claim leave this absent → no fabricated rigor (R6).
 */
export type InsightStat =
  | { kind: "proportion"; successes: number; trials: number; baseline: number; direction: "below" | "above" }

export interface Insight {
  id:              string
  category:        InsightCategory
  severity:        InsightSeverity
  title:           string
  detail:          string
  recommendation?: string
  evidence:        string
  /** Optional headline metric (e.g. a percentage) for compact rendering. */
  metric?:         number
  /** Optional statistical basis for Bayesian historization (ADR-002). */
  stat?:           InsightStat
}

/** A trade enriched with the psychology fields the engine correlates on. */
export type AnalyticsTrade = MinimalTrade & {
  emotionBefore?:    string | null
  fomoFlag?:         boolean
  revengeFlag?:      boolean
  confidenceRating?: number | null
}

export interface InsightInput {
  trades:   AnalyticsTrade[]
  setups:   { id: string; name: string }[]
  accounts: { id: string; name: string; locked: boolean; ddTotalPct: number | null }[]
  withdrawals: { amount: number; date: string }[]
}

const MIN_SAMPLE = 20
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function pct(n: number): number { return Math.round(n * 10) / 10 }
function hasViolation(t: AnalyticsTrade): boolean {
  return t.fomoFlag === true || t.revengeFlag === true || t.tags.some(tag => isViolationTag(tag))
}
function bySymbolDate(a: AnalyticsTrade, b: AnalyticsTrade): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
}

// ── 1. Intraday decay: win rate by Nth trade of the day ──────────────────────
export function detectIntradayDecay(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const byDay = new Map<string, AnalyticsTrade[]>()
  for (const t of trades) {
    const arr = byDay.get(t.date) ?? []
    arr.push(t); byDay.set(t.date, arr)
  }
  // bucket: trades 1-2 vs 3+
  let earlyWins = 0, earlyN = 0, lateWins = 0, lateN = 0
  for (const day of byDay.values()) {
    const sorted = [...day].sort((a, b) => (a.openTime ?? "").localeCompare(b.openTime ?? "") || a.id.localeCompare(b.id))
    sorted.forEach((t, i) => {
      const win = isWin({ pnl: t.pnl })
      if (i < 2) { earlyN++; if (win) earlyWins++ }
      else       { lateN++;  if (win) lateWins++ }
    })
  }
  if (lateN < 10 || earlyN < 10) return null
  const earlyWR = calcWinRate(earlyWins, earlyN)
  const lateWR  = calcWinRate(lateWins, lateN)
  const drop = earlyWR - lateWR
  if (drop < 12) return null
  return {
    id: "intraday-decay",
    category: "pattern",
    severity: drop >= 20 ? "warning" : "info",
    title: "Tu win rate cae después del 2º–3er trade del día",
    detail: `Los primeros 2 trades del día ganan ${pct(earlyWR)}% pero del 3º en adelante caen a ${pct(lateWR)}% (−${pct(drop)} pts).`,
    recommendation: "Define un máximo de trades por día o una pausa obligatoria tras el 2º; el sobre-trading erosiona tu edge.",
    evidence: `${earlyN} trades tempranos vs ${lateN} tardíos.`,
    metric: pct(drop),
    // Late-day win-rate vs the early-day baseline: how sure are we it really drops?
    stat: { kind: "proportion", successes: lateWins, trials: lateN, baseline: earlyWR / 100, direction: "below" },
  }
}

// ── 2. Day-of-week discipline drop ───────────────────────────────────────────
export function detectWeekdayDiscipline(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const byDow = new Map<number, { viol: number; n: number }>()
  for (const t of trades) {
    const dow = new Date(t.date + "T12:00:00").getDay()
    const e = byDow.get(dow) ?? { viol: 0, n: 0 }
    e.n++; if (hasViolation(t)) e.viol++
    byDow.set(dow, e)
  }
  let worst = { dow: -1, rate: 0, n: 0, viol: 0 }
  for (const [dow, e] of byDow) {
    if (e.n < 5) continue
    const rate = (e.viol / e.n) * 100
    if (rate > worst.rate) worst = { dow, rate, n: e.n, viol: e.viol }
  }
  const overallViol = trades.filter(hasViolation).length / trades.length * 100
  if (worst.dow < 0 || worst.rate < 25 || worst.rate < overallViol + 12) return null
  return {
    id: "weekday-discipline",
    category: "correlation",
    severity: worst.rate >= 40 ? "warning" : "info",
    title: `Tu disciplina baja los ${WEEKDAYS[worst.dow].toLowerCase()}`,
    detail: `Los ${WEEKDAYS[worst.dow].toLowerCase()} rompes tu plan en ${pct(worst.rate)}% de los trades, vs ${pct(overallViol)}% en promedio.`,
    recommendation: `Trata los ${WEEKDAYS[worst.dow].toLowerCase()} con reglas más estrictas o reduce tamaño; es tu día de mayor fuga de disciplina.`,
    evidence: `${worst.n} trades ese día.`,
    metric: pct(worst.rate),
    // Violation rate that day vs the overall baseline: confidence it's genuinely worse.
    stat: { kind: "proportion", successes: worst.viol, trials: worst.n, baseline: overallViol / 100, direction: "above" },
  }
}

// ── 3. Emotion ↔ performance correlation ─────────────────────────────────────
export function detectEmotionPerformance(trades: AnalyticsTrade[]): Insight | null {
  const withEmotion = trades.filter(t => t.emotionBefore || t.fomoFlag || t.revengeFlag)
  if (withEmotion.length < 12) return null
  const NEG = new Set(["anxious", "fearful", "frustrated", "overconfident"])
  const neg = trades.filter(t => (t.emotionBefore && NEG.has(t.emotionBefore)) || t.fomoFlag || t.revengeFlag)
  const calm = trades.filter(t => t.emotionBefore === "calm")
  if (neg.length < 6 || calm.length < 6) return null
  const negPnl  = neg.reduce((s, t) => s + t.pnl, 0) / neg.length
  const calmPnl = calm.reduce((s, t) => s + t.pnl, 0) / calm.length
  if (calmPnl - negPnl < Math.abs(calmPnl) * 0.25) return null
  return {
    id: "emotion-performance",
    category: "correlation",
    severity: negPnl < 0 ? "warning" : "info",
    title: "Tus pérdidas aumentan cuando operas en estado emocional negativo",
    detail: `P&L medio en estado calmado: ${calmPnl >= 0 ? "+" : ""}${calmPnl.toFixed(0)} vs en ansiedad/FOMO/revancha: ${negPnl >= 0 ? "+" : ""}${negPnl.toFixed(0)} por trade.`,
    recommendation: "Bloquea la ejecución cuando registres ansiedad o impulso; tu edge desaparece en esos estados.",
    evidence: `${neg.length} trades negativos vs ${calm.length} calmados.`,
    metric: pct(calmPnl - negPnl),
  }
}

// ── 4. Setup profit concentration (opportunity) ──────────────────────────────
export function detectSetupConcentration(input: InsightInput): Insight | null {
  const { trades, setups } = input
  if (trades.length < MIN_SAMPLE) return null
  const profitBySetup = new Map<string, number>()
  let totalProfit = 0
  for (const t of trades) {
    if (t.pnl <= 0 || !t.setupId) continue
    profitBySetup.set(t.setupId, (profitBySetup.get(t.setupId) ?? 0) + t.pnl)
    totalProfit += t.pnl
  }
  if (totalProfit <= 0 || profitBySetup.size === 0) return null
  let best = { id: "", profit: 0 }
  for (const [id, p] of profitBySetup) if (p > best.profit) best = { id, profit: p }
  const share = (best.profit / totalProfit) * 100
  if (share < 45) return null
  const name = setups.find(s => s.id === best.id)?.name ?? "tu mejor setup"
  return {
    id: "setup-concentration",
    category: "opportunity",
    severity: "positive",
    title: `"${name}" genera el ${pct(share)}% de tus beneficios`,
    detail: `"${name}" concentra ${pct(share)}% de tu ganancia bruta. El resto de setups aportan marginalmente.`,
    recommendation: `Aumenta foco y tamaño en "${name}" y poda los setups que no aportan; estás diversificando tu edge en exceso.`,
    evidence: `Sobre ${trades.length} trades cerrados.`,
    metric: pct(share),
  }
}

// ── 5. Withdrawals ↔ growth ──────────────────────────────────────────────────
export function detectWithdrawalImpact(input: InsightInput): Insight | null {
  const { withdrawals, trades } = input
  if (withdrawals.length < 2 || trades.length < MIN_SAMPLE) return null
  const totalWithdrawn = withdrawals.reduce((s, w) => s + Math.abs(w.amount), 0)
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
  if (netPnl <= 0) return null
  const ratio = (totalWithdrawn / netPnl) * 100
  if (ratio < 40) return null
  return {
    id: "withdrawal-impact",
    category: "correlation",
    severity: ratio >= 80 ? "warning" : "info",
    title: "Tus retiros afectan significativamente tu curva de crecimiento",
    detail: `Has retirado ${totalWithdrawn.toFixed(0)} (${pct(ratio)}% de tu P&L neto). Esto frena el interés compuesto de tu cuenta.`,
    recommendation: "Define una política de retiros (p.ej. solo % de ganancias mensuales) para no descapitalizar tu crecimiento.",
    evidence: `${withdrawals.length} retiros.`,
    metric: pct(ratio),
  }
}

// ── 6. Account drawdown risk (risk) ──────────────────────────────────────────
export function detectAccountRisk(input: InsightInput): Insight[] {
  const out: Insight[] = []
  for (const a of input.accounts) {
    if (a.locked) {
      out.push({
        id: `account-locked-${a.id}`,
        category: "risk",
        severity: "critical",
        title: `Cuenta "${a.name}" bloqueada por riesgo`,
        detail: "La cuenta superó un límite de pérdida y está bloqueada para operar.",
        recommendation: "Revisa qué límite se rompió antes de desbloquear; repetirlo puede invalidar la cuenta.",
        evidence: "Estado actual de la cuenta.",
      })
    }
  }
  return out
}

// ── 7. Losing streak anomaly ─────────────────────────────────────────────────
export function detectLosingStreak(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const sorted = [...trades].sort(bySymbolDate)
  let cur = 0, max = 0
  for (const t of sorted) {
    if (t.pnl < 0) { cur++; max = Math.max(max, cur) } else cur = 0
  }
  if (max < 5) return null
  return {
    id: "losing-streak",
    category: "anomaly",
    severity: max >= 7 ? "warning" : "info",
    title: `Racha de ${max} pérdidas consecutivas detectada`,
    detail: `Tu peor racha reciente es de ${max} trades perdedores seguidos.`,
    recommendation: "Considera una regla de parada tras 3 pérdidas seguidas para cortar la sangría y resetear.",
    evidence: `Sobre ${trades.length} trades.`,
    metric: max,
  }
}

// ── 8. Revenge trading: impulsive/revenge entries right after a loss ──────────
export function detectRevengeTrading(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const sorted = [...trades].sort(bySymbolDate)
  let offenders = 0, afterLoss = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].pnl < 0) {
      afterLoss++
      const t = sorted[i]
      if (t.tags.includes("Impulsivo") || t.revengeFlag === true) offenders++
    }
  }
  if (afterLoss === 0) return null
  const rate = offenders / afterLoss
  if (rate < 0.30) return null
  const ratePct = rate * 100
  return {
    id: "revenge-trading",
    category: "pattern",
    severity: rate >= 0.50 ? "warning" : "info",
    title: "Operas por impulso justo después de perder",
    detail: `El ${pct(ratePct)}% de tus trades que siguen a una pérdida son impulsivos o de revancha. Operar para recuperar amplifica el sesgo emocional.`,
    recommendation: "Impón una pausa obligatoria de 15 minutos tras cada pérdida antes de volver a operar.",
    evidence: `${offenders} de ${afterLoss} trades que siguen a una pérdida.`,
    metric: pct(ratePct),
  }
}

// ── 9. Oversizing: position size spikes right after a loss ────────────────────
const OVERSIZE_MULT = 2
export function detectOversizing(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const sorted = [...trades].sort(bySymbolDate)
  const avgSize = sorted.reduce((s, t) => s + t.size, 0) / sorted.length
  if (avgSize <= 0) return null
  let offenders = 0, afterLoss = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].pnl < 0) {
      afterLoss++
      if (sorted[i].size > avgSize * OVERSIZE_MULT) offenders++
    }
  }
  if (afterLoss === 0) return null
  const rate = offenders / afterLoss
  if (rate < 0.20) return null
  const ratePct = rate * 100
  return {
    id: "oversizing",
    category: "risk",
    severity: rate >= 0.40 ? "warning" : "info",
    title: "Aumentas el tamaño después de perder",
    detail: `En el ${pct(ratePct)}% de los trades que siguen a una pérdida duplicas o más tu tamaño promedio, subiendo la exposición en el peor momento.`,
    recommendation: "Fija un tope de 1× tu tamaño promedio en el trade inmediatamente posterior a una pérdida.",
    evidence: `${offenders} de ${afterLoss} trades que siguen a una pérdida.`,
    metric: pct(ratePct),
  }
}

// ── 10. Off-plan: share of trades tagged outside the plan ─────────────────────
// Tag set mirrors verifiers.ts OFF_PLAN_TAGS (source of truth for the commitment
// verifier). Kept local to keep insights-engine dependency-light; the round-trip
// coverage test pins that this insight type still maps to a live verifier.
const OFF_PLAN_TAGS = new Set(["Off-plan", "Impulsivo", "Revanche"])
export function detectOffPlan(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN_SAMPLE) return null
  const offenders = trades.filter((t) => t.tags.some((tag) => OFF_PLAN_TAGS.has(tag)))
  const count = offenders.length
  const rate = count / trades.length
  if (count < 3 || rate < 0.20) return null
  const ratePct = rate * 100
  return {
    id: "off-plan",
    category: "pattern",
    severity: rate >= 0.35 ? "warning" : "info",
    title: "Una parte de tus trades queda fuera de tu plan",
    detail: `${count} de tus ${trades.length} trades (${pct(ratePct)}%) están marcados fuera de plan (Off-plan/Impulsivo/Revancha).`,
    recommendation: "Valida tu checklist antes de cada entrada; comprométete a operar solo setups dentro del plan esta semana.",
    evidence: `${count} trades fuera de plan sobre ${trades.length}.`,
    metric: pct(ratePct),
  }
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, positive: 2, info: 3 }

/** Run all detectors and return a ranked list of insights. */
export function generateInsights(input: InsightInput): Insight[] {
  const t = input.trades
  const out: Insight[] = []
  const push = (i: Insight | null) => { if (i) out.push(i) }

  push(detectIntradayDecay(t))
  push(detectWeekdayDiscipline(t))
  push(detectEmotionPerformance(t))
  push(detectSetupConcentration(input))
  push(detectWithdrawalImpact(input))
  push(detectLosingStreak(t))
  push(detectRevengeTrading(t))
  push(detectOversizing(t))
  push(detectOffPlan(t))
  out.push(...detectAccountRisk(input))

  return out.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
}
