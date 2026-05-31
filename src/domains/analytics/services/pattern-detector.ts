import { isWin, calcWinRate } from "@/lib/formulas"
import type { MinimalTrade } from "./dashboard-analytics"

export type DetectedPattern = {
  id:          string
  title:       string
  description: string
  confidence:  "high" | "medium" | "low"
  evidence:    string   // e.g. "Based on 23 trades over 3 months"
  actionable:  string   // e.g. "Consider a 10-minute break rule after 2 consecutive losses"
}

const MIN_TRADES = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function weekSpan(trades: MinimalTrade[]): number {
  if (trades.length === 0) return 0
  const dates  = trades.map(t => t.date).sort()
  const msSpan = new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()
  return Math.max(1, Math.round(msSpan / (7 * 24 * 60 * 60 * 1000)))
}

function monthSpan(trades: MinimalTrade[]): number {
  const weeks = weekSpan(trades)
  return Math.max(1, Math.round(weeks / 4.33))
}

// ── Detector 1: Revenge Trading ───────────────────────────────────────────────

function detectRevengeTradingPattern(trades: MinimalTrade[]): DetectedPattern | null {
  if (trades.length < MIN_TRADES) return null

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  let impulsiveAfterLoss = 0
  let totalAfterLoss     = 0

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.pnl < 0) {
      totalAfterLoss++
      if (curr.tags.includes("Impulsivo")) impulsiveAfterLoss++
    }
  }

  if (totalAfterLoss === 0) return null

  const pct = impulsiveAfterLoss / totalAfterLoss

  if (pct < 0.30) return null

  const confidence: DetectedPattern["confidence"] = pct >= 0.50 ? "high" : pct >= 0.40 ? "medium" : "low"
  const months = monthSpan(sorted)

  return {
    id:          "revenge-trading",
    title:       "Patrón de Revenge Trading",
    description: `El ${(pct * 100).toFixed(0)}% de tus trades marcados como "Impulsivo" ocurren justo después de una pérdida. Esto indica que operas emocionalmente para recuperar pérdidas.`,
    confidence,
    evidence:    `Basado en ${impulsiveAfterLoss} trades impulsivos tras pérdidas, de un total de ${sorted.length} trades en ${months} mes${months !== 1 ? "es" : ""}`,
    actionable:  "Implementa una pausa obligatoria de 15 minutos después de cada trade perdedor antes de volver a operar.",
  }
}

// ── Detector 2: Oversizing After Loss ────────────────────────────────────────

function detectOversizingAfterLoss(trades: MinimalTrade[]): DetectedPattern | null {
  if (trades.length < MIN_TRADES) return null

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  const avgSize = sorted.reduce((s, t) => s + t.size, 0) / sorted.length
  if (avgSize === 0) return null

  let oversizedAfterLoss = 0
  let totalAfterLoss     = 0

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.pnl < 0) {
      totalAfterLoss++
      if (curr.size > avgSize * 2) oversizedAfterLoss++
    }
  }

  if (totalAfterLoss === 0) return null

  const pct = oversizedAfterLoss / totalAfterLoss

  if (pct < 0.20) return null

  const confidence: DetectedPattern["confidence"] = pct >= 0.40 ? "high" : pct >= 0.30 ? "medium" : "low"
  const weeks  = weekSpan(sorted)

  return {
    id:          "oversizing-after-loss",
    title:       "Oversizing Tras Pérdidas",
    description: `En el ${(pct * 100).toFixed(0)}% de los casos, duplicas o más el tamaño de posición después de una pérdida. Esto incrementa tu exposición en momentos de sesgo emocional.`,
    confidence,
    evidence:    `Detectado en ${oversizedAfterLoss} de ${totalAfterLoss} trades que siguen a una pérdida, en ${weeks} semana${weeks !== 1 ? "s" : ""}`,
    actionable:  "Fija un límite de tamaño máximo de 1× tu talla promedio en el trade inmediatamente posterior a una pérdida.",
  }
}

// ── Detector 3: Friday Bias ───────────────────────────────────────────────────

function detectFridayBias(trades: MinimalTrade[]): DetectedPattern | null {
  if (trades.length < MIN_TRADES) return null

  const fridayTrades    = trades.filter(t => new Date(t.date).getDay() === 5)
  const nonFridayTrades = trades.filter(t => new Date(t.date).getDay() !== 5)

  if (fridayTrades.length < 5 || nonFridayTrades.length === 0) return null

  const fridayWr    = calcWinRate(fridayTrades.filter(t => isWin({ pnl: t.pnl })).length, fridayTrades.length)
  const nonFridayWr = calcWinRate(nonFridayTrades.filter(t => isWin({ pnl: t.pnl })).length, nonFridayTrades.length)

  const drop = nonFridayWr - fridayWr

  if (drop < 10) return null

  const confidence: DetectedPattern["confidence"] = drop >= 25 ? "high" : drop >= 15 ? "medium" : "low"
  const weeks = weekSpan(trades)

  return {
    id:          "friday-bias",
    title:       "Sesgo de Rendimiento en Viernes",
    description: `Tu win rate los viernes (${fridayWr.toFixed(0)}%) es ${drop.toFixed(0)} pp inferior al del resto de la semana (${nonFridayWr.toFixed(0)}%). Posiblemente el entorno de cierre semanal afecta tu toma de decisiones.`,
    confidence,
    evidence:    `Basado en ${fridayTrades.length} trades en viernes frente a ${nonFridayTrades.length} trades en otros días, durante ${weeks} semana${weeks !== 1 ? "s" : ""}`,
    actionable:  "Evalúa reducir el tamaño de posición o el número de trades los viernes. Considera no operar eventos macro de cierre semanal.",
  }
}

