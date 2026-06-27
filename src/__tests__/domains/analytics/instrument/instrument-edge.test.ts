import { describe, it, expect } from "vitest"
import { computeInstrumentEdges, type InstrumentTrade } from "@/domains/analytics/instrument/instrument-edge"

const mk = (symbol: string, rs: number[]): InstrumentTrade[] =>
  rs.map((r) => ({ symbol, rMultiple: r, pnl: r * 100 }))

describe("computeInstrumentEdges (#24)", () => {
  it("computes per-symbol edge and net P&L contribution", () => {
    const trades = [...mk("BTCUSD", [1, 1, 1, 1, 1, 1, 1, 1]), ...mk("US30", [-1, -1, -1, -1, -1, -1, -1, -1])]
    const r = computeInstrumentEdges(trades)
    const btc = r.bySymbol.find((s) => s.symbol === "BTCUSD")!
    expect(btc.trades).toBe(8)
    expect(btc.avgR).toBeCloseTo(1, 9)
    expect(btc.winRate).toBeCloseTo(100, 9)
    expect(btc.netPnl).toBeCloseTo(800, 9)
    expect(r.totalNetPnl).toBeCloseTo(0, 9)
  })

  it("flags a significantly negative symbol for pruning", () => {
    const r = computeInstrumentEdges(mk("US30", [-0.9, -1, -1.1, -1, -0.9, -1.1, -1, -1]))
    const us30 = r.bySymbol[0]
    expect(us30.edge).toBe("negative")
    expect(us30.prune).toBe(true)
    expect(us30.pValue).toBeLessThan(0.05)
  })

  it("does NOT flag a noisy symbol whose negative mean is within the noise", () => {
    const r = computeInstrumentEdges(mk("EURUSD", [-3, 3, -3, 3, -3, 3, -2, 1]))
    const eur = r.bySymbol[0]
    expect(eur.edge).toBe("neutral")
    expect(eur.prune).toBe(false)
  })

  it("marks a significantly positive symbol as positive edge", () => {
    const r = computeInstrumentEdges(mk("BTCUSD", [0.9, 1, 1.1, 1, 0.9, 1.1, 1, 1]))
    expect(r.bySymbol[0].edge).toBe("positive")
    expect(r.bySymbol[0].prune).toBe(false)
  })

  it("surfaces worst net P&L first (prune candidates on top)", () => {
    const trades = [...mk("BTCUSD", [1, 1, 1, 1, 1, 1, 1, 1]), ...mk("US30", [-1, -1, -1, -1, -1, -1, -1, -1])]
    expect(computeInstrumentEdges(trades).bySymbol[0].symbol).toBe("US30")
  })

  it("stays neutral below the minimum sample (no fabricated verdict)", () => {
    const r = computeInstrumentEdges(mk("XAUUSD", [-1, -1, -1]))
    expect(r.bySymbol[0].edge).toBe("neutral")
    expect(r.bySymbol[0].prune).toBe(false)
  })
})
