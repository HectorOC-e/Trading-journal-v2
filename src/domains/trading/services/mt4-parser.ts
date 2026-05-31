// MT4 CSV Statement Parser
// Columns (0-indexed): Ticket, Open Time, Type, Lots, Symbol, Open Price, S/L, T/P,
//                      Close Time, Close Price, Commission, Swap, Profit

export type ParsedTrade = {
  ticket:     string   // idempotency key
  openTime:   string   // ISO string
  type:       "buy" | "sell"
  size:       number
  symbol:     string
  openPrice:  number
  sl:         number
  tp:         number
  closeTime:  string   // ISO string
  closePrice: number
  commission: number
  profit:     number
}

export type ParseResult = {
  rows:     ParsedTrade[]
  warnings: string[]
}

/** Parse "YYYY.MM.DD HH:MM:SS" → ISO-8601 string */
function parseMt4Date(raw: string): string {
  // "2024.03.15 14:30:00" → "2024-03-15T14:30:00.000Z"
  const clean = raw.trim().replace(/\./g, "-").replace(" ", "T")
  const d = new Date(clean + (clean.includes("Z") ? "" : "Z"))
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${raw}`)
  return d.toISOString()
}

const SKIP_TYPES = new Set(["balance", "deposit", "withdrawal", "credit"])

export function parseMt4Statement(csv: string): ParseResult {
  const rows: ParsedTrade[]  = []
  const warnings: string[]   = []

  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  // Find header row — skip until we see a line that looks like column headers
  // Skip the very first line (report header / export info)
  let dataStart = 1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.startsWith("ticket") || lower.includes("open time")) {
      dataStart = i + 1
      break
    }
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Split CSV — handle quoted fields
    const cols = splitCsv(line)
    if (cols.length < 13) continue

    const rawType = cols[2].trim().toLowerCase()
    if (SKIP_TYPES.has(rawType)) continue

    // Only process buy/sell rows
    if (rawType !== "buy" && rawType !== "sell") continue

    try {
      const trade: ParsedTrade = {
        ticket:     cols[0].trim(),
        openTime:   parseMt4Date(cols[1]),
        type:       rawType as "buy" | "sell",
        size:       parseFloat(cols[3]),
        symbol:     cols[4].trim(),
        openPrice:  parseFloat(cols[5]),
        sl:         parseFloat(cols[6]) || 0,
        tp:         parseFloat(cols[7]) || 0,
        closeTime:  parseMt4Date(cols[8]),
        closePrice: parseFloat(cols[9]),
        commission: parseFloat(cols[10]) || 0,
        profit:     parseFloat(cols[12]),
      }

      if (
        !trade.ticket ||
        !trade.symbol ||
        isNaN(trade.size) ||
        isNaN(trade.openPrice) ||
        isNaN(trade.closePrice) ||
        isNaN(trade.profit)
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

/** Simple CSV splitter — handles quoted fields containing commas */
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
