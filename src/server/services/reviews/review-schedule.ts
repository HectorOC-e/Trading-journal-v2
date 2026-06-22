// Pure scheduling helpers for the reviews cron. The endpoint ticks hourly and gates
// each user by their LOCAL date: weekly digests fire on Monday (covering the previous
// ISO week), monthly digests on day 1 (covering the previous calendar month).

import type { ReviewPeriod } from "@/server/services/email/send-review"

/** Local hour at which the digest is sent. */
export const REVIEWS_HOUR = 8

/** Monday of the week before `todayISO` (a Monday) → the just-finished week's start. */
export function previousWeekStart(todayISO: string): string {
  const d = new Date(todayISO + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

/** The calendar month before `todayISO` (a day-1). */
export function previousMonth(todayISO: string): { year: number; month: number } {
  const [y, mo] = todayISO.split("-").map(Number)
  let py = y, pm = mo - 1
  if (pm === 0) { pm = 12; py = y - 1 }
  return { year: py, month: pm }
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD local date. */
export function weekdayOf(todayISO: string): number {
  return new Date(todayISO + "T00:00:00Z").getUTCDay()
}

export function dayOfMonthOf(todayISO: string): number {
  return Number(todayISO.slice(8, 10))
}

/** Review periods due for a user whose local date is `todayISO` (at REVIEWS_HOUR). */
export function duePeriods(todayISO: string): ReviewPeriod[] {
  const periods: ReviewPeriod[] = []
  if (weekdayOf(todayISO) === 1) periods.push({ kind: "weekly", weekStart: previousWeekStart(todayISO) })
  if (dayOfMonthOf(todayISO) === 1) periods.push({ kind: "monthly", ...previousMonth(todayISO) })
  return periods
}
