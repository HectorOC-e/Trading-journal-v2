function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function computeNewStreak(
  lastReviewDate: Date | null,
  currentStreak:  number,
  today:          Date,
): { newStreak: number; lastReviewDate: Date } {
  const todayStart = utcMidnight(today)

  if (!lastReviewDate) {
    return { newStreak: 1, lastReviewDate: todayStart }
  }

  const lastStart = utcMidnight(lastReviewDate)

  const yesterday = new Date(todayStart)
  yesterday.setUTCDate(todayStart.getUTCDate() - 1)

  const isSameDay     = lastStart.getTime() === todayStart.getTime()
  const isConsecutive = lastStart.getTime() === yesterday.getTime()

  const newStreak = isSameDay ? currentStreak : (isConsecutive ? currentStreak + 1 : 1)
  return { newStreak, lastReviewDate: todayStart }
}

/**
 * A streak is "at risk" when the user has a live streak whose last review was
 * *yesterday* (local) and they haven't reviewed *today* yet — i.e. it breaks at
 * midnight unless they study. If the last review was today, it's safe; if it was
 * before yesterday, the streak is already broken (not "at risk").
 *
 * `todayLocalISO` is the user's local date as "YYYY-MM-DD".
 */
export function isStreakAtRisk(
  lastReviewDate: Date | null,
  currentStreak:  number,
  todayLocalISO:  string,
): boolean {
  if (currentStreak <= 0 || !lastReviewDate) return false
  const lastISO = lastReviewDate.toISOString().slice(0, 10)
  if (lastISO === todayLocalISO) return false // already reviewed today

  const today     = new Date(`${todayLocalISO}T00:00:00Z`)
  const yesterday = new Date(today)
  yesterday.setUTCDate(today.getUTCDate() - 1)
  return lastISO === yesterday.toISOString().slice(0, 10)
}
