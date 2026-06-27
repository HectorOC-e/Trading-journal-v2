// ─────────────────────────────────────────────────────────────────────────────
// Forward-looking daily-budget guard (A1, closure). The backward-looking hard
// block already exists (risk-enforcement auto-locks the account once the realized
// daily loss breaches ddDailyPct). This guard fires BEFORE the trade: if the
// trade's own risk would exceed the room left to the daily floor, block it — so
// the breach never happens. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetGuardInput {
  /** Loss room left today as a fraction of equity (RiskBudget.remainingPct). */
  remainingPct: number
  /** This trade's own risk as a fraction of equity (0 when unknown). */
  tradeRiskPct: number
  /** RiskBudget.exhausted. */
  exhausted: boolean
}

export interface BudgetGuardResult {
  level: "ok" | "approaching" | "over"
  block: boolean
  message?: string
}

// Warn when the room left is under this multiple of the trade's risk.
const APPROACHING_FACTOR = 1.5

export function evaluateBudgetGuard(input: BudgetGuardInput): BudgetGuardResult {
  const { remainingPct, tradeRiskPct, exhausted } = input

  if (exhausted) {
    return { level: "over", block: true, message: "Has agotado tu presupuesto de riesgo del día. Operar más cruzaría tu límite de pérdida diaria." }
  }

  // Unknown trade risk ⇒ can't reason forward; never a false block.
  if (tradeRiskPct <= 0) return { level: "ok", block: false }

  if (tradeRiskPct > remainingPct) {
    return { level: "over", block: true, message: "Este trade arriesga más de lo que te queda hasta tu límite de pérdida diaria. Reduce el tamaño o espera a mañana." }
  }
  if (remainingPct < APPROACHING_FACTOR * tradeRiskPct) {
    return { level: "approaching", block: false, message: "Cuidado: tras este trade casi no te queda presupuesto de riesgo para hoy." }
  }
  return { level: "ok", block: false }
}
