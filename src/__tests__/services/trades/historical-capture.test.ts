import { describe, expect, it } from "vitest"
import { realizedRows } from "@/domains/trading/services/realized-history"
import { marketTimestamp, validateMarketSequence, emotionProvenance } from "@/domains/trading/historical-capture"
import { historicalEquityAt, periodEquityBalances } from "@/server/services/trades/historical-equity-service"

describe("historical realizations", () => {
  it("retains the trade's market timezone after the account's timezone changes", () => {
    const rows = realizedRows([{accountId:"a",date:new Date("2024-01-01"),status:"CLOSED",pnl:30,marketTimeZone:"America/Tegucigalpa",marketClosedAt:new Date("2024-01-02T07:00Z"),events:[{realizedPnl:30,timestamp:new Date("2024-01-02T02:00Z")}]}],new Map([["a","UTC"]]))
    expect(rows.find(row=>row.pnl===30)?.date.toISOString().slice(0,10)).toBe("2024-01-01")
  })
  it("realizes the final remainder on the explicit market close, once", () => {
    const rows = realizedRows([{
      accountId: "account", pnl: 100, status: "CLOSED", date: new Date("2024-01-31T00:00:00Z"),
      marketClosedAt: new Date("2024-02-02T07:00:00Z"),
      events: [{ realizedPnl: 30, timestamp: new Date("2024-02-01T07:00:00Z") }],
    }], new Map([["account", "America/Tegucigalpa"]]))
    expect(rows.map(row => [row.date.toISOString().slice(0, 10), row.pnl])).toEqual([
      ["2024-02-02", 70], ["2024-02-01", 30],
    ])
    expect(rows.reduce((sum, row) => sum + row.pnl, 0)).toBe(100)
  })
})

describe("market clock and emotion provenance", () => {
  it("converts Honduras market time without depending on server timezone", () => {
    expect(marketTimestamp("2024-01-02", "01:00", "America/Tegucigalpa").toISOString()).toBe("2024-01-02T07:00:00.000Z")
  })
  it("handles month crossing and rejects nonexistent or ambiguous DST times", () => {
    expect(marketTimestamp("2024-03-31", "23:30", "America/Tegucigalpa").toISOString()).toBe("2024-04-01T05:30:00.000Z")
    expect(() => marketTimestamp("2024-03-10", "02:30", "America/New_York")).toThrow("INVALID_MARKET_TIME")
    expect(() => marketTimestamp("2024-11-03", "01:30", "America/New_York")).toThrow("AMBIGUOUS_MARKET_TIME")
  })
  it("rejects partials outside the market opening and closing", () => {
    expect(() => validateMarketSequence(new Date("2024-01-02T07:00Z"), new Date("2024-01-03T07:00Z"), [new Date("2024-01-02T06:59Z")])).toThrow("INVALID_MARKET_SEQUENCE")
  })
  it("does not call a remembered market emotion current merely because saved today", () => {
    const now = new Date("2026-11-16T12:00Z")
    expect(emotionProvenance({ referenceAt: new Date("2024-01-02T07:00Z"), context: "MARKET", mode: "BACKTEST", now }).emotionSource).toBe("reconstructed")
    expect(emotionProvenance({ referenceAt: new Date("2026-11-16T10:00Z"), context: "PRACTICE", mode: "BACKTEST", now }).emotionSource).toBe("captured")
    expect(() => emotionProvenance({ referenceAt: new Date("2026-11-16T10:00Z"), context: "PRACTICE", mode: "REAL", now })).toThrow("INVALID_EMOTION_CONTEXT")
  })
})

describe("capital at market time", () => {
  const before = new Date("2024-01-02T07:00Z")
  it("ignores future gains and cash and returns unknown for unverifiable history", () => {
    const result = historicalEquityAt(1000, before, [
      { pnl: 9000, timestamp: new Date("2025-01-01T07:00Z") },
    ], [{ amount: 5000, timestamp: new Date("2025-01-01T00:00Z") }])
    expect(result).toBe(1000)
    expect(10 / result! * 100).toBe(1)
    expect(historicalEquityAt(0, before, [], [])).toBeNull()
    expect(historicalEquityAt(1000, before, [{ pnl: 100, timestamp: null }], [])).toBeNull()
  })
  it("carries realized equity into the start of a selected period", () => {
    expect(periodEquityBalances([{ id: "a", initialBalance: 1000 }], [
      { accountId: "a", date: "2023-12-31", pnl: 9000 },
      { accountId: "a", date: "2024-01-02", pnl: 100 },
    ], "2024-01-01")).toEqual([{ id: "a", initialBalance: 10000 }])
  })
})
