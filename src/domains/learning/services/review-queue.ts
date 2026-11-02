/** Review dates are calendar days (@db.Date), never timezone-adjusted instants. */
export function isResourceReviewDue(
  resource: { status: string; markedForReview?: boolean; nextReviewAt?: string | Date | null },
  todayISO: string,
): boolean {
  if (resource.status === "ABANDONED" || resource.status === "ARCHIVED") return false
  if (resource.markedForReview) return true
  if (resource.status === "MASTERED" || !resource.nextReviewAt) return false
  const day = resource.nextReviewAt instanceof Date
    ? resource.nextReviewAt.toISOString().slice(0, 10)
    : resource.nextReviewAt.slice(0, 10)
  return day <= todayISO
}
