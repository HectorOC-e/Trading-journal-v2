// ─────────────────────────────────────────────────────────────────────────────
// Risk & Prop service (S9) — the prisma orchestration over the pure risk engine
// (domains/analytics/risk). Reads an account's prop config + the trader's R/risk
// history, maps them to engine inputs (deriveRiskInputs), and bundles risk of
// ruin, phase-pass projection and the daily budget. All numbers come from the
// deterministic engine (P2); this layer only fetches and shapes. Read-only —
// S9 surfaces signals/warn; the hard pre-trade block is wired in S13.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { deriveRiskInputs, type AccountRiskConfig } from "@/domains/analytics/risk/inputs"
import { riskOfRuin, type DrawdownModel } from "@/domains/analytics/risk/risk-of-ruin"
import { projectPhasePass } from "@/domains/analytics/risk/prop-projection"
import { computeRiskBudget } from "@/domains/analytics/risk/risk-budget"
import {
  aggregateExposure,
  aggregateFreezeSignal,
  type OpenPosition,
} from "@/domains/analytics/risk/correlation"

const MC_TRIALS = 5_000
const DEFAULT_TRADES_PER_SESSION = 4
const MAX_SESSIONS = 60
const num = (v: { toString(): string } | null | undefined): number | null =>
  v == null ? null : Number(v)

const asDrawdownModel = (m: string | null | undefined): DrawdownModel =>
  m === "TRAILING" ? "TRAILING" : "FIXED"

export interface RiskOverview {
  hasData: boolean
  sampleSize: number
  riskOfRuin: ReturnType<typeof riskOfRuin>
  projection: ReturnType<typeof projectPhasePass>
  budget: ReturnType<typeof computeRiskBudget>
}

/**
 * Full risk picture for one account. `hasData` is false (and the heavy fields
 * null) when there is no closed-trade R history or no total-DD limit to project
 * against — honest emptiness over fabricated rigor (R6).
 */
export async function getRiskOverview(
  prisma: PrismaClient,
  userId: string,
  accountId: string,
): Promise<RiskOverview | null> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: {
      initialBalance: true,
      ddTotalPct: true,
      ddDailyPct: true,
      targetPct: true,
      ddModel: true,
      minTradingDays: true,
      maxTradesPerDay: true,
    },
  })
  if (!account) return null

  const trades = await prisma.trade.findMany({
    where: { userId, accountId, status: "CLOSED" },
    orderBy: [{ date: "asc" }, { closeTime: "asc" }, { createdAt: "asc" }],
    select: { pnl: true, rMultiple: true, riskPct: true, date: true },
  })

  const rMultiples = trades.map((t) => num(t.rMultiple)).filter((n): n is number => n != null)
  const riskPcts = trades.map((t) => num(t.riskPct)).filter((n): n is number => n != null)

  const cfg: AccountRiskConfig = {
    initialBalance: Number(account.initialBalance),
    ddTotalPct: num(account.ddTotalPct),
    ddDailyPct: num(account.ddDailyPct),
    targetPct: num(account.targetPct),
    ddModel: asDrawdownModel(account.ddModel),
  }
  const inputs = deriveRiskInputs(cfg, rMultiples, riskPcts)

  // Daily budget: realized P&L of the latest trading date vs that day's opening
  // equity (a tz-free proxy for "today" suitable for a read surface).
  const budget = computeRiskBudget({
    ddDailyPct: inputs.ddDailyPct,
    realizedPnlPct: realizedPnlPctLatestDay(trades, cfg.initialBalance),
    usualRiskPerTradePct: inputs.riskPerTradePct,
  })

  if (rMultiples.length === 0 || inputs.ruinThresholdPct === null) {
    return {
      hasData: false,
      sampleSize: rMultiples.length,
      riskOfRuin: null,
      projection: null,
      budget,
    }
  }

  const tradesPerSession = account.maxTradesPerDay ?? DEFAULT_TRADES_PER_SESSION
  const horizon = MAX_SESSIONS * tradesPerSession

  const ruin = riskOfRuin({
    rMultiples,
    riskPerTradePct: inputs.riskPerTradePct,
    ruinThresholdPct: inputs.ruinThresholdPct,
    horizon,
    ddModel: inputs.ddModel,
    trials: MC_TRIALS,
  })

  // A null/zero target means there is no phase to pass (e.g. an already-funded
  // account) — projecting it would trivially "pass" at session 1, so skip it.
  const projection =
    inputs.targetPct !== null && inputs.targetPct > 0
      ? projectPhasePass({
          rMultiples,
          riskPerTradePct: inputs.riskPerTradePct,
          targetPct: inputs.targetPct,
          ddTotalPct: inputs.ruinThresholdPct,
          ddDailyPct: inputs.ddDailyPct,
          ddModel: inputs.ddModel,
          tradesPerSession,
          maxSessions: MAX_SESSIONS,
          minTradingDays: account.minTradingDays,
          trials: MC_TRIALS,
        })
      : null

  return { hasData: true, sampleSize: rMultiples.length, riskOfRuin: ruin, projection, budget }
}

function realizedPnlPctLatestDay(
  trades: { pnl: { toString(): string } | null; date: Date }[],
  initialBalance: number,
): number {
  if (trades.length === 0 || initialBalance <= 0) return 0
  const key = (d: Date) => d.toISOString().slice(0, 10)
  const latest = key(trades[trades.length - 1].date)
  let today = 0
  let prior = 0
  for (const t of trades) {
    const p = num(t.pnl) ?? 0
    if (key(t.date) === latest) today += p
    else prior += p
  }
  const dayStartEquity = initialBalance + prior
  return dayStartEquity > 0 ? today / dayStartEquity : 0
}

export interface ExposureOverview {
  exposure: ReturnType<typeof aggregateExposure>
  freeze: ReturnType<typeof aggregateFreezeSignal>
}

/**
 * Aggregate open-position exposure by symbol across all of the user's accounts —
 * the real, summed risk (#39). `aggregateCapAmount` (a future per-user setting)
 * drives the freeze signal; null keeps it inert.
 */
export async function getAggregateExposure(
  prisma: PrismaClient,
  userId: string,
  aggregateCapAmount: number | null = null,
): Promise<ExposureOverview> {
  const [open, accounts] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, status: "OPEN" },
      select: { accountId: true, symbol: true, riskPct: true, direction: true },
    }),
    prisma.account.findMany({ where: { userId }, select: { id: true, initialBalance: true } }),
  ])

  const balanceById = new Map(accounts.map((a) => [a.id, Number(a.initialBalance)]))

  const positions: OpenPosition[] = open.map((t) => {
    const riskPct = num(t.riskPct) ?? 0
    const balance = balanceById.get(t.accountId) ?? 0
    return {
      accountId: t.accountId,
      symbol: t.symbol,
      riskAmount: (riskPct / 100) * balance,
      direction: t.direction === "SHORT" ? "SHORT" : "LONG",
    }
  })

  const exposure = aggregateExposure(positions)
  const freeze = aggregateFreezeSignal({ totalGrossRiskAmount: exposure.totalGrossRiskAmount, aggregateCapAmount })
  return { exposure, freeze }
}
