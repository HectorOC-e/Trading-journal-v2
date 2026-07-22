/**
 * `buildContext` percentage fields — first direct coverage.
 *
 * Same defect as #152, in a second place. `riskPct`, `dayPnlPct` and `weekPnlPct`
 * all divided by `account.initialBalance` and fell back to a literal 0 when it was
 * not positive. On every account whose initial balance was never set (0 — 3 of 5
 * in production) the three fields were a CONSTANT ZERO, so any rule conditioned on
 * them could never fire: a "block trades risking more than 2%" rule silently
 * evaluated 0 % forever and protected nothing.
 *
 * The denominator is now equity (initial balance + realised P&L) — the same basis
 * `createTrade` uses after #152, and the value the drawdown walk in this function
 * already computes.
 */
import { describe, it, expect, vi } from "vitest"
import { buildContext } from "@/domains/rules/context"
import type { PrismaClient } from "@/lib/generated/prisma/client"

const USER = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const ACCOUNT = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"

/** entry−stop = 100, size 1 → 100 at risk. */
const TRADE = {
  symbol: "NQ", direction: "LONG", session: "New York", setupId: null,
  size: 1, entry: 21500, stop: 21400, tags: [], date: "2026-07-20",
}

function prismaWith(closed: { pnl: number; date: string }[]) {
  return {
    trade: {
      findMany: vi.fn().mockResolvedValue(
        closed.map((c) => ({ pnl: c.pnl, date: new Date(`${c.date}T00:00:00Z`), createdAt: new Date(`${c.date}T12:00:00Z`) })),
      ),
    },
  } as unknown as PrismaClient
}

describe("buildContext — percentage fields on a zero initial balance", () => {
  it("derives riskPct from equity instead of collapsing to 0 (the prod bug)", async () => {
    // initialBalance 0, +2000 realizado → equity 2000. 100 / 2000 = 5 %.
    const ctx = await buildContext(prismaWith([{ pnl: 2000, date: "2026-07-15" }]), USER,
      { id: ACCOUNT, initialBalance: 0 }, TRADE)
    expect(ctx.riskPct).toBeCloseTo(5, 5)
  })

  it("derives dayPnlPct and weekPnlPct from equity too", async () => {
    // Mismo día que el trade → equity 0 + 500 = 500; dayPnl 500 → 100 %.
    const ctx = await buildContext(prismaWith([{ pnl: 500, date: "2026-07-20" }]), USER,
      { id: ACCOUNT, initialBalance: 0 }, TRADE)
    expect(ctx.dayPnlPct).toBeCloseTo(100, 5)
    expect(ctx.weekPnlPct).toBeCloseTo(100, 5)
  })

  it("still divides by equity on a funded account (no closed trades)", async () => {
    // 100 / 10000 = 1 %.
    const ctx = await buildContext(prismaWith([]), USER,
      { id: ACCOUNT, initialBalance: 10000 }, TRADE)
    expect(ctx.riskPct).toBeCloseTo(1, 5)
  })

  it("counts realised losses in the denominator", async () => {
    // 10000 − 5000 = 5000 equity → 100 / 5000 = 2 %.
    const ctx = await buildContext(prismaWith([{ pnl: -5000, date: "2026-07-15" }]), USER,
      { id: ACCOUNT, initialBalance: 10000 }, TRADE)
    expect(ctx.riskPct).toBeCloseTo(2, 5)
  })

  it("stays at 0 when equity is genuinely zero (nothing to divide by)", async () => {
    const ctx = await buildContext(prismaWith([]), USER,
      { id: ACCOUNT, initialBalance: 0 }, TRADE)
    expect(ctx.riskPct).toBe(0)
    expect(ctx.dayPnlPct).toBe(0)
  })

  it("leaves the drawdown walk anchored on the initial balance", async () => {
    // Equity path 10000 → 12000 → 9000: pico 12000, valle 9000 → 25 % de drawdown.
    const ctx = await buildContext(
      prismaWith([{ pnl: 2000, date: "2026-07-14" }, { pnl: -3000, date: "2026-07-15" }]),
      USER, { id: ACCOUNT, initialBalance: 10000 }, TRADE)
    expect(ctx.drawdownPct).toBeCloseTo(25, 5)
  })
})
