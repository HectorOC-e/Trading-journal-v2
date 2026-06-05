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
