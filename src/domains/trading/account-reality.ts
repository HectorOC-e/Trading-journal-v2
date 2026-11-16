// Compatibility adapter for callers being migrated to operational-mode.
// Unknown provenance is excluded; behaviour is scoped just like performance.
import { classifyAccountType } from "./operational-mode"

export type AccountReality = "real" | "practice" | "unclassified"

/** Account types whose money is not real (demo / backtest / internal QA). */

/**
 * True when the account type holds unreal money (demo, backtest, QA).
 * `PERSONAL` and `PROP_FIRM` are real — a prop evaluation/funded account has real
 * consequences and real payouts.
 */
export function isPracticeType(type?: string | null): boolean {
  const mode = classifyAccountType(type)
  return mode === "DEMO" || mode === "BACKTEST" || mode === "INTERNAL"
}

/** Map an account type to its reality class. */
export function accountReality(type?: string | null): AccountReality {
  const mode = classifyAccountType(type)
  return mode === "REAL" ? "real" : mode == null ? "unclassified" : "practice"
}
