import type { ResourceType } from "@/types"

export const TYPE_COLORS: Record<ResourceType, string> = {
  LIBRO:       "#f59e0b",
  VIDEO:       "#ef4444",
  NOTA:        "#4f6ef7",
  BACKTEST:    "#22c55e",
  PODCAST:     "#a855f7",
  DRILL:       "#14b8a6",
  HERRAMIENTA: "#6b7280",
}

export const MASTERY_LABELS: Record<number, string> = {
  1: "Confundido",
  2: "Parcial",
  3: "Entiendo",
  4: "Fluido",
  5: "Dominado",
}

export function calcPreviewNextReview(reviewInterval: number | null | undefined, masteryLevel: number): string {
  const interval = reviewInterval ?? 7
  let days: number
  if (masteryLevel <= 2) {
    days = Math.max(1, Math.ceil(interval / 2))
  } else if (masteryLevel >= 4) {
    days = Math.round(interval * 1.5)
  } else {
    days = interval
  }
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

export function fmtRelativeTime(isoDate: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 7)  return `hace ${diffDays}d`
  const weeks = Math.floor(diffDays / 7)
  if (weeks < 5) return `hace ${weeks} sem`
  return `hace ${Math.floor(diffDays / 30)} mes`
}

export interface RevisarState {
  learned:        string
  howToApply:     string
  insights:       string
  rating:         number
  markDone:       boolean
  linkedReviewId: string
  masteryLevel:   number
  quickNote:      string
}

export function emptyRevisarState(): RevisarState {
  return { learned: "", howToApply: "", insights: "", rating: 0, markDone: false, linkedReviewId: "", masteryLevel: 3, quickNote: "" }
}
