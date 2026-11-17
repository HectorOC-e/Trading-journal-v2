import type { RouterOutputs } from "@/server/trpc/root"

type AccountStat = RouterOutputs["trades"]["dashboardStats"]["accountStats"][number]
export type CapitalAccount = Pick<AccountStat,"accountId" | "balance" | "status" | "availableForTrading" | "capitalKind">
export const CAPITAL_LABELS = {
  PERSONAL:"Personal disponible",
  EVALUATION:"Evaluación · nominal",
  FUNDED:"Fondeo · nominal",
  SIMULATED:"Simulado",
} as const

/** Balances arrive in the dashboard's base currency. Never add nominal or
 * simulated capital to personal availability, or unavailable accounts to either. */
export function summarizeCapital(accounts: readonly CapitalAccount[]) {
  const totals = { PERSONAL:0, EVALUATION:0, FUNDED:0, SIMULATED:0, unavailableCount:0 }
  for (const account of accounts) {
    if (!account.availableForTrading) { totals.unavailableCount++; continue }
    totals[account.capitalKind] += account.balance
  }
  return totals
}
