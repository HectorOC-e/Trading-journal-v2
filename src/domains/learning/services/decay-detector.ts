const DAY_MS = 86_400_000

export type ResourceForDecay = {
  id:             string
  status:         string
  nextReviewAt:   Date | null
  reviewInterval: number | null
}

export function detectDecayedResources(
  resources: ResourceForDecay[],
  today:     Date,
): string[] {
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  return resources
    .filter(r =>
      r.status === "MASTERED" &&
      r.nextReviewAt !== null &&
      (todayStart.getTime() - r.nextReviewAt.getTime()) > (r.reviewInterval ?? 7) * 2 * DAY_MS
    )
    .map(r => r.id)
}
