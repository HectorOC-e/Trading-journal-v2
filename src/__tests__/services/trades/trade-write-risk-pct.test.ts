/**
 * riskPct server-side fallback (#27, S2 DT-1) — first direct coverage of
 * `createTrade`, which had none.
 *
 * The fallback promised that "the column is never silently null", but derived
 * risk against `account.initialBalance` alone. On any account whose initial
 * balance was never set (0 — 3 of 5 in production), `deriveRiskPct` returns
 * null by contract, so `risk_pct` landed null: 53 of 53 trades in prod.
 *
 * That is not cosmetic. `verifyOversizedTrades` filters on `riskPct != null`,
 * so a null column makes it report zero offenders forever — a commitment to
 * stop oversizing verifies as PERFECT COMPLIANCE no matter how the user trades,
 * manufacturing false positive reinforcement.
 *
 * Risk is therefore derived against account EQUITY (initial balance + realised
 * P&L), the same basis the daily-budget guard in this file already uses.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/domains/trading/services/risk-enforcement", () => ({
  assertTradeable: vi.fn().mockResolvedValue(undefined),
  evaluateAndLock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/domains/rules/engine", () => ({
  runRules: vi.fn().mockResolvedValue({ blocked: false, blockMessage: null, addTags: [], removeTags: [] }),
}))
vi.mock("@/domains/rules/context", () => ({ buildContext: vi.fn().mockResolvedValue({}) }))
vi.mock("@/server/services/tags/seed", () => ({ ensureTagRows: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/server/services/behavior/commitment-service", () => ({
  evaluateRuledCommitmentsOnTrade: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/server/services/intervention/intervention-service", () => ({
  runIntervention: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/domains/analytics/services/analytics-cache", () => ({
  isCacheEnabled: vi.fn().mockReturnValue(false),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/server/services/trades/serializers", () => ({ serializeTrade: (t: unknown) => t }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: vi.fn() }))

import { createTrade } from "@/server/services/trades/trade-write-service"
import type { PrismaClient } from "@/lib/generated/prisma/client"

const USER = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const ACCOUNT = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"

/** entry−stop = 70, size 0.02 → 1.40 at risk. */
const INPUT = {
  accountId: ACCOUNT, symbol: "NQ", direction: "LONG", date: "2026-07-20",
  openTime: "09:35", entry: 21450, stop: 21380, target: 21590, size: 0.02,
  status: "OPEN", tags: [] as string[],
}

function mockPrisma(opts: { initialBalance: number; closedPnl: number; pointValue?: string | null }) {
  const created = { id: "t-1", accountId: ACCOUNT, symbol: "NQ", direction: "LONG",
    session: null, setupId: null, size: 0.02, entry: 21450, stop: 21380,
    status: "OPEN", tags: [] as string[], pnl: null, rMultiple: null }
  return {
    account: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        type: "PERSONAL", locked: false, lockReason: "", ddDailyPct: null,
        ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null, ddModel: null,
        maxTradesPerDay: null, allowedSymbols: [], enforceMode: "OFF",
        initialBalance: opts.initialBalance,
      }),
    },
    setup: { findUnique: vi.fn() },
    trade: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { pnl: opts.closedPnl } }),
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue(created),
      count: vi.fn().mockResolvedValue(0),
      findUniqueOrThrow: vi.fn().mockResolvedValue(created),
    },
    tradeEvent: { create: vi.fn().mockResolvedValue({}) },
    // Symbol not in the catalog → pointValue 1 (price-difference instrument).
    market: { findFirst: vi.fn().mockResolvedValue(opts.pointValue ? { pointValue: opts.pointValue } : null) },
  } as unknown as PrismaClient
}

const riskPctPassedTo = (prisma: PrismaClient) =>
  (prisma.trade.create as unknown as { mock: { calls: [{ data: { riskPct: number | null } }][] } })
    .mock.calls[0][0].data.riskPct

describe("createTrade — riskPct fallback", () => {
  beforeEach(() => vi.clearAllMocks())

  it("derives riskPct from equity when the account has no initial balance (the prod bug)", async () => {
    // Cuenta Sana: initialBalance 0, +2115 realised → equity 2115.
    // 1.40 / 2115 * 100 = 0.0662 → 0.07
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2115 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.07, 2)
  })

  it("still derives correctly on a funded account with no closed trades", async () => {
    // 1.40 / 10000 * 100 = 0.014 → 0.01
    const prisma = mockPrisma({ initialBalance: 10000, closedPnl: 0 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.01, 2)
  })

  it("counts realised losses against equity, not just the initial balance", async () => {
    // 10000 − 5000 = 5000 equity → 1.40 / 5000 * 100 = 0.028 → 0.03
    const prisma = mockPrisma({ initialBalance: 10000, closedPnl: -5000 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(0.03, 2)
  })

  it("honours a client-sent riskPct without querying for equity", async () => {
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2115 })
    await createTrade(prisma, USER, { ...INPUT, riskPct: 1.5 } as never)
    expect(riskPctPassedTo(prisma)).toBe(1.5)
    expect(prisma.trade.aggregate).not.toHaveBeenCalled()
  })

  it("applies the instrument's point value — a 70pt NQ stop risks $28, not $1.40", async () => {
    // Cuenta Sana reproducida: equity 2150, NQ a $20/pt, 70 pts, 0.02 contratos.
    // Riesgo real 70 × 0.02 × 20 = $28 → 1.30 %. Sin pointValue salía 0.07 %,
    // veinte veces menos, y el umbral de oversizing (1.5 %) quedaba inalcanzable.
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 2150, pointValue: "$20" })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeCloseTo(1.3, 2)
  })

  it("leaves riskPct null when equity is genuinely zero (nothing to divide by)", async () => {
    const prisma = mockPrisma({ initialBalance: 0, closedPnl: 0 })
    await createTrade(prisma, USER, { ...INPUT } as never)
    expect(riskPctPassedTo(prisma)).toBeNull()
  })
})
