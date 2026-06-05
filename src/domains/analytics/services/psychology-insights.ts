// ─────────────────────────────────────────────────────────────────────────────
// Psychology Intelligence — deterministic behavioural analysis.
// Correlates emotion/discipline with performance, drawdowns, rule violations and
// confidence. Pure functions → unit-testable. Produces actionable Insight[].
// ─────────────────────────────────────────────────────────────────────────────

import { isWin } from "@/lib/formulas"
import type { AnalyticsTrade, Insight } from "./insights-engine"

const NEG_EMOTIONS = new Set(["anxious", "fearful", "frustrated", "overconfident", "angry"])
const VIOLATION_TAGS = ["Off-plan", "Impulsivo", "Revanche"]

function isImpulsive(t: AnalyticsTrade): boolean {
  return t.fomoFlag === true || t.revengeFlag === true || t.tags.some(x => VIOLATION_TAGS.includes(x))
}
function isNegative(t: AnalyticsTrade): boolean {
  return (t.emotionBefore != null && NEG_EMOTIONS.has(t.emotionBefore)) || t.fomoFlag === true || t.revengeFlag === true
}
function pct(n: number): number { return Math.round(n * 10) / 10 }
function holdMin(t: AnalyticsTrade): number | null {
  if (!t.openTime || !t.closeTime) return null
  const [oh, om] = t.openTime.split(":").map(Number)
  const [ch, cm] = t.closeTime.split(":").map(Number)
  if ([oh, om, ch, cm].some(Number.isNaN)) return null
  let m = ch * 60 + cm - (oh * 60 + om); if (m < 0) m += 1440
  return m
}

const MIN = 15

// ── 1. Negative emotion before losses ────────────────────────────────────────
export function detectEmotionBeforeLoss(trades: AnalyticsTrade[]): Insight | null {
  const losses = trades.filter(t => t.pnl < 0 && (t.emotionBefore != null || t.fomoFlag || t.revengeFlag))
  if (losses.length < 8) return null
  const negLosses = losses.filter(isNegative).length
  const share = (negLosses / losses.length) * 100
  if (share < 50) return null
  return {
    id: "emotion-before-loss", category: "correlation", severity: share >= 65 ? "warning" : "info",
    title: `La frustración/ansiedad aparece antes del ${pct(share)}% de tus pérdidas`,
    detail: `${negLosses} de ${losses.length} trades perdedores con registro emocional venían precedidos de un estado negativo (ansiedad, miedo, FOMO o revancha).`,
    recommendation: "Antes de ejecutar, valida tu estado: si está en rojo, no operes. El estado emocional negativo es tu predictor de pérdidas más fuerte.",
    evidence: `${losses.length} pérdidas con emoción registrada.`, metric: pct(share),
  }
}

// ── 2. Impulsive trades expectancy ────────────────────────────────────────────
export function detectImpulsiveExpectancy(trades: AnalyticsTrade[]): Insight | null {
  const imp = trades.filter(isImpulsive)
  const planned = trades.filter(t => !isImpulsive(t))
  if (imp.length < 6 || planned.length < 6) return null
  const impExp = imp.reduce((s, t) => s + t.pnl, 0) / imp.length
  const planExp = planned.reduce((s, t) => s + t.pnl, 0) / planned.length
  if (impExp >= 0 && impExp >= planExp) return null
  return {
    id: "impulsive-expectancy", category: "pattern", severity: impExp < 0 ? "critical" : "warning",
    title: "Tus operaciones impulsivas tienen expectancy negativo",
    detail: `Expectancy impulsivo: ${impExp >= 0 ? "+" : ""}${impExp.toFixed(0)} por trade vs planificado ${planExp >= 0 ? "+" : ""}${planExp.toFixed(0)}. La impulsividad te cuesta dinero de forma sistemática.`,
    recommendation: "Implementa una regla de fricción (esperar 5 min / checklist obligatorio) antes de cualquier entrada no planificada.",
    evidence: `${imp.length} impulsivos vs ${planned.length} planificados.`, metric: pct(planExp - impExp),
  }
}

