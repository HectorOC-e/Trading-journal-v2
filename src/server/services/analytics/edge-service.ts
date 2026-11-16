import { scopedTradeWhere } from "@/server/services/trades/operational-scope"
import type { OperationalMode } from "@/domains/trading/operational-mode"
// ─────────────────────────────────────────────────────────────────────────────
// Edge service (S11) — prisma orchestration over the pure instrument/tag edge
// analytics (#24/#20). Reads the user's closed trades and computes per-symbol and
// per-tag edge with significance. Read-only; the surfaces (ANALIZAR) land in S12.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { computeInstrumentEdges, type InstrumentEdgeResult } from "@/domains/analytics/instrument/instrument-edge"
import { computeTagEdges, type TagEdgeResult } from "@/domains/analytics/tags/tag-edge"
import { fxFactor, hasFxConversion, parseFxRates } from "@/lib/fx"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))

type FinancialContext = {
  baseCurrency: string
  scope: { mode: OperationalMode; includeArchived: true; excludedCurrencies: string[] }
}

async function loadClosedTrades(prisma: PrismaClient, userId: string, mode: OperationalMode) {
  const where = { ...await scopedTradeWhere(prisma,userId,{mode,includeArchived:true}), status: "CLOSED" }
  const [user, rows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.trade.findMany({ where, select: { symbol: true, tags: true, rMultiple: true, pnl: true, account: { select: { currency: true } } } }),
  ])
  const baseCurrency = (user.baseCurrency ?? "USD").trim().toUpperCase()
  const rates = parseFxRates(user.fxRates)
  const excludedCurrencies = [...new Set(rows.filter(t => !hasFxConversion(t.account.currency.trim().toUpperCase(), baseCurrency, rates)).map(t => t.account.currency.trim().toUpperCase()))].sort()
  const trades = rows.filter(t => hasFxConversion(t.account.currency.trim().toUpperCase(), baseCurrency, rates)).map(t => ({
    symbol: t.symbol, tags: t.tags, rMultiple: num(t.rMultiple),
    pnl: (num(t.pnl) ?? 0) * fxFactor(t.account.currency.trim().toUpperCase(), baseCurrency, rates),
  }))
  return { trades, baseCurrency, scope: { mode, includeArchived: true as const, excludedCurrencies } }
}

export async function getInstrumentEdges(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<InstrumentEdgeResult & FinancialContext> {
  const { trades, ...context } = await loadClosedTrades(prisma, userId, mode)
  return { ...computeInstrumentEdges(trades), ...context }
}

export async function getTagEdges(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<TagEdgeResult & FinancialContext> {
  const { trades, ...context } = await loadClosedTrades(prisma, userId, mode)
  return { ...computeTagEdges(trades), ...context }
}
