// ─────────────────────────────────────────────────────────────────────────────
// Trade serializers (TD-018) — Prisma Decimal/Date → JSON-safe client shapes.
// Shared by the trades router and trade services. Output shape is the public
// tRPC contract (types/index.ts derives SerializedTrade from RouterOutputs).
// ─────────────────────────────────────────────────────────────────────────────
import type { Prisma } from "@/lib/generated/prisma/client"

export type RawAccount = Prisma.AccountGetPayload<Record<string, never>>
export type RawTrade   = Prisma.TradeGetPayload<{
  include: { account: true; setup: true; events: true }
}>

export function serializeAccount(a: RawAccount) {
  return {
    ...a,
    initialBalance: Number(a.initialBalance),
    // Embedded (per-trade) account: realized P&L isn't aggregated here, so the
    // current balance falls back to initial. The field exists to keep the shape
    // aligned with accounts.list (the canonical source for sizing).
    currentBalance: Number(a.initialBalance),
    ddDailyPct:     a.ddDailyPct  != null ? Number(a.ddDailyPct)  : null,
    ddWeeklyPct:    a.ddWeeklyPct != null ? Number(a.ddWeeklyPct) : null,
    ddMonthlyPct:   a.ddMonthlyPct!= null ? Number(a.ddMonthlyPct): null,
    ddTotalPct:     a.ddTotalPct  != null ? Number(a.ddTotalPct)  : null,
    targetPct:      a.targetPct   != null ? Number(a.targetPct)   : null,
    consistencyPct: a.consistencyPct != null ? Number(a.consistencyPct) : null,
    lastSyncedBalance: a.lastSyncedBalance != null ? Number(a.lastSyncedBalance) : null,
    lastSyncedAt:      a.lastSyncedAt != null ? a.lastSyncedAt.toISOString() : null,
    createdAt:      a.createdAt.toISOString(),
    updatedAt:      a.updatedAt.toISOString(),
  }
}

export function serializeTrade(t: RawTrade) {
  return {
    ...t,
    entry:      Number(t.entry),
    stop:       Number(t.stop),
    target:     Number(t.target),
    size:       Number(t.size),
    pnl:        t.pnl        != null ? Number(t.pnl)        : null,
    rMultiple:  t.rMultiple  != null ? Number(t.rMultiple)  : null,
    closePrice: t.closePrice != null ? Number(t.closePrice) : null,
    commission: t.commission != null ? Number(t.commission) : null,
    // Trade-capture v3 (S2) decimals → numbers for the client (#27, #35).
    riskPct:    t.riskPct    != null ? Number(t.riskPct)    : null,
    maeR:       t.maeR       != null ? Number(t.maeR)       : null,
    mfeR:       t.mfeR       != null ? Number(t.mfeR)       : null,
    date:       (t.date as Date).toISOString().slice(0, 10),
    createdAt:  t.createdAt.toISOString(),
    updatedAt:  t.updatedAt.toISOString(),
    account:    t.account ? serializeAccount(t.account) : null,
    setup:      t.setup
      ? {
          ...t.setup,
          createdAt: t.setup.createdAt.toISOString(),
          updatedAt: t.setup.updatedAt.toISOString(),
        }
      : null,
    events: t.events?.map(e => ({
      ...e,
      price:     e.price     != null ? Number(e.price)     : null,
      contracts: e.contracts != null ? Number(e.contracts) : null,
      timestamp: e.timestamp.toISOString(),
    })) ?? [],
  }
}

export type SerializedTrade = ReturnType<typeof serializeTrade>
