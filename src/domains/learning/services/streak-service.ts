export function computeNewStreak(
  lastReviewDate: Date | null,
  currentStreak:  number,
  today:          Date,
): { newStreak: number; lastReviewDate: Date } {
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  if (!lastReviewDate) {
    return { newStreak: 1, lastReviewDate: todayStart }
  }

  const lastStart = new Date(lastReviewDate)
  lastStart.setHours(0, 0, 0, 0)

  const yesterday = new Date(todayStart)
  yesterday.setDate(todayStart.getDate() - 1)

  const isSameDay     = lastStart.getTime() === todayStart.getTime()
  const isConsecutive = lastStart.getTime() === yesterday.getTime()

  const newStreak = isSameDay ? currentStreak : (isConsecutive ? currentStreak + 1 : 1)
  return { newStreak, lastReviewDate: todayStart }
}
