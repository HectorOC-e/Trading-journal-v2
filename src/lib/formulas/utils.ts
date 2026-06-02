/**
 * Date/Time Utility Formulas
 */

/**
 * ISO 8601–correct week grouping key: "YYYY-WNN".
 * The week containing the first Thursday of the year is week 1.
 * Correct for boundary years (e.g. 2024-12-30 → "2025-W01").
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  // Shift to nearest Thursday (Mon=0 … Sun=6)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4    = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(
    ((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
  )
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`
}
