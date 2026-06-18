import { z } from "zod"

/**
 * Client-side validation schema for the trade forms. Mirrors the server
 * `trades.create` contract but operates on the raw string values the form
 * holds, so it can surface precise, per-field Spanish messages BEFORE the
 * request leaves the browser. The server schema stays as defence in depth.
 */

/** A text field that must parse to a finite number (matches the app's parseFloat usage). */
const requiredNumber = (opts?: { positive?: boolean }) => {
  let s = z
    .string()
    .trim()
    .min(1, "Requerido")
    .refine((v) => !Number.isNaN(parseFloat(v)), "Número inválido")
  if (opts?.positive) {
    s = s.refine((v) => parseFloat(v) > 0, "Debe ser mayor a 0")
  }
  return s
}

export const EMOTION_VALUES = ["calm", "anxious", "excited", "fearful", "overconfident"] as const
export const SESSION_VALUES = ["London", "New York", "Asia", "London Close"] as const

export const tradeFormSchema = z
  .object({
    direction: z.enum(["LONG", "SHORT"]),
    symbol: z.string().min(1, "Selecciona un símbolo"),
    accountId: z.string().min(1, "Selecciona una cuenta"),
    setupId: z.string(),
    entry: requiredNumber(),
    stop: requiredNumber(),
    target: requiredNumber(),
    size: requiredNumber({ positive: true }),
    riskPct: z.string(),
    date: z.string().min(1, "Indica la fecha"),
    openTime: z.string().min(1, "Indica la hora de apertura"),
    session: z.enum(SESSION_VALUES),
    tags: z.array(z.string()),
    notes: z.string(),
    planNotes: z.string(),
    checklistItems: z.record(z.string(), z.boolean()),
    screenshots: z.array(z.string()),
    emotionBefore: z.enum(EMOTION_VALUES).nullable(),
    confidenceRating: z.number().int().min(1).max(5).nullable(),
    executionQuality: z.number().int().min(1).max(5).nullable(),
    fomoFlag: z.boolean(),
    revengeFlag: z.boolean(),
  })
  // Stop equal to entry yields a zero-distance risk → the size calculator can't
  // run and the trade is nonsensical. Flag it on the stop field.
  .refine((d) => parseFloat(d.entry) !== parseFloat(d.stop), {
    path: ["stop"],
    message: "El stop no puede ser igual al entry",
  })

export type TradeFormValues = z.infer<typeof tradeFormSchema>

/** Editing only ever touches prices; validate just those four fields. */
export const tradeEditSchema = z.object({
  entry: requiredNumber(),
  stop: requiredNumber(),
  target: requiredNumber(),
  size: requiredNumber({ positive: true }),
})

export type TradeEditValues = z.infer<typeof tradeEditSchema>
