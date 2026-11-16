import { z } from "zod"

export const OPERATIONAL_MODES = ["REAL", "DEMO", "BACKTEST"] as const
export const operationalModeSchema = z.enum(OPERATIONAL_MODES)
export type OperationalMode = z.infer<typeof operationalModeSchema>
export type StoredOperationalMode = OperationalMode | "INTERNAL"
export type ScopedWindow = {
  mode: OperationalMode
  from?: string
  to?: string
  accountId?: string
  includeArchived: boolean
}

const ACCOUNT_MODES: Readonly<Record<string, StoredOperationalMode>> = {
  PERSONAL: "REAL", PROP_FIRM: "REAL",
  DEMO_PERSONAL: "DEMO", DEMO_PROP: "DEMO",
  BACKTEST: "BACKTEST", QA: "INTERNAL",
}

/** Unknown provenance is deliberately excluded, never inferred as real money. */
export function classifyAccountType(type: string | null | undefined): StoredOperationalMode | null {
  return type && Object.hasOwn(ACCOUNT_MODES, type) ? ACCOUNT_MODES[type] : null
}

export function accountTypesForMode(mode: OperationalMode): string[] {
  return Object.entries(ACCOUNT_MODES).filter(([, value]) => value === mode).map(([key]) => key)
}

export const MODE_LABELS: Record<OperationalMode, string> = {
  REAL: "Real", DEMO: "Demo", BACKTEST: "Backtesting",
}

/** Retained only to tell an old client to refresh instead of enabling a mix. */
export const legacyPracticeInput = z.boolean().optional().refine(value => value !== true, {
  message: "Actualiza la página y selecciona Real, Demo o Backtesting por separado.",
})