// ── 3. Overconfidence bias ────────────────────────────────────────────────────
export function detectOverconfidence(trades: AnalyticsTrade[]): Insight | null {
  const high = trades.filter(t => (t.confidenceRating ?? 0) >= 4)
  if (high.length < 8) return null
  const wins = high.filter(t => isWin({ pnl: t.pnl })).length
  const wr = (wins / high.length) * 100
  const overallWins = trades.filter(t => isWin({ pnl: t.pnl })).length
  const overallWr = (overallWins / trades.length) * 100
  if (wr >= overallWr - 5) return null
  return {
    id: "overconfidence-bias", category: "pattern", severity: "warning",
    title: "Sesgo de exceso de confianza detectado",
    detail: `Tus trades de máxima confianza (4-5/5) ganan ${pct(wr)}% vs tu media de ${pct(overallWr)}%. Tu confianza no está calibrada con el resultado.`,
    recommendation: "Cuando sientas certeza total, reduce tamaño en lugar de aumentarlo; la sobreconfianza precede a tus peores entradas.",
    evidence: `${high.length} trades de alta confianza.`, metric: pct(overallWr - wr),
  }
}

// ── 4. Cutting winners / holding losers ───────────────────────────────────────
export function detectHoldingAsymmetry(trades: AnalyticsTrade[]): Insight | null {
  const winners = trades.filter(t => isWin({ pnl: t.pnl })).map(holdMin).filter((m): m is number => m != null)
  const losers = trades.filter(t => t.pnl < 0).map(holdMin).filter((m): m is number => m != null)
  if (winners.length < 8 || losers.length < 8) return null
  const avgWin = winners.reduce((s, m) => s + m, 0) / winners.length
  const avgLoss = losers.reduce((s, m) => s + m, 0) / losers.length
  if (avgLoss <= avgWin * 1.3) return null
  return {
    id: "holding-asymmetry", category: "pattern", severity: "warning",
    title: "Cortas ganadores y aguantas perdedores (aversión a la pérdida)",
    detail: `Mantienes tus perdedores ${Math.round(avgLoss)} min de media vs ${Math.round(avgWin)} min los ganadores. Es el patrón clásico de aversión a la pérdida.`,
    recommendation: "Define salidas mecánicas: deja correr ganadores hacia el target y corta perdedores en el stop sin renegociar.",
    evidence: `${winners.length} ganadores vs ${losers.length} perdedores con tiempo.`,
    metric: Math.round(avgLoss - avgWin),
  }
}

// ── 5. Rule-violation emotion ─────────────────────────────────────────────────
export function detectViolationEmotion(trades: AnalyticsTrade[]): Insight | null {
  const viol = trades.filter(isImpulsive).filter(t => t.emotionBefore)
  if (viol.length < 6) return null
  const counts = new Map<string, number>()
  for (const t of viol) counts.set(t.emotionBefore!, (counts.get(t.emotionBefore!) ?? 0) + 1)
  let top = { emo: "", n: 0 }
  for (const [emo, n] of counts) if (n > top.n) top = { emo, n }
  const share = (top.n / viol.length) * 100
  if (share < 40) return null
  return {
    id: "violation-emotion", category: "correlation", severity: "info",
    title: `Tus violaciones de reglas se asocian a "${top.emo}"`,
    detail: `${pct(share)}% de tus trades fuera de plan ocurren en estado "${top.emo}". Es tu gatillo emocional principal de indisciplina.`,
    recommendation: `Crea un protocolo específico para cuando detectes "${top.emo}": pausa, respira, revisa el plan antes de tocar el botón.`,
    evidence: `${viol.length} violaciones con emoción.`, metric: pct(share),
  }
}

// ── 6. Positive habit: clean discipline streak ────────────────────────────────
export function detectCleanStreak(trades: AnalyticsTrade[]): Insight | null {
  if (trades.length < MIN) return null
  const days = [...new Set(trades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  let streak = 0
  for (const d of days) {
    const dayTrades = trades.filter(t => t.date === d)
    if (dayTrades.some(isImpulsive)) break
    streak++
  }
  if (streak < 3) return null
  return {
    id: "clean-streak", category: "opportunity", severity: "positive",
    title: `Racha de ${streak} días de disciplina limpia`,
    detail: `Llevas ${streak} días de trading sin violar tu plan. Estás consolidando el hábito correcto.`,
    recommendation: "Protege la racha: el coste psicológico de romperla es tu mejor ancla de disciplina.",
    evidence: `${days.length} días operados.`, metric: streak,
  }
}

const RANK: Record<Insight["severity"], number> = { critical: 0, warning: 1, positive: 2, info: 3 }

export function generatePsychologyInsights(trades: AnalyticsTrade[]): Insight[] {
  const out: Insight[] = []
  const push = (i: Insight | null) => { if (i) out.push(i) }
  push(detectEmotionBeforeLoss(trades))
  push(detectImpulsiveExpectancy(trades))
  push(detectOverconfidence(trades))
  push(detectHoldingAsymmetry(trades))
  push(detectViolationEmotion(trades))
  push(detectCleanStreak(trades))
  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity])
}
