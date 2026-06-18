import { z } from "zod"

/** Client validation for the account create/edit forms (string-valued fields). */

const ACCOUNT_TYPES = ["PROP_FIRM", "DEMO_PROP", "PERSONAL", "DEMO_PERSONAL", "BACKTEST", "QA"] as const

const positiveMoney = z
  .string()
  .min(1, "Requerido")
  .refine((v) => {
    const n = parseFloat(v.replace(/,/g, ""))
    return !Number.isNaN(n) && n > 0
  }, "El balance inicial debe ser mayor a 0")

export const accountFormSchema = z.object({
  tipo: z.enum(ACCOUNT_TYPES),
  nombre: z.string().trim().min(1, "Ponle un nombre a la cuenta"),
  broker: z.string().trim().min(1, "Indica el broker o firma prop"),
  balance: positiveMoney,
  currency: z.string(),
  timezone: z.string(),
  ddDailyPct: z.string(),
  ddWeeklyPct: z.string(),
  ddMonthlyPct: z.string(),
  ddTotalPct: z.string(),
  targetPct: z.string(),
  ddModel: z.enum(["FIXED", "TRAILING"]),
  phase: z.enum(["PHASE_1", "PHASE_2", "FUNDED", "NONE"]),
  maxTrades: z.string(),
  symbols: z.array(z.string()),
  minDays: z.string(),
  maxLeverage: z.string(),
  targetLeverage: z.string(),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>

/**
 * Edit form variant: the edit modal has no balance field (you can't change an
 * account's initial balance there), so it must NOT require balance > 0 —
 * otherwise existing accounts created with a 0 balance can never be saved.
 */
export const accountEditSchema = accountFormSchema.extend({ balance: z.string() })
