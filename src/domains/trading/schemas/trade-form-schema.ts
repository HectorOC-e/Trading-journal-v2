import { z } from "zod"
import { marketTimestamp, validateMarketSequence } from "@/domains/trading/historical-capture"

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

// Re-exported, not redefined: the catalog lives in domains/trading/emotions.ts
// alongside its display labels, so the form schema and the chip rows cannot drift.
// Imported as well as re-exported — `export ... from` creates no local binding and
// the schema below uses it.
import { EMOTION_VALUES } from "@/domains/trading/emotions"
export { EMOTION_VALUES }
export const SESSION_VALUES = ["London", "New York", "Asia", "London Close"] as const
export const REGIME_VALUES = ["trend", "range", "volatile"] as const

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
    // Market regime at entry (manual, v3.0 — FREEZE-D18). Optional; null = sin clasificar.
    regime: z.enum(REGIME_VALUES).nullable(),
    captureContext: z.enum(["LIVE", "HISTORICAL"]).optional(),
    marketTimeZone: z.string().optional(),
    closeDate: z.string().optional(),
    closeTime: z.string().optional(),
    pnl: z.string().optional(),
    emotionContext: z.enum(["MARKET", "PRACTICE"]).optional(),
    emotionReferenceAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.captureContext === "HISTORICAL") {
      for (const field of ["closeDate", "closeTime", "marketTimeZone"] as const) if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: "Requerido para el histórico" })
      if (!data.pnl?.trim() || !Number.isFinite(Number(data.pnl))) ctx.addIssue({ code: "custom", path: ["pnl"], message: "Indica el resultado neto total" })
      if (data.closeDate && data.closeTime && data.marketTimeZone) {
        try { validateMarketSequence(marketTimestamp(data.date, data.openTime, data.marketTimeZone), marketTimestamp(data.closeDate, data.closeTime, data.marketTimeZone)) }
        catch { ctx.addIssue({ code: "custom", path: ["closeTime"], message: "Revisa la zona y el orden de apertura y cierre" }) }
      }
    }
    if (data.emotionBefore && data.emotionContext === "PRACTICE" && !data.emotionReferenceAt) ctx.addIssue({ code: "custom", path: ["emotionReferenceAt"], message: "Indica cuándo practicaste" })
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
