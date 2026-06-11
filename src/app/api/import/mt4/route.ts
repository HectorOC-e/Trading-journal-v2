import { NextRequest, NextResponse } from "next/server"
import { parseMt4Statement, parseCtraderStatement, detectFormat } from "@/domains/trading/services/csv-import"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { calcRMultiple } from "@/lib/formulas"
import type { ParsedTrade } from "@/domains/trading/services/csv-import"

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a dedup key in the SAME shape for both parsed rows and stored trades.
 * Stored trades keep `date` (YYYY-MM-DD) + `openTime` ("HH:MM") separately, so the
 * parsed full-ISO openTime must be reduced to date + HH:MM to ever match (bug fix:
 * the old key compared full ISO against "HH:MM" and never matched).
 */
function dupKey(symbol: string, isoOpenTime: string, size: number): string {
  const d = new Date(isoOpenTime)
  const dateStr = isNaN(d.getTime()) ? isoOpenTime : d.toISOString().slice(0, 10)
  const hhmm    = isNaN(d.getTime()) ? "" : d.toISOString().slice(11, 16)
  return `${symbol}|${dateStr}|${hhmm}|${size}`
}

/** Same key shape, built from a stored trade's separate date + "HH:MM" fields. */
function storedKey(symbol: string, date: Date | string, openTime: string, size: number): string {
  const dateStr = new Date(date).toISOString().slice(0, 10)
  return `${symbol}|${dateStr}|${openTime}|${size}`
}

/** Convert ParsedTrade direction to DB direction */
function toDirection(type: "buy" | "sell"): "LONG" | "SHORT" {
  return type === "buy" ? "LONG" : "SHORT"
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = user.id

  // 2. Parse multipart form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file      = formData.get("file")
  const accountId = formData.get("accountId")
  const confirm   = formData.get("confirm")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 })
  }
  if (!accountId || typeof accountId !== "string") {
    return NextResponse.json({ error: "Missing accountId field" }, { status: 400 })
  }

  // 3. Verify account belongs to user
  const account = await prisma.account.findUnique({
    where: { id: accountId, userId },
    select: { id: true, locked: true, lockReason: true },
  })
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }
  // HALLAZGO 1B — a locked account cannot import new trades
  if (account.locked) {
    return NextResponse.json(
      { error: "ACCOUNT_LOCKED", reason: account.lockReason || "MANUAL" },
      { status: 403 },
    )
  }

  // 4. Read file text and detect format
  const csvText = await file.text()
  const format  = detectFormat(csvText)

  let parseResult
  if (format === "mt4") {
    parseResult = parseMt4Statement(csvText)
  } else if (format === "ctrader") {
    parseResult = parseCtraderStatement(csvText)
  } else {
    // Try MT4 as default fallback
    parseResult = parseMt4Statement(csvText)
  }

  const { rows, warnings } = parseResult
  const detectedFormat = format === "unknown" ? "mt4" : format

  // 5. Duplicate detection — find existing trades for this account
  // For cTrader: check by importTicket (Position ID) for exact match.
  // Fallback for MT4 and missing tickets: check by (symbol, openTime, size).
  const existingTrades = await prisma.trade.findMany({
    where:  { accountId, userId },
    select: { symbol: true, date: true, openTime: true, size: true, importTicket: true },
  })

  type ExistingTrade = {
    symbol: string
    date: Date | string
    openTime: string
    size: { toNumber?: () => number } | number | string
    importTicket: string | null
  }
  const existingTickets = new Set(
    (existingTrades as ExistingTrade[])
      .map(t => t.importTicket)
      .filter((t): t is string => !!t)
  )
  const existingKeys = new Set(
    (existingTrades as ExistingTrade[]).map(t => {
      const sizeNum = typeof t.size === "object" && t.size !== null && typeof (t.size as { toNumber?: () => number }).toNumber === "function"
        ? (t.size as { toNumber: () => number }).toNumber()
        : Number(t.size)
      return storedKey(t.symbol, t.date, t.openTime ?? "", sizeNum)
    })
  )

  const toCreate: ParsedTrade[] = []
  let skipped = 0
  // Also dedup within the same file (a statement that lists the same fill twice).
  const seenInBatch = new Set<string>()
  for (const row of rows) {
    const key = dupKey(row.symbol, row.openTime, row.size)
    const isDup = (row.ticket && existingTickets.has(row.ticket)) ||
                  existingKeys.has(key) ||
                  seenInBatch.has(row.ticket ? `t:${row.ticket}` : key)
    if (isDup) {
      skipped++
    } else {
      seenInBatch.add(row.ticket ? `t:${row.ticket}` : key)
      toCreate.push(row)
    }
  }

  // 6. Dry run: return preview without committing
  if (confirm !== "true") {
    return NextResponse.json({
      format: detectedFormat,
      toCreate,
      skipped,
      warnings,
    })
  }

  // 7. Confirmed import: create trades + TradeEvents in a transaction
  let created = 0
  for (const row of toCreate) {
    try {
      await prisma.$transaction(async (tx) => {
        // Parse the openTime as a Date for the trade `date` field
        const openDate = new Date(row.openTime)
        const dateStr  = openDate.toISOString().slice(0, 10)
        const openTimeStr = openDate.toISOString().slice(11, 16) // "HH:MM"

        const direction = toDirection(row.type)
        // sl=0 is the parser sentinel for "no stop loss recorded" in both MT4 and cTrader exports
        const rMultiple = (row.sl != null && row.sl !== 0 && row.openPrice != null && row.closePrice != null)
          ? calcRMultiple(direction, row.openPrice, row.sl, row.closePrice)
          : null

        const trade = await tx.trade.create({
          data: {
            userId,
            accountId,
            direction,
            symbol:      row.symbol,
            entry:       row.openPrice,
            stop:        row.sl,
            target:      row.tp,
            size:        row.size,
            date:        openDate,
            openTime:    openTimeStr,
            session:      "New York", // default session for imports
            status:       "CLOSED",
            closePrice:   row.closePrice,
            closeTime:    new Date(row.closeTime).toISOString().slice(11, 16),
            commission:   row.commission,
            pnl:          row.profit,
            rMultiple,
            importTicket: row.ticket || null,
          },
        })

        // Create OPEN event
        await tx.tradeEvent.create({
          data: {
            userId,
            tradeId:   trade.id,
            type:      "OPEN",
            price:     row.openPrice,
            contracts: row.size,
            notes:     `Importado desde ${detectedFormat.toUpperCase()} (ticket: ${row.ticket})`,
            timestamp: new Date(row.openTime),
          },
        })

        // Create CLOSE event
        await tx.tradeEvent.create({
          data: {
            userId,
            tradeId:   trade.id,
            type:      "CLOSE",
            price:     row.closePrice,
            contracts: row.size,
            notes:     `Cierre importado. Comisión: ${row.commission}. P&L: ${row.profit}`,
            timestamp: new Date(row.closeTime),
          },
        })
      })
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(`Trade ${row.ticket}: error al crear — ${msg}`)
    }
  }

  return NextResponse.json({ format: detectedFormat, created, skipped, warnings })
}
