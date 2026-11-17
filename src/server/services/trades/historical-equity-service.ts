import type { PrismaClient } from "@/lib/generated/prisma/client"
import { withdrawalAccountAmount } from "@/server/services/accounts/cash-adjustments"

type Realization = { pnl: number; timestamp: Date | null }
type CashMovement = { amount: number; timestamp: Date | null }

/** Unknown closing/payment times cannot certify a capital base. Future known
 * gains and movements are excluded, including those on the same market day. */
export function historicalEquityAt(initialBalance: number, asOf: Date, realizations: Realization[], cash: CashMovement[]): number | null {
  if (!(initialBalance > 0) || !Number.isFinite(initialBalance) || !Number.isFinite(asOf.getTime())) return null
  if (realizations.some(row => row.pnl !== 0 && row.timestamp == null) || cash.some(row => row.amount !== 0 && row.timestamp == null)) return null
  const balance = initialBalance
    + realizations.filter(row => row.timestamp != null && row.timestamp < asOf).reduce((sum, row) => sum + row.pnl, 0)
    + cash.filter(row => row.timestamp != null && row.timestamp < asOf).reduce((sum, row) => sum + row.amount, 0)
  return Number.isFinite(balance) && balance > 0 ? balance : null
}

export function periodEquityBalances(accounts: { id: string; initialBalance: number }[], history: { accountId: string; date: string; pnl: number }[], from?: string) {
  return accounts.map(account => ({
    ...account,
    initialBalance: account.initialBalance + (from ? history.filter(row => row.accountId === account.id && row.date < from).reduce((sum, row) => sum + row.pnl, 0) : 0),
  }))
}

export async function loadHistoricalEquity(db: Pick<PrismaClient, "account" | "trade" | "withdrawal" | "accountLog">, userId: string, input: { accountId: string; asOf: Date; excludeTradeId?: string; fxRates?: Record<string, number> }): Promise<number | null> {
  const account = await db.account.findUniqueOrThrow({ where: { id: input.accountId, userId }, select: { initialBalance: true, currency: true } })
  // This loader also runs inside an interactive transaction, whose connection
  // cannot safely execute concurrent pg queries.
  const trades = await db.trade.findMany({
      where: { userId, accountId: input.accountId, status: { in: ["OPEN", "CLOSED"] }, ...(input.excludeTradeId ? { id: { not: input.excludeTradeId } } : {}) },
      select: { pnl: true, status: true, marketClosedAt: true, events: { where: { realizedPnl: { not: null } }, select: { realizedPnl: true, timestamp: true } } },
    })
  const withdrawals = await db.withdrawal.findMany({ where: { userId, accountId: input.accountId }, select: { id: true, amount: true, currency: true, status: true } })
  const logs = await db.accountLog.findMany({ where: { userId, accountId: input.accountId, event: { in: ["BALANCE_CORRECTION", "WITHDRAWAL_STATUS"] } }, select: { event: true, payload: true, createdAt: true }, orderBy: { createdAt: "asc" } })
  const realizations: Realization[] = trades.flatMap(trade => {
    const parts = trade.events.map(event => ({ pnl: Number(event.realizedPnl), timestamp: event.timestamp }))
    const remainder = Math.round((Number(trade.pnl ?? 0) - parts.reduce((sum, row) => sum + row.pnl, 0)) * 100) / 100
    return [...parts, ...(remainder !== 0 ? [{ pnl: remainder, timestamp: trade.status === "CLOSED" ? trade.marketClosedAt : null }] : [])]
  })
  const cash: CashMovement[] = []
  const paymentChanges = new Map<string, { paid: boolean; timestamp: Date }[]>()
  for (const log of logs) {
    const payload = log.payload as { variance?: unknown; withdrawalId?: string; status?: string } | null
    if (log.event === "BALANCE_CORRECTION") {
      if (typeof payload?.variance !== "number" || !Number.isFinite(payload.variance)) return null
      cash.push({ amount: payload.variance, timestamp: log.createdAt })
    } else if (payload?.withdrawalId) {
      const changes = paymentChanges.get(payload.withdrawalId) ?? []
      changes.push({ paid: payload.status === "PAGADO", timestamp: log.createdAt })
      paymentChanges.set(payload.withdrawalId, changes)
    }
  }
  for (const withdrawal of withdrawals) {
    const changes = paymentChanges.get(withdrawal.id) ?? []
    if (!changes.length && withdrawal.status === "PAGADO") return null
    let paid = false
    for (const change of changes) {
      if (change.paid !== paid && change.timestamp < input.asOf) {
        if (withdrawal.currency !== account.currency) return null
        cash.push({ amount: (change.paid ? -1 : 1) * withdrawalAccountAmount(Number(withdrawal.amount), withdrawal.currency, account.currency, input.fxRates), timestamp: change.timestamp })
      }
      paid = change.paid
    }
  }
  return historicalEquityAt(Number(account.initialBalance), input.asOf, realizations, cash)
}
