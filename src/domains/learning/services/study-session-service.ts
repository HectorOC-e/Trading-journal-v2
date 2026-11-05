// Aprendizaje SP1 — pure helpers for study-session side-effects.
// Kept free of Prisma so they're trivially testable; the tRPC layer wires the DB.
import { computeProgressPct, computeResourceStatus } from "./review-scheduler"
import { addDaysISO, localDateISO, weekStartISO } from "@/lib/datetime/local"

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

/** Legacy planned completions kept the scheduled timestamp. Their end time is
 * the authoritative study instant; focus sessions continue to use their start.
 */
export function effectiveStudyStartedAt(session: {
  startedAt: Date
  status: string
  source: string
  plannedMin: number | null
  endedAt: Date | null
}): Date {
  return (session.status === "completed" || session.status === "voided") && session.source === "manual" && session.plannedMin != null && session.endedAt
    ? session.endedAt
    : session.startedAt
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

/**
 * Study-day streak: consecutive days (ending today, or yesterday if today has no
 * session yet) that contain at least one study session. Today without a session
 * does NOT break the streak — it just hasn't been extended yet.
 */
export function studyStreak(sessionDates: Date[], now: Date, timezone = "UTC"): number {
  const days = new Set(sessionDates.filter(d => d <= now).map(d => localDateISO(d, timezone)))
  let cursor = localDateISO(now, timezone)
  if (!days.has(cursor)) cursor = addDaysISO(cursor, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDaysISO(cursor, -1)
  }
  return streak
}

/** Minutes studied this local calendar week (Mon–Sun), excluding future entries. */
export function minutesThisWeek(sessions: { startedAt: Date; durationMin: number | null }[], now: Date, timezone = "UTC"): number {
  const start = weekStartISO(localDateISO(now, timezone))
  return sessions
    .filter(s => s.startedAt <= now && localDateISO(s.startedAt, timezone) >= start && (s.durationMin ?? 0) > 0)
    .reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
}

/** Shared UI/email metrics, using the actual completion instant of legacy plans. */
export function completedStudyStats(rawSessions: (Parameters<typeof effectiveStudyStartedAt>[0] & { durationMin: number | null })[], now: Date, timezone = "UTC") {
  const sessions = rawSessions.filter(s => s.status === "completed" && (s.durationMin ?? 0) > 0)
    .map(s => ({ ...s, startedAt: effectiveStudyStartedAt(s), durationMin: s.durationMin ?? null }))
  const sessionDates = sessions.map(s => s.startedAt).filter(d => d <= now)
  const days = [...new Set(sessionDates.map(d => localDateISO(d, timezone)))].sort()
  let bestStreak = 0, run = 0, previousDay = Number.NEGATIVE_INFINITY
  for (const day of days) {
    const dayNumber = Date.parse(`${day}T00:00:00Z`) / 86_400_000
    run = dayNumber === previousDay + 1 ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previousDay = dayNumber
  }
  return { minutesThisWeek: minutesThisWeek(sessions, now, timezone), currentStreak: studyStreak(sessionDates, now, timezone), bestStreak, lastStudyDay: days.at(-1) ?? null }
}

export function startOfWeekUTC(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}

// ── SP2: Hoy coach suggestion (server-side heuristic, no LLM cost) ─────────────

export type StudySuggestionKind = "overdue_review" | "weakness" | "goal_gap" | "streak"

export interface StudySuggestion {
  kind: StudySuggestionKind
  title: string         // short headline
  reason: string        // one-line rationale
  resourceId: string | null
  coachPrompt: string   // pre-fills the coach chat when the user clicks through
}

export interface SuggestionInput {
  overdueReviews: { id: string; title: string }[]
  /** Weakest setup that has a linked, not-yet-mastered resource to study. */
  weakness: { setup: string; winRate: number; resource: { id: string; title: string } } | null
  weekMinutes: number
  goalMinutes: number
  streak: number
}

/**
 * Pick the single most useful study nudge for the Hoy tab. Priority:
 * overdue reviews → weakness→resource → weekly-goal gap → streak nudge → null.
 * Pure + deterministic so it's free to compute on every page load.
 */
export function pickStudySuggestion(input: SuggestionInput): StudySuggestion | null {
  const { overdueReviews, weakness, weekMinutes, goalMinutes, streak } = input

  if (overdueReviews.length > 0) {
    const first = overdueReviews[0]
    const extra = overdueReviews.length - 1
    return {
      kind: "overdue_review",
      title: extra > 0 ? `${overdueReviews.length} repasos pendientes` : `Repaso pendiente: ${first.title}`,
      reason: extra > 0
        ? `Tienes ${overdueReviews.length} recursos esperando repaso. Empieza por "${first.title}".`
        : `"${first.title}" está pendiente de repaso. Un repaso corto consolida lo aprendido.`,
      resourceId: first.id,
      coachPrompt: `¿Cómo debería enfocar el repaso de "${first.title}" hoy?`,
    }
  }

  if (weakness) {
    return {
      kind: "weakness",
      title: `Refuerza: ${weakness.resource.title}`,
      reason: `Tu setup "${weakness.setup}" rinde ${weakness.winRate}% WR. "${weakness.resource.title}" está vinculado y puede ayudarte.`,
      resourceId: weakness.resource.id,
      coachPrompt: `Mi setup "${weakness.setup}" va flojo (${weakness.winRate}% WR). ¿Qué debería estudiar de "${weakness.resource.title}" para mejorarlo?`,
    }
  }

  if (goalMinutes > 0 && weekMinutes < goalMinutes) {
    const left = goalMinutes - weekMinutes
    return {
      kind: "goal_gap",
      title: `Te faltan ${left} min esta semana`,
      reason: `Llevas ${weekMinutes}/${goalMinutes} min de estudio. Una sesión de foco te acerca a la meta.`,
      resourceId: null,
      coachPrompt: `Me faltan ${left} minutos para mi meta de estudio semanal. ¿Qué me recomiendas estudiar ahora?`,
    }
  }

  if (streak === 0) {
    return {
      kind: "streak",
      title: "Retoma tu racha",
      reason: "No has estudiado en los últimos días. Una sesión corta reinicia el hábito.",
      resourceId: null,
      coachPrompt: "Quiero retomar el hábito de estudio. ¿Por dónde empiezo según mis trades?",
    }
  }

  return null
}
