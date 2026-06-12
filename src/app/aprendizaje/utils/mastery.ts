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

/** Índice de etapa (0–4) para el stepper, a partir del status. */
export function masteryStageIndex(status: ResourceStatus): number {
  return Math.min(MASTERY_STAGES.length - 1, Math.round(masteryLevel(status) / MASTERY_MAX * (MASTERY_STAGES.length - 1)))
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
