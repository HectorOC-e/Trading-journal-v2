// buildLearningDigest — PURE. Takes already-fetched per-user data and produces the
// view model the daily Aprendizaje email renders from. No IO, no Prisma, no clock:
// the caller passes `todayLocalISO` (the user's local date) so this is deterministic
// and trivially testable. See spec §6.

import { isStreakAtRisk } from "./streak-service"

export type ReviewKind = "overdue" | "decay" | "today"

/** Max review rows shown in the email. */
export const MAX_REVIEWS = 5

export interface DigestInput {
  name: string
  todayLocalISO: string // "YYYY-MM-DD" in the user's timezone
  streak: { current: number; best: number; lastReviewDate: Date | null }
  /** Resources due/overdue (active) and decayed (mastered). Merged + deduped here. */
  needsReview: { id: string; title: string; nextReviewAt: Date; isDecay: boolean }[]
  progress: { minutesThisWeek: number; goalMinutes: number }
  plannedSession?: { title: string } | null
}

export interface DigestReview {
  id: string
  title: string
  kind: ReviewKind
  overdueDays: number
}

export interface DigestModel {
  isEmpty: boolean
  greetingName: string
  dateLabel: string
  streak: { current: number; best: number; atRisk: boolean }
  reviews: DigestReview[]
  reviewCount: number
  progress: { minutesThisWeek: number; goalMinutes: number; pct: number }
  plannedSession: { title: string } | null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Whole-day difference a − b (both "YYYY-MM-DD"); positive when a is later. */
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`)
  const b = Date.parse(`${bISO}T00:00:00Z`)
  return Math.round((a - b) / 86_400_000)
}

function formatDateLabel(todayLocalISO: string): string {
  // Construct at UTC noon so the date never drifts across the day boundary.
  const d = new Date(`${todayLocalISO}T12:00:00Z`)
  try {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
    }).format(d)
  } catch {
    return todayLocalISO
  }
}

export function buildLearningDigest(input: DigestInput): DigestModel {
  const { todayLocalISO } = input

  // Merge + dedupe reviews by resource id (an overdue active review wins over a
  // decay flag for the same resource), classify, sort by most overdue, cap.
  const byId = new Map<string, DigestReview>()
  for (const r of input.needsReview) {
    const overdueDays = daysBetween(todayLocalISO, isoDate(r.nextReviewAt))
    if (overdueDays < 0) continue // not due yet — ignore
    const kind: ReviewKind = overdueDays === 0 ? "today" : r.isDecay ? "decay" : "overdue"
    const existing = byId.get(r.id)
    if (!existing || overdueDays > existing.overdueDays) {
      byId.set(r.id, { id: r.id, title: r.title, kind, overdueDays })
    }
  }
  const reviews = [...byId.values()]
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, MAX_REVIEWS)
  const reviewCount = byId.size

  const atRisk = isStreakAtRisk(input.streak.lastReviewDate, input.streak.current, todayLocalISO)

  const goal = input.progress.goalMinutes
  const pct = goal > 0
    ? Math.min(100, Math.max(0, Math.round((input.progress.minutesThisWeek / goal) * 100)))
    : 0

  const plannedSession = input.plannedSession ?? null

  // Skip-if-empty: a daily email only goes out if there's something to act on.
  // Progress alone is not enough (avoids "you're all caught up" daily spam).
  const isEmpty = reviewCount === 0 && !atRisk && !plannedSession

  return {
    isEmpty,
    greetingName: input.name,
    dateLabel: formatDateLabel(todayLocalISO),
    streak: { current: input.streak.current, best: input.streak.best, atRisk },
    reviews,
    reviewCount,
    progress: { minutesThisWeek: input.progress.minutesThisWeek, goalMinutes: goal, pct },
    plannedSession,
  }
}
