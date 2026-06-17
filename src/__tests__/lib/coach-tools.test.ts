import { describe, it, expect, vi } from "vitest"
import { executeCoachTool, COACH_TOOLS } from "@/lib/ai/coach-tools"

const ctx = (prisma: unknown) => ({ userId: "u1", prisma: prisma as never })

describe("coach tools", () => {
  it("exposes the read-only tool definitions", () => {
    expect(COACH_TOOLS.map(t => t.name)).toEqual([
      "get_account_detail", "get_setup_detail", "search_trades",
      "get_trade_detail", "get_period_stats", "semantic_search",
      "get_learning_resources", "get_study_agenda", "suggest_study", "search_learning_resources",
      "get_recent_notifications",
    ])
  })

  it("get_trade_detail returns full trade incl. events + psychology", async () => {
    const prisma = {
      trade: { findFirst: vi.fn().mockResolvedValue({
        id: "t1", date: new Date("2026-06-01"), symbol: "EURUSD", direction: "LONG",
        entry: 1.1, stop: 1.09, target: 1.12, size: 1, closePrice: 1.12, pnl: 400, rMultiple: 2, commission: -3.5,
        tags: ["A+"], notes: "buena entrada", emotionBefore: "calm", confidenceRating: 4, executionQuality: 5, fomoFlag: false, revengeFlag: false,
        setup: { name: "Breakout" }, account: { name: "FTMO", currency: "USD" },
        events: [{ type: "OPEN", price: 1.1, contracts: 1, notes: "" }],
      }) },
    }
    const out = JSON.parse(await executeCoachTool("get_trade_detail", { id: "t1" }, ctx(prisma)))
    expect(out.symbol).toBe("EURUSD")
    expect(out.setup).toBe("Breakout")
    expect(out.psychology.emotionBefore).toBe("calm")
    expect(out.events).toHaveLength(1)
  })

  it("get_trade_detail returns error when not found", async () => {
    const prisma = { trade: { findFirst: vi.fn().mockResolvedValue(null) } }
    const out = JSON.parse(await executeCoachTool("get_trade_detail", { id: "x" }, ctx(prisma)))
    expect(out.error).toMatch(/No encontré/)
  })

  it("get_account_detail returns computed balance + win rate", async () => {
    const prisma = {
      account: { findFirst: vi.fn().mockResolvedValue({ id: "a1", name: "FTMO", type: "PROP_FIRM", currency: "USD", phase: "FUNDED", status: "ACTIVE", locked: false, lockReason: "", initialBalance: 100000, ddDailyPct: 5, ddTotalPct: 10, targetPct: 8 }) },
      trade:   { findMany: vi.fn().mockResolvedValue([{ pnl: 400 }, { pnl: -100 }, { pnl: 200 }]) },
    }
    const out = JSON.parse(await executeCoachTool("get_account_detail", { name: "ftmo" }, ctx(prisma)))
    expect(out.name).toBe("FTMO")
    expect(out.netPnl).toBe(500)
    expect(out.balance).toBe(100500)
    expect(out.trades).toBe(3)
    expect(out.winRate).toBe(66.7)
  })

  it("get_account_detail returns error when not found", async () => {
    const prisma = { account: { findFirst: vi.fn().mockResolvedValue(null) } }
    const out = JSON.parse(await executeCoachTool("get_account_detail", { name: "zzz" }, ctx(prisma)))
    expect(out.error).toMatch(/No encontré/)
  })

  it("get_setup_detail returns edge vs real + health", async () => {
    const prisma = {
      setup: { findFirst: vi.fn().mockResolvedValue({ id: "s1", name: "Breakout", abbreviation: "BL", market: "Forex", direction: "AMBAS", status: "ACTIVO", expectedWr: 55, expectedAvgR: 1.2 }) },
      trade: { findMany: vi.fn().mockResolvedValue([{ pnl: 100, rMultiple: 2 }, { pnl: -50, rMultiple: -1 }, { pnl: 80, rMultiple: 1 }, { pnl: 90, rMultiple: 1.5 }, { pnl: -40, rMultiple: -0.5 }]) },
    }
    const out = JSON.parse(await executeCoachTool("get_setup_detail", { name: "break" }, ctx(prisma)))
    expect(out.name).toBe("Breakout")
    expect(out.trades).toBe(5)
    expect(out.winRate).toBe(60)
    expect(typeof out.health).toBe("string")
  })

  it("search_trades filters and caps the limit", async () => {
    const findMany = vi.fn().mockResolvedValue([{ date: new Date("2026-06-01"), symbol: "EURUSD", direction: "LONG", pnl: 400, rMultiple: 2, tags: [] }])
    const prisma = { trade: { findMany } }
    const out = JSON.parse(await executeCoachTool("search_trades", { symbol: "EUR", limit: 999 }, ctx(prisma)))
    expect(out.count).toBe(1)
    expect(out.trades[0].symbol).toBe("EURUSD")
    // limit capped at 25
    expect(findMany.mock.calls[0][0].take).toBe(25)
  })

  it("unknown tool returns an error", async () => {
    const out = JSON.parse(await executeCoachTool("nope", {}, ctx({})))
    expect(out.error).toMatch(/desconocida/)
  })
})
