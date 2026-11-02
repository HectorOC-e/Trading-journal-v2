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


type ReviewResource = Parameters<typeof isResourceReviewDue>[0]
export type ReviewReason = { kind: "overdue" | "today" | "manual"; label: string }

function reviewDay(resource: ReviewResource): string | undefined {
  return resource.nextReviewAt instanceof Date ? resource.nextReviewAt.toISOString().slice(0, 10) : resource.nextReviewAt?.slice(0, 10)
}

export function reviewReason(resource: ReviewResource, todayISO: string): ReviewReason | null {
  if (!isResourceReviewDue(resource, todayISO)) return null
  const day = reviewDay(resource)
  if (day && day < todayISO) {
    const days = Math.round((Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000)
    return { kind: "overdue", label: `Vencido hace ${days} ${days === 1 ? "día" : "días"}` }
  }
  if (day === todayISO) return { kind: "today", label: "Para hoy" }
  return { kind: "manual", label: "Marcado por ti" }
}

/** Array.sort is stable: equal priority preserves the caller's chosen order. */
export function compareReviewPriority(a: ReviewResource, b: ReviewResource, todayISO: string): number {
  const rank = { overdue: 0, today: 1, manual: 2 }
  const ar = reviewReason(a, todayISO), br = reviewReason(b, todayISO)
  const priority = (ar ? rank[ar.kind] : 3) - (br ? rank[br.kind] : 3)
  if (priority) return priority
  if (ar?.kind === "overdue" && br?.kind === "overdue") return (reviewDay(a) ?? "").localeCompare(reviewDay(b) ?? "")
  return 0
}
