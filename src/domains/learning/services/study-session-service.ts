// Aprendizaje SP1 — pure helpers for study-session side-effects.
// Kept free of Prisma so they're trivially testable; the tRPC layer wires the DB.
import { computeProgressPct, computeResourceStatus } from "./review-scheduler"

export interface ResourceProgressLite {
  progressType: string | null
  currentUnits: number | null
  totalUnits: number | null
}

export interface ResourceProgressUpdate {
  currentUnits: number
  progressPct: number | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
}

/**
 * Progress update after a completed focus session.
 *  · minutes  → add the studied minutes to currentUnits
 *  · sessions → +1 session
 *  · pages / manual / null → time is logged but units don't change (returns null)
 */
export function applyStudyFinish(
  resource: ResourceProgressLite,
  durationMin: number,
): ResourceProgressUpdate | null {
  const add =
    resource.progressType === "minutes" ? Math.max(0, Math.round(durationMin)) :
    resource.progressType === "sessions" ? 1 :
    null
  if (add == null) return null

  const next = (resource.currentUnits ?? 0) + add
  return {
    currentUnits: next,
    progressPct: computeProgressPct(next, resource.totalUnits),
    status: computeResourceStatus(next, resource.totalUnits),
  }
}

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

/**
 * Study-day streak: consecutive days (ending today, or yesterday if today has no
 * session yet) that contain at least one study session. Today without a session
 * does NOT break the streak — it just hasn't been extended yet.
 */
export function studyStreak(sessionDates: Date[], now: Date): number {
  const days = new Set(sessionDates.map(utcDayKey))
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (!days.has(utcDayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let streak = 0
  while (days.has(utcDayKey(cursor))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

/** Minutes studied within the current calendar week (Mon–Sun, UTC). */
export function minutesThisWeek(sessions: { startedAt: Date; durationMin: number | null }[], now: Date): number {
  const start = startOfWeekUTC(now)
  return sessions
    .filter(s => s.startedAt >= start && (s.durationMin ?? 0) > 0)
    .reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
}

export function startOfWeekUTC(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}
