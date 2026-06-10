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
  /** Compact notation for headline figures (e.g. "$100K", "$1.2M"). */
  compact?: boolean
}

export function formatMoney(value: number, opts: FormatMoneyOptions = {}): string {
  const {
    currency = "USD",
    signed = false,
    decimals,
    compact = false,
    minimumFractionDigits = decimals ?? 0,
    maximumFractionDigits = decimals ?? 2,
  } = opts

  const fmt = (cur: string): Intl.NumberFormatOptions => ({
    style: "currency",
    currency: cur,
    signDisplay: signed ? "exceptZero" : "auto",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits, maximumFractionDigits }),
  })

  try {
    return new Intl.NumberFormat(undefined, fmt(currency || "USD")).format(value)
  } catch {
    // Invalid/empty ISO code → fall back to USD so display never crashes.
    return new Intl.NumberFormat(undefined, fmt("USD")).format(value)
  }
}
