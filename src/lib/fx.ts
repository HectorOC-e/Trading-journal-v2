// Currency normalization for portfolio-wide views (dashboard).
//
// Accounts can be in different currencies; the dashboard shows everything in the
// user's base currency. We convert via a static table of "value of 1 unit in USD".
//
// NOTE: rates are static/approximate. Future: make user-configurable or source a
// live rate. Percent-based limits (drawdown) are unaffected — converting both the
// loss and the balance by the same factor leaves the ratio unchanged.

/** Default value of 1 unit of each currency expressed in USD. */
export const USD_VALUE: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CHF: 1.12,
  CAD: 0.73,
  AUD: 0.66,
  JPY: 0.0067,
  MXN: 0.058,
}

/** Currencies a user can override in Perfil (USD is always 1, not editable). */
export const SUPPORTED_CURRENCIES = Object.keys(USD_VALUE)

/** USD is the reference: always 1, never overridable. */
function usdValue(cur: string, overrides?: Record<string, number> | null): number {
  if (cur === "USD") return 1
  const o = overrides?.[cur]
  if (typeof o === "number" && o > 0) return o
  return USD_VALUE[cur] ?? 1
}

/**
 * Multiplicative factor to convert an amount in `from` currency into `base`.
 * `rates` (optional) is a per-user override map of { CURRENCY: usdValue } that
 * takes precedence over the static defaults.
 */
export function fxFactor(from: string, base: string, rates?: Record<string, number> | null): number {
  if (from === base) return 1
  return usdValue(from, rates) / usdValue(base, rates)
}

/** Convert `amount` from one currency into the base currency. */
export function convertToBase(amount: number, from: string, base: string, rates?: Record<string, number> | null): number {
  return amount * fxFactor(from, base, rates)
}

/**
 * Parse the user's stored FX overrides (a JSON string column). Returns a clean
 * map of positive numbers keyed by upper-cased 3-letter codes; tolerant of
 * malformed/empty input (returns {}).
 */
export function parseFxRates(raw: unknown): Record<string, number> {
  if (raw == null) return {}
  let obj: unknown = raw
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw || "{}") } catch { return {} }
  }
  if (typeof obj !== "object" || obj === null) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const cur = k.trim().toUpperCase()
    if (/^[A-Z]{3}$/.test(cur) && typeof v === "number" && isFinite(v) && v > 0) out[cur] = v
  }
  return out
}
