// ── Leverage / margin math ───────────────────────────────────────────────────
// Pure, instrument-aware helpers used by the trade modal to show notional
// exposure, required margin, free margin and an effective-leverage health band.
//
// Effective leverage = notional / account balance (how much market exposure each
// $1 of equity controls). A "good leverage" band is judged against a per-account
// target the user configures.

export type MarketCategory = "FUTUROS" | "FX" | "CRIPTO" | "EQUITIES"

/** Standard FX lot size (units of base currency). */
const FX_LOT_UNITS = 100_000

/**
 * Notional (market value) controlled by the position.
 * - FUTUROS / EQUITIES / CRIPTO: pointValue is the per-unit price multiplier, so
 *   notional = pointValue × price × contracts (NQ: $20 × price × contracts;
 *   equities: $1 × price × shares; crypto: 1 × price × units).
 * - FX: one standard lot controls 100k units of base currency →
 *   notional ≈ lots × 100k × price (approximate; exact value is pair-specific).
 */
export function computeNotional(params: {
  category: MarketCategory | string
  pointValue: number
  price: number
  contracts: number
}): number | null {
  const { category, pointValue, price, contracts } = params
  if (!price || !contracts || price <= 0 || contracts <= 0) return null
  if (category === "FX") return contracts * FX_LOT_UNITS * price
  if (!pointValue || pointValue <= 0) return null
  return pointValue * price * contracts
}

export interface LeverageMetrics {
  notional: number
  /** notional / balance — exposure per $1 of equity. null if balance ≤ 0. */
  effectiveLeverage: number | null
  /** notional / accountMaxLeverage — capital the broker locks. null if no max set. */
  marginRequired: number | null
  /** balance − marginRequired. null if marginRequired is null. */
  freeMargin: number | null
  /** true when the required margin can't be covered by the balance. */
  exceedsAccount: boolean
}

export function computeLeverageMetrics(params: {
  notional: number
  balance: number
  /** Account/broker max leverage, e.g. 30 for 1:30. Optional. */
  maxLeverage?: number | null
}): LeverageMetrics {
  const { notional, balance, maxLeverage } = params
  const effectiveLeverage = balance > 0 ? notional / balance : null
  const marginRequired = maxLeverage && maxLeverage > 0 ? notional / maxLeverage : null
  const freeMargin = marginRequired != null ? balance - marginRequired : null
  const exceedsAccount = marginRequired != null && marginRequired > balance
  return { notional, effectiveLeverage, marginRequired, freeMargin, exceedsAccount }
}

export type LeverageBand = "good" | "warn" | "high"

/**
 * Health band for the effective leverage against a per-account target.
 * - good: ≤ target
 * - warn: ≤ 2× target
 * - high: above that
 * Falls back to a conservative target of 5x when none is configured.
 */
export function leverageBand(effectiveLeverage: number | null, targetLeverage?: number | null): LeverageBand | null {
  if (effectiveLeverage == null) return null
  const target = targetLeverage && targetLeverage > 0 ? targetLeverage : 5
  if (effectiveLeverage <= target) return "good"
  if (effectiveLeverage <= target * 2) return "warn"
  return "high"
}

export const LEVERAGE_BAND_META: Record<LeverageBand, { label: string; color: string; soft: string }> = {
  good: { label: "Sano",  color: "var(--win)",  soft: "var(--win-soft)" },
  warn: { label: "Alto",  color: "var(--be)",   soft: "var(--be-soft)" },
  high: { label: "Excesivo", color: "var(--loss)", soft: "var(--loss-soft)" },
}
