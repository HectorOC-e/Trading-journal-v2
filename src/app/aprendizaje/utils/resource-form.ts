import type { ResourceType } from "@/types"

export const TYPE_EMOJIS: Record<ResourceType, string> = {
  LIBRO:       "📚",
  VIDEO:       "🎬",
  NOTA:        "📝",
  BACKTEST:    "📊",
  PODCAST:     "🎙",
  DRILL:       "🏋",
  HERRAMIENTA: "🔧",
}

export const ALL_TYPES: ResourceType[] = [
  "LIBRO", "VIDEO", "NOTA", "BACKTEST", "PODCAST", "DRILL", "HERRAMIENTA",
]

export const PROGRESS_TYPES: ResourceType[] = ["LIBRO", "VIDEO", "PODCAST", "DRILL", "BACKTEST"]

export const PROGRESS_LABELS: Record<ResourceType, { current: string; total: string } | null> = {
  VIDEO:       { current: "Minutos vistos",        total: "Duración total (min)" },
  PODCAST:     { current: "Minutos escuchados",    total: "Duración total (min)" },
  LIBRO:       { current: "Página actual",         total: "Total páginas" },
  DRILL:       { current: "Sesiones completadas",  total: "Sesiones objetivo" },
  BACKTEST:    { current: "Sesiones completadas",  total: "Sesiones objetivo" },
  NOTA:        null,
  HERRAMIENTA: null,
}

export interface FormState {
  type:            ResourceType
  title:           string
  author:          string
  source:          string
  date:            string
  notes:           string
  tags:            string
  markedForReview: boolean
  totalUnits:      number | null
  currentUnits:    number | null
  reviewInterval:  number
}

export function emptyForm(): FormState {
  return {
    type:            "LIBRO",
    title:           "",
    author:          "",
    source:          "",
    date:            new Date().toISOString().slice(0, 10),
    notes:           "",
    tags:            "",
    markedForReview: false,
    totalUnits:      null,
    currentUnits:    null,
    reviewInterval:  7,
  }
}
