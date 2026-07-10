import { checkConsistency, phaseProgress } from "./prop-firm-guard"
import type { PhaseProgress } from "./prop-firm-guard"

export interface PropFirmExtrasInput {
  initialBalance: number
  currentEquity:  number
  peakEquity:     number
  ddTotalPct:     number | null
  ddModel:        "FIXED" | "TRAILING"
  dailyProfits:   number[]
  consistencyPct: number | null
  targetPct:      number | null
  tradingDays:    number
  minTradingDays: number | null
}

export interface PropFirmExtras {
  trailing:    { usedPct: number; limitPct: number; model: "FIXED" | "TRAILING" }
  consistency: { usedPct: number; limitPct: number } | null
  phase:       PhaseProgress
}

/** Dashboard-facing prop-firm computations that the base guard doesn't already surface. */
export function buildPropFirmExtras(i: PropFirmExtrasInput): PropFirmExtras {
  const dollarLimit = i.ddTotalPct != null ? (i.ddTotalPct / 100) * i.initialBalance : 0
  const anchor      = i.ddModel === "TRAILING" ? Math.max(i.peakEquity, i.initialBalance) : i.initialBalance
  const usedFromAnchor = dollarLimit > 0 ? Math.min(100, Math.max(0, (anchor - i.currentEquity) / dollarLimit * 100)) : 0

  const consViolation = checkConsistency(i.dailyProfits, i.consistencyPct)
  const total = i.dailyProfits.reduce((s, d) => s + d, 0)
  const bestDayPct = total > 0 ? Math.max(0, ...i.dailyProfits) / total * 100 : 0

  return {
    trailing:    { usedPct: usedFromAnchor, limitPct: i.ddTotalPct ?? 0, model: i.ddModel },
    consistency: i.consistencyPct != null
      ? { usedPct: consViolation && "currentPct" in consViolation ? consViolation.currentPct : bestDayPct, limitPct: i.consistencyPct }
      : null,
    phase: phaseProgress(i.currentEquity - i.initialBalance, i.initialBalance, i.targetPct, i.tradingDays, i.minTradingDays),
  }
}
