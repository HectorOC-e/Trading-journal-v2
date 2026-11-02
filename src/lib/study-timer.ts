export interface StudyTimer {
  sessionId: string
  runStartMs: number
  accumSec: number
  note: string
  markForReview: boolean
  paused: boolean
}

/** Restore only a valid snapshot for the active server session. */
export function restoreStudyTimer(saved: string | null, sessionId: string, startedAtMs: number): StudyTimer {
  try {
    const state = JSON.parse(saved ?? "null") as StudyTimer | null
    if (state?.sessionId === sessionId && typeof state.paused === "boolean" &&
      Number.isFinite(state.runStartMs) && state.runStartMs >= startedAtMs &&
      Number.isFinite(state.accumSec) && state.accumSec >= 0) return {
        ...state,
        note: typeof state.note === "string" ? state.note.slice(0, 2000) : "",
        markForReview: state.markForReview === true,
      }
  } catch { /* Storage is optional. Resume from the server's start timestamp. */ }
  return { sessionId, runStartMs: startedAtMs, accumSec: 0, paused: false, note: "", markForReview: false }
}

export function elapsedStudySeconds(timer: StudyTimer, nowMs: number): number {
  return timer.accumSec + (timer.paused ? 0 : Math.max(0, Math.floor((nowMs - timer.runStartMs) / 1000)))
}

export function toggleStudyPause(timer: StudyTimer, nowMs: number): StudyTimer {
  return timer.paused
    ? { ...timer, paused: false, runStartMs: nowMs }
    : { ...timer, paused: true, accumSec: elapsedStudySeconds(timer, nowMs) }
}
