// Centralized money formatting (WIG locale rule: use Intl.NumberFormat, not
// hardcoded "$" + toFixed/toLocaleString). Defaults to USD so existing output is
// unchanged; pass `currency` once accounts thread their own base currency.

export interface FormatMoneyOptions {
  /** ISO 4217 code. Defaults to USD. */
  currency?: string
  /** Show an explicit "+" on positive values (negatives always show "-"). */
  signed?: boolean
  /** Force a fixed number of decimals (sets both min and max). */
  decimals?: number
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export function formatMoney(value: number, opts: FormatMoneyOptions = {}): string {
  const {
    currency = "USD",
    signed = false,
    decimals,
    minimumFractionDigits = decimals ?? 0,
    maximumFractionDigits = decimals ?? 2,
  } = opts

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits,
      maximumFractionDigits,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value)
  } catch {
    // Invalid/empty ISO code → fall back to USD so display never crashes.
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits,
      maximumFractionDigits,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value)
  }
}
