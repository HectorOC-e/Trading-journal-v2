export function calcNextReviewAt(
  reviewInterval: number,
  masteryLevel:   1 | 2 | 3 | 4 | 5,
  today?:         Date,
): Date {
  let days: number
  if (masteryLevel <= 2) {
    days = Math.max(1, Math.ceil(reviewInterval / 2))
  } else if (masteryLevel >= 4) {
    days = Math.round(reviewInterval * 1.5)
  } else {
    days = reviewInterval
  }
  const date = today ? new Date(today) : new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function computeProgressPct(
  currentUnits: number,
  totalUnits:   number | null,
): number | null {
  if (!totalUnits || totalUnits === 0) return null
  return Math.min(100, Math.round((currentUnits / totalUnits) * 100))
}

export function computeResourceStatus(
  currentUnits: number,
  totalUnits:   number | null,
): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  if (!totalUnits || totalUnits === 0) return currentUnits > 0 ? "IN_PROGRESS" : "PENDING"
  if (currentUnits >= totalUnits) return "COMPLETED"
  if (currentUnits > 0) return "IN_PROGRESS"
  return "PENDING"
}
