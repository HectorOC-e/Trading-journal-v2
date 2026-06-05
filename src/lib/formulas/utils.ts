/**
 * Date/Time Utility Formulas
 */

/**
 * ISO 8601–correct week grouping key: "YYYY-WNN".
 * The week containing the first Thursday of the year is week 1.
 * Correct for boundary years (e.g. 2024-12-30 → "2025-W01").
 * Uses UTC to avoid timezone drift when server runs in non-local zone.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Shift to nearest Thursday (Mon=0 … Sun=6)
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const jan4    = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const weekNum = 1 + Math.round(
    ((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7,
  )
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`
}
