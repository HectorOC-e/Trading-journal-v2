// Dominio (mastery) — etapas de un recurso de aprendizaje, derivadas del status.
// El "dominio" se gana avanzando por el ciclo (que progresa con los repasos SRS).
// "Dominado" = última etapa.

import type { ResourceStatus } from "@/types"

export const MASTERY_STAGES = ["Nuevo", "En curso", "Completado", "En repaso", "Dominado"] as const
export type MasteryStage = (typeof MASTERY_STAGES)[number]

const STATUS_TO_LEVEL: Record<ResourceStatus, number> = {
  PENDING:     0, // Nuevo
  IN_PROGRESS: 1, // En curso
  COMPLETED:   2, // Completado
  IN_REVIEW:   3, // En repaso
  MASTERED:    5, // Dominado (nivel máximo)
  ABANDONED:   0,
}

export const MASTERY_MAX = 5

/** Nivel de dominio 0–5 a partir del status. */
export function masteryLevel(status: ResourceStatus): number {
  return STATUS_TO_LEVEL[status] ?? 0
}

/**
 * Nivel de dominio real (1–5) del SRS: usa el masteryLevel del último repaso
 * cuando existe, y cae al nivel derivado del status si el recurso nunca se ha
 * repasado. Así el anillo refleja la progresión ganada repaso a repaso, no solo
 * el status. MASTERED siempre fija el máximo.
 */
export function effectiveMasteryLevel(status: ResourceStatus, latestReviewLevel: number | null | undefined): number {
  if (status === "MASTERED") return MASTERY_MAX
  if (latestReviewLevel != null && latestReviewLevel > 0) {
    return Math.min(MASTERY_MAX, Math.max(0, latestReviewLevel))
  }
  return masteryLevel(status)
}

/** Índice de etapa (0–4) para el stepper, a partir de un nivel numérico 0–5. */
export function masteryStageIndexFromLevel(level: number): number {
  return Math.min(MASTERY_STAGES.length - 1, Math.max(0, Math.round(level / MASTERY_MAX * (MASTERY_STAGES.length - 1))))
}

/** Índice de etapa (0–4) para el stepper, a partir del status. */
export function masteryStageIndex(status: ResourceStatus): number {
  return masteryStageIndexFromLevel(masteryLevel(status))
}

/** ¿El recurso está dominado? */
export function isMastered(status: ResourceStatus): boolean {
  return status === "MASTERED"
}

/** ¿El repaso vence hoy o ya venció? (CTA "Repasar hoy"). */
export function isReviewDue(nextReviewAt: string | null | undefined): boolean {
  if (!nextReviewAt) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const r = new Date(nextReviewAt); r.setHours(0, 0, 0, 0)
  return r.getTime() <= today.getTime()
}
