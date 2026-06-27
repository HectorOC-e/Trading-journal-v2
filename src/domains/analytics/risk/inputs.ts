// ─────────────────────────────────────────────────────────────────────────────
// DB → risk-engine input mapper (pure half). Account limits are stored in PERCENT
// units (Decimal(5,2), e.g. 5.00 = 5%); the engine works in fractions. This
// converts them and derives the usual risk-per-trade from history (median, robust
// to outliers). The prisma orchestration lives in server/services/risk. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { DrawdownModel } from "@/domains/analytics/risk/risk-of-ruin"

export interface AccountRiskConfig {
  initialBalance: number
  /** Total DD limit in PERCENT units (e.g. 10 = 10%); null = none. */
  ddTotalPct: number | null
  /** Daily DD limit in PERCENT units; null = none. */
  ddDailyPct: number | null
  /** Profit target in PERCENT units; null = none. */
  targetPct: number | null
  ddModel: DrawdownModel
}

export interface DerivedRiskInputs {
  rMultiples: number[]
  /** Median historical risk-per-trade as a fraction (e.g. 0.01). */
  riskPerTradePct: number
  /** Total DD as a fraction; null when the account has no total limit. */
  ruinThresholdPct: number | null
  /** Daily DD as a fraction; null when the account has no daily limit. */
  ddDailyPct: number | null
  /** Profit target as a fraction; null when none. */
  targetPct: number | null
  ddModel: DrawdownModel
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const pctToFraction = (p: number | null): number | null => (p === null ? null : p / 100)

/**
 * Map an account's prop config + the trader's R/risk history into engine inputs.
 * `riskPcts` are PERCENT-unit risk-per-trade values from past trades; their median
 * becomes the usual risk, falling back to `fallbackRiskPct` (percent, default 1%)
 * when no history carries risk data.
 */
export function deriveRiskInputs(
  cfg: AccountRiskConfig,
  rMultiples: number[],
  riskPcts: number[],
  opts: { fallbackRiskPct?: number } = {},
): DerivedRiskInputs {
  const medianRiskPct = median(riskPcts) ?? opts.fallbackRiskPct ?? 1
  return {
    rMultiples,
    riskPerTradePct: medianRiskPct / 100,
    ruinThresholdPct: pctToFraction(cfg.ddTotalPct),
    ddDailyPct: pctToFraction(cfg.ddDailyPct),
    targetPct: pctToFraction(cfg.targetPct),
    ddModel: cfg.ddModel,
  }
}
