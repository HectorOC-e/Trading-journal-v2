import { describe, it, expect } from "vitest"
import {
  parseMt4Statement,
  parseCtraderStatement,
  detectFormat,
} from "@/domains/trading/services/csv-import"

// ── MT4 ──────────────────────────────────────────────────────────────────────

const MT4_CSV = [
  "Statement for account 12345 — MetaTrader 4",
  "Ticket,Open Time,Type,Lots,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit",
  "1001,2024.03.15 14:30:00,buy,1.00,EURUSD,1.08500,1.08000,1.09000,2024.03.15 16:00:00,1.08900,-7.00,0.00,400.00",
  "1002,2024.03.16 09:15:00,sell,0.50,GBPUSD,1.27000,1.27500,1.26000,2024.03.16 11:30:00,1.26500,-3.50,0.00,250.00",
  // non-trade ledger rows must be skipped
  "1003,2024.03.17 00:00:00,balance,0,,0,0,0,,0,0,0,1000.00",
  "1004,2024.03.17 00:00:00,deposit,0,,0,0,0,,0,0,0,500.00",
].join("\n")

describe("parseMt4Statement", () => {
  it("parses buy/sell rows with correct fields and P&L", () => {
    const { rows, warnings } = parseMt4Statement(MT4_CSV)
    expect(rows).toHaveLength(2)
    expect(warnings).toHaveLength(0)

    const [a, b] = rows
    expect(a.ticket).toBe("1001")
    expect(a.type).toBe("buy")
    expect(a.symbol).toBe("EURUSD")
    expect(a.size).toBe(1)
    expect(a.openPrice).toBe(1.085)
    expect(a.closePrice).toBe(1.089)
    expect(a.commission).toBe(-7)
    expect(a.profit).toBe(400) // broker P&L from the Profit column
    expect(a.openTime).toBe("2024-03-15T14:30:00.000Z")

    expect(b.type).toBe("sell")
    expect(b.profit).toBe(250)
  })

  it("skips balance/deposit/withdrawal/credit ledger rows", () => {
    const { rows } = parseMt4Statement(MT4_CSV)
    expect(rows.every(r => r.symbol !== "")).toBe(true)
    expect(rows.map(r => r.ticket)).toEqual(["1001", "1002"])
  })

  it("warns and skips rows with missing required fields", () => {
    const csv = [
      "Ticket,Open Time,Type,Lots,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit",
      "2001,2024.03.15 14:30:00,buy,1.00,,1.08500,0,0,2024.03.15 16:00:00,1.08900,0,0,xx", // empty symbol + bad profit
    ].join("\n")
    const { rows, warnings } = parseMt4Statement(csv)
    expect(rows).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
  })
})

// ── cTrader ──────────────────────────────────────────────────────────────────

const CTRADER_CSV = [
  "Position ID,Symbol,Direction,Volume,Entry Price,Close Price,Gross Profit,Commission,Open time,Close time",
  "9001,EURUSD,LONG,10000,1.08500,1.08900,400.00,-7.00,2024-03-15 14:30:00,2024-03-15 16:00:00",
  "9002,GBPUSD,SHORT,5000,1.27000,1.26500,250.00,-3.50,2024-03-16 09:15:00,2024-03-16 11:30:00",
  "9003,,DEPOSIT,0,0,0,0,0,2024-03-17 00:00:00,2024-03-17 00:00:00",
].join("\n")

describe("parseCtraderStatement", () => {
  it("maps LONG/SHORT to buy/sell and reads gross profit", () => {
    const { rows } = parseCtraderStatement(CTRADER_CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe("buy")
    expect(rows[0].ticket).toBe("9001")
    expect(rows[0].profit).toBe(400)
    expect(rows[1].type).toBe("sell")
  })

  it("returns a warning when required columns are missing", () => {
    const csv = "Symbol,Direction,Volume\nEURUSD,LONG,10000"
    const { rows, warnings } = parseCtraderStatement(csv)
    expect(rows).toHaveLength(0)
    expect(warnings.join(" ")).toMatch(/missing columns/i)
  })
})

// ── format detection ─────────────────────────────────────────────────────────

describe("detectFormat", () => {
  it("detects MT4 by Ticket+Lots header", () => {
    expect(detectFormat(MT4_CSV)).toBe("mt4")
  })
  it("detects cTrader by Position ID+Direction header", () => {
    expect(detectFormat(CTRADER_CSV)).toBe("ctrader")
  })
  it("returns unknown for unrecognized CSV", () => {
    expect(detectFormat("a,b,c\n1,2,3")).toBe("unknown")
  })
})
