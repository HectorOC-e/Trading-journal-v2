// CSV Import — unified entry point for MT4 and cTrader statement parsers
// T-VII-004

import type { ParseResult, ParsedTrade } from "./mt4-parser"

export type { ParseResult, ParsedTrade }
export { parseMt4Statement } from "./mt4-parser"

// ── cTrader key columns ────────────────────────────────────────────────────
// Position ID, Symbol, Direction, Volume, Entry Price, Close Price,
// Gross Profit, Commission, Open time, Close time

const SKIP_DIRECTIONS = new Set(["deposit", "withdrawal", "balance"])

function parseCtraderDate(raw: string): string {
  // cTrader typically exports "2024-03-15 14:30:00" or ISO
  const s = raw.trim()
  // If it already looks like ISO, parse as-is
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z")
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${raw}`)
  return d.toISOString()
}

/** Simple CSV splitter shared with MT4 parser */
function splitCsv(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === "," && !inQuote) {
      result.push(current.replace(/^"|"$/g, "").trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.replace(/^"|"$/g, "").trim())
  return result
}

// cTrader column indices (by header name lookup)
const CTRADER_COLS = {
  positionId: "position id",
  symbol:     "symbol",
  direction:  "direction",
  volume:     "volume",
  entryPrice: "entry price",
  closePrice: "close price",
  grossProfit:"gross profit",
  commission: "commission",
  openTime:   "open time",
  closeTime:  "close time",
} as const

export function parseCtraderStatement(csv: string): ParseResult {
  const rows: ParsedTrade[]  = []
  const warnings: string[]   = []

  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { rows, warnings }

  // Find header row
  let headerIdx = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes("position id") || lines[i].toLowerCase().includes("symbol")) {
      headerIdx = i
      break
    }
  }

  const headerCols = splitCsv(lines[headerIdx]).map(h => h.toLowerCase())

  // Build column index map
  const colIdx: Record<string, number> = {}
  for (const [key, colName] of Object.entries(CTRADER_COLS)) {
    const idx = headerCols.findIndex(h => h.includes(colName))
    if (idx !== -1) colIdx[key] = idx
  }

  const required = ["positionId", "symbol", "direction", "volume", "entryPrice", "closePrice", "openTime", "closeTime"]
  const missing = required.filter(k => colIdx[k] === undefined)
  if (missing.length > 0) {
    warnings.push(`cTrader CSV header missing columns: ${missing.join(", ")}`)
    return { rows, warnings }
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const cols = splitCsv(line)
    const rawDir = cols[colIdx.direction]?.trim().toLowerCase() ?? ""

    if (SKIP_DIRECTIONS.has(rawDir)) continue
    // cTrader uses LONG/SHORT or BUY/SELL
    if (!["long", "buy", "short", "sell"].includes(rawDir)) continue

    try {
      const type: "buy" | "sell" = rawDir === "long" || rawDir === "buy" ? "buy" : "sell"

      const trade: ParsedTrade = {
        ticket:     cols[colIdx.positionId]?.trim() ?? "",
        openTime:   parseCtraderDate(cols[colIdx.openTime] ?? ""),
        type,
        size:       parseFloat(cols[colIdx.volume] ?? "0"),
        symbol:     cols[colIdx.symbol]?.trim() ?? "",
        openPrice:  parseFloat(cols[colIdx.entryPrice] ?? "0"),
        sl:         0,
        tp:         0,
        closeTime:  parseCtraderDate(cols[colIdx.closeTime] ?? ""),
        closePrice: parseFloat(cols[colIdx.closePrice] ?? "0"),
        commission: colIdx.commission !== undefined ? parseFloat(cols[colIdx.commission] ?? "0") || 0 : 0,
        profit:     colIdx.grossProfit !== undefined ? parseFloat(cols[colIdx.grossProfit] ?? "0") || 0 : 0,
      }

      if (
        !trade.ticket ||
        !trade.symbol ||
        isNaN(trade.size) ||
        isNaN(trade.openPrice) ||
        isNaN(trade.closePrice)
      ) {
        warnings.push(`Row ${i + 1}: missing required fields — skipped`)
        continue
      }

      rows.push(trade)
    } catch (err) {
      warnings.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)} — skipped`)
    }
  }

  return { rows, warnings }
}

/** Auto-detect format from first non-empty line of CSV */
export function detectFormat(csv: string): "mt4" | "ctrader" | "unknown" {
  const firstLines = csv.split(/\r?\n/).slice(0, 5).map(l => l.toLowerCase())
  for (const line of firstLines) {
    if (line.includes("ticket") && line.includes("lots")) return "mt4"
    if (line.includes("position id") && line.includes("direction")) return "ctrader"
  }
  return "unknown"
}