// ── Detector 4: Overtrading After Win Streak ──────────────────────────────────

function detectOvertradingAfterWinStreak(trades: MinimalTrade[]): DetectedPattern | null {
  if (trades.length < MIN_TRADES) return null

  const byDate = new Map<string, MinimalTrade[]>()
  for (const t of trades) {
    const arr = byDate.get(t.date) ?? []
    arr.push(t)
    byDate.set(t.date, arr)
  }

  const sortedDates = [...byDate.keys()].sort()
  if (sortedDates.length < 5) return null

  const dailyCounts = sortedDates.map(d => byDate.get(d)!.length)
  const avgDaily    = dailyCounts.reduce((s, c) => s + c, 0) / dailyCounts.length

  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  let overtradingDays  = 0
  let totalAfterStreak = 0

  for (let i = 3; i < sorted.length; i++) {
    const prev3 = [sorted[i - 3], sorted[i - 2], sorted[i - 1]]
    if (prev3.every(t => t.pnl > 0)) {
      const nextDate = sorted[i].date
      const dayCount = byDate.get(nextDate)?.length ?? 1
      totalAfterStreak++
      if (dayCount > avgDaily * 1.5) overtradingDays++
    }
  }

  if (totalAfterStreak < 5) return null

  const pct = overtradingDays / totalAfterStreak
  if (pct < 0.25) return null

  const confidence: DetectedPattern["confidence"] = pct >= 0.50 ? "high" : pct >= 0.35 ? "medium" : "low"
  const weeks = weekSpan(sorted)

  return {
    id:          "overtrading-after-win-streak",
    title:       "Overtrading Tras Rachas Ganadoras",
    description: `Después de 3 o más trades ganadores consecutivos, aumentas el volumen de operaciones en >50% respecto a tu media diaria en el ${(pct * 100).toFixed(0)}% de los casos. La euforia puede estar llevándote a sobreoperar.`,
    confidence,
    evidence:    `Detectado en ${overtradingDays} días de ${totalAfterStreak} situaciones tras racha ganadora, en ${weeks} semana${weeks !== 1 ? "s" : ""}`,
    actionable:  "Establece un límite diario de trades fijo. Después de una racha de 3+ victorias, mantén el mismo límite o incluso redúcelo.",
  }
}

// ── Detector 5: Session Fatigue ───────────────────────────────────────────────

function detectSessionFatigue(trades: MinimalTrade[]): DetectedPattern | null {
  if (trades.length < MIN_TRADES) return null

  const byDate = new Map<string, MinimalTrade[]>()
  for (const t of trades) {
    const arr = byDate.get(t.date) ?? []
    arr.push(t)
    byDate.set(t.date, arr)
  }

  const lateTradesArr:  MinimalTrade[] = []
  const earlyTradesArr: MinimalTrade[] = []

  for (const [, dayTrades] of byDate) {
    const sortedDay = [...dayTrades].sort((a, b) => {
      if (a.openTime && b.openTime) return a.openTime.localeCompare(b.openTime)
      return a.id.localeCompare(b.id)
    })
    sortedDay.forEach((t, idx) => {
      if (idx >= 3) lateTradesArr.push(t)
      else earlyTradesArr.push(t)
    })
  }

  if (lateTradesArr.length < 10 || earlyTradesArr.length === 0) return null

  const lateWr  = calcWinRate(lateTradesArr.filter(t => isWin({ pnl: t.pnl })).length, lateTradesArr.length)
  const earlyWr = calcWinRate(earlyTradesArr.filter(t => isWin({ pnl: t.pnl })).length, earlyTradesArr.length)
  const drop    = earlyWr - lateWr

  if (drop < 10) return null

  const confidence: DetectedPattern["confidence"] = drop >= 25 ? "high" : drop >= 15 ? "medium" : "low"
  const weeks = weekSpan(trades)

  return {
    id:          "session-fatigue",
    title:       "Fatiga de Sesión",
    description: `Tu win rate en el 4° trade en adelante del día (${lateWr.toFixed(0)}%) es ${drop.toFixed(0)} pp inferior al de los primeros 3 trades (${earlyWr.toFixed(0)}%). La fatiga cognitiva parece afectar tu ejecución.`,
    confidence,
    evidence:    `Basado en ${lateTradesArr.length} trades "tardíos" (4°+) y ${earlyTradesArr.length} trades "tempranos" (1°–3°) en ${weeks} semana${weeks !== 1 ? "s" : ""}`,
    actionable:  "Limita tus operaciones a los primeros 3 trades del día. Si alcanzas ese límite, cierra la plataforma o pasa a modo observación.",
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function detectPatterns(trades: MinimalTrade[]): DetectedPattern[] {
  const detectors = [
    detectRevengeTradingPattern,
    detectOversizingAfterLoss,
    detectFridayBias,
    detectOvertradingAfterWinStreak,
    detectSessionFatigue,
  ]

  const results: DetectedPattern[] = []
  for (const detect of detectors) {
    const pattern = detect(trades)
    if (pattern) results.push(pattern)
  }
  return results
}
