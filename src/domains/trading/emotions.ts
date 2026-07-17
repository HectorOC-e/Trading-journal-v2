// The pre-trade emotional state catalog — one definition for every capture point.
//
// The values were duplicated across register-trade-modal, edit-trade-modal, the
// trades router (two hand-written z.enums), trade-write-service's input type and
// trade-form-schema — six copies that had to agree but were edited separately.
// They are persisted to trades.emotion_before and read by the psychology detectors
// (domains/analytics/services/psychology-insights.ts), so a drifted value silently
// breaks that analysis rather than failing loudly.
//
// The type is derived from the values, so adding an emotion here is the only edit
// needed: the zod enums, the union type and the chip rows all follow.

export const EMOTION_VALUES = ["calm", "anxious", "excited", "fearful", "overconfident"] as const

export type EmotionBefore = typeof EMOTION_VALUES[number]

export const EMOTION_OPTIONS: { value: EmotionBefore; label: string }[] = [
  { value: "calm",          label: "Tranquilo" },
  { value: "anxious",       label: "Ansioso" },
  { value: "excited",       label: "Eufórico" },
  { value: "fearful",       label: "Temeroso" },
  { value: "overconfident", label: "Sobreconfiado" },
]
