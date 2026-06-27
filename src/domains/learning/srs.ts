// ─────────────────────────────────────────────────────────────────────────────
// Performance-adapted spaced repetition (#45, SPRINT_PLAN S11). An SM-2 core
// (grade-driven intervals + ease factor) MODULATED by how the linked setup is
// actually performing: if the setup's edge is decaying you review the material
// sooner (you're losing it where it matters); if it's improving you can space it
// out. Pure, no I/O. Caller persists the resulting interval/ease.
// ─────────────────────────────────────────────────────────────────────────────

export type Grade = 0 | 1 | 2 | 3 | 4 | 5
export type PerfSignal = "decaying" | "stable" | "improving" | null

export interface SrsInput {
  /** Previous interval in days; null/0 for a brand-new card. */
  currentInterval: number | null
  /** Successful reviews so far. */
  reps: number
  /** SM-2 ease factor (≥ 1.3). */
  ease: number
  /** Recall quality 0–5; < 3 is a lapse. */
  grade: Grade
  /** Edge signal from the linked setup. */
  performance?: PerfSignal
}

export interface SrsResult {
  /** Next interval in days. */
  interval: number
  reps: number
  ease: number
  /** True when the recall failed (interval reset). */
  lapsed: boolean
}

const EASE_FLOOR = 1.3

/** SM-2 ease update for a recall grade. */
function updateEase(ease: number, grade: Grade): number {
  const next = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  return Math.max(EASE_FLOOR, next)
}

export function computeNextReview(input: SrsInput): SrsResult {
  const { currentInterval, grade } = input
  const ease = updateEase(input.ease, grade)

  if (grade < 3) {
    return { interval: 1, reps: 0, ease, lapsed: true }
  }

  const reps = input.reps + 1
  let interval: number
  if (reps === 1) interval = 1
  else if (reps === 2) interval = 6
  else interval = Math.round((currentInterval ?? 1) * ease)

  // Performance modulation (#45): the linked setup's edge bends the schedule.
  if (input.performance === "decaying") interval = Math.max(1, Math.round(interval * 0.5))
  else if (input.performance === "improving") interval = Math.round(interval * 1.2)

  return { interval, reps, ease, lapsed: false }
}
